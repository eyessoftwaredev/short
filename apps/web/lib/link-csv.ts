import { destinationSchema, linkInputSchema, slugSchema } from "@short/core";
import { desc, domains, eq, folders, getDb, links } from "@short/db";
import { putLinkRecords } from "./kv";
import { createLink, toKvRecord, type LinkWithDomain } from "./links";
import { applyLinkDefaults, getLinkDefaults } from "./workspace-settings";

/** Rows a single import may create; each row is one insert, so this bounds the request. */
export const CSV_IMPORT_MAX_ROWS = 1_000;
/** Upper bound for one export so a huge workspace cannot exhaust the panel's memory. */
const CSV_EXPORT_MAX_ROWS = 50_000;

const HEADER = ["slug", "destination", "title", "tags", "folder", "open_mode", "max_clicks"] as const;

export function linksToCsv(rows: LinkWithDomain[]): string {
  const lines = [
    HEADER.join(","),
    ...rows.map((row) =>
      [
        csvCell(row.slug),
        csvCell(row.destination),
        csvCell(row.title ?? ""),
        csvCell(row.tags.join("|")),
        csvCell(row.folderId ?? ""),
        csvCell(row.openMode),
        csvCell(row.maxClicks == null ? "" : String(row.maxClicks)),
      ].join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function csvCell(raw: string): string {
  // Spreadsheet apps evaluate cells starting with = + - @ (or a tab/CR) as formulas;
  // a leading apostrophe keeps a hostile title or destination inert when opened.
  const value = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Undoes the export's formula guard, so a title like "-50% sale" survives an
 * export/import round trip instead of coming back as "'-50% sale".
 */
function unguardCell(raw: string): string {
  return /^'[=+\-@\t\r]/.test(raw) ? raw.slice(1) : raw;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      current.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      current.push(cell);
      if (current.some((entry) => entry.trim() !== "")) {
        rows.push(current);
      }
      current = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  current.push(cell);
  if (current.some((entry) => entry.trim() !== "")) {
    rows.push(current);
  }
  return rows;
}

export type CsvImportResult = { created: number; skipped: number; errors: string[] };

export type CsvImportOptions = {
  workspaceId: string;
  domainId: string;
  creatorId: string | null;
  /** Links the plan still allows; `null` means unlimited. */
  remaining: number | null;
  /** Throws when the plan does not allow this custom slug (e.g. short vanity slugs). */
  checkSlug?: (slug: string) => void;
  /** Runs once per created link, e.g. usage counters and abuse scanning. */
  afterCreate?: (link: LinkWithDomain) => Promise<void>;
};

export async function importLinksCsv(
  options: CsvImportOptions,
  text: string,
): Promise<CsvImportResult> {
  const { workspaceId, domainId, creatorId, remaining, checkSlug, afterCreate } = options;
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length === 0) {
    return { created: 0, skipped: 0, errors: ["empty"] };
  }
  if (rows.length - 1 > CSV_IMPORT_MAX_ROWS) {
    return { created: 0, skipped: 0, errors: [`too_many_rows (max ${CSV_IMPORT_MAX_ROWS})`] };
  }

  const header = rows[0]?.map((cell) => cell.trim().toLowerCase()) ?? [];
  const index = (name: string) => header.indexOf(name);
  const slugIdx = index("slug");
  const destIdx = index("destination");
  const titleIdx = index("title");
  const tagsIdx = index("tags");
  const folderIdx = index("folder");
  // Optional: files exported before the column existed import as `auto`.
  const openModeIdx = index("open_mode");
  // Optional: blank means no click limit.
  const maxClicksIdx = index("max_clicks");

  if (destIdx < 0) {
    return { created: 0, skipped: 0, errors: ["missing_destination"] };
  }

  // Imported rows carry no noIndex / forwardQuery / UTM, and folder and open mode only
  // when those columns exist, so the workspace's link defaults fill the rest.
  const defaults = await getLinkDefaults(workspaceId);

  // The folder column may hold this workspace's folder id (as exported) or its name.
  // Anything else, e.g. an id exported from another workspace, is dropped, not trusted.
  const folderLookup = new Map<string, string>();
  const folderRows = await getDb()
    .select({ id: folders.id, name: folders.name })
    .from(folders)
    .where(eq(folders.workspaceId, workspaceId));
  for (const folder of folderRows) {
    folderLookup.set(folder.id.toLowerCase(), folder.id);
    folderLookup.set(folder.name.trim().toLowerCase(), folder.id);
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  const createdLinks: LinkWithDomain[] = [];

  for (const [offset, row] of rows.slice(1).entries()) {
    if (remaining != null && created >= remaining) {
      const left = rows.length - 1 - offset;
      skipped += left;
      errors.push(`row ${offset + 2}: plan link limit reached, ${left} row(s) not imported`);
      break;
    }

    const destination = destinationSchema.safeParse(row[destIdx]?.trim() ?? "");
    if (!destination.success) {
      skipped += 1;
      errors.push(`row ${offset + 2}: destination`);
      continue;
    }

    const rawSlug = slugIdx >= 0 ? row[slugIdx]?.trim() ?? "" : "";
    const slug = rawSlug === "" ? undefined : slugSchema.safeParse(rawSlug);
    if (slug && !slug.success) {
      skipped += 1;
      errors.push(`row ${offset + 2}: slug`);
      continue;
    }

    const rawMaxClicks = maxClicksIdx >= 0 ? (row[maxClicksIdx]?.trim() ?? "") : "";
    if (rawMaxClicks !== "" && !/^\d{1,10}$/.test(rawMaxClicks)) {
      skipped += 1;
      errors.push(`row ${offset + 2}: max_clicks`);
      continue;
    }

    // Same schema as the editor and the API, so title/tag limits apply to imports too.
    const input = linkInputSchema.safeParse(
      applyLinkDefaults(
        {
          domainId,
          slug: slug?.data,
          destination: destination.data,
          title: titleIdx >= 0 ? unguardCell(row[titleIdx]?.trim() ?? "") || undefined : undefined,
          tags:
            tagsIdx >= 0
              ? unguardCell(row[tagsIdx] ?? "")
                  .split(/[|,]/)
                  .map((tag) => tag.trim())
                  .filter((tag) => tag !== "")
              : [],
          folderId:
            folderIdx >= 0 ? (folderLookup.get(row[folderIdx]?.trim().toLowerCase() ?? "") ?? null) : undefined,
          openMode: openModeIdx >= 0 ? row[openModeIdx]?.trim().toLowerCase() || undefined : undefined,
          maxClicks: rawMaxClicks === "" ? null : Number(rawMaxClicks),
        },
        defaults,
      ),
    );
    if (!input.success) {
      skipped += 1;
      errors.push(`row ${offset + 2}: ${input.error.issues[0]?.path.join(".") || "invalid"}`);
      continue;
    }

    try {
      if (input.data.slug) {
        checkSlug?.(input.data.slug);
      }
      const link = await createLink({
        workspaceId,
        creatorId,
        deferKv: true,
        input: input.data,
      });
      created += 1;
      createdLinks.push(link);
      await afterCreate?.(link);
    } catch (error) {
      skipped += 1;
      errors.push(`row ${offset + 2}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  // One bulk KV write for the whole file instead of one API round trip per row.
  await putLinkRecords(createdLinks.map((link) => toKvRecord(link, link.hostname)));

  return { created, skipped, errors: errors.slice(0, 20) };
}

/** Every link in the workspace, not just the first page the list view shows. */
export async function exportWorkspaceLinks(workspaceId: string): Promise<string> {
  const rows = await getDb()
    .select({ link: links, hostname: domains.hostname })
    .from(links)
    .innerJoin(domains, eq(links.domainId, domains.id))
    .where(eq(links.workspaceId, workspaceId))
    .orderBy(desc(links.createdAt))
    .limit(CSV_EXPORT_MAX_ROWS);
  return linksToCsv(rows.map((row) => ({ ...row.link, hostname: row.hostname })));
}
