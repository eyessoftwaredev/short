import { destinationSchema, slugSchema } from "@short/core";
import { createLink, listLinks, type LinkWithDomain } from "./links";

const HEADER = ["slug", "destination", "title", "tags", "folder"] as const;

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
      ].join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
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

export async function importLinksCsv(
  workspaceId: string,
  domainId: string,
  text: string,
): Promise<CsvImportResult> {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length === 0) {
    return { created: 0, skipped: 0, errors: ["empty"] };
  }

  const header = rows[0]?.map((cell) => cell.trim().toLowerCase()) ?? [];
  const index = (name: string) => header.indexOf(name);
  const slugIdx = index("slug");
  const destIdx = index("destination");
  const titleIdx = index("title");
  const tagsIdx = index("tags");
  const folderIdx = index("folder");

  if (destIdx < 0) {
    return { created: 0, skipped: 0, errors: ["missing_destination"] };
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [offset, row] of rows.slice(1).entries()) {
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

    try {
      await createLink({
        workspaceId,
        creatorId: null,
        input: {
          domainId,
          slug: slug?.data,
          destination: destination.data,
          title: titleIdx >= 0 ? row[titleIdx]?.trim() || undefined : undefined,
          tags:
            tagsIdx >= 0
              ? (row[tagsIdx] ?? "")
                  .split(/[|,]/)
                  .map((tag) => tag.trim())
                  .filter((tag) => tag !== "")
              : [],
          folderId:
            folderIdx >= 0 && /^[0-9a-f-]{36}$/i.test(row[folderIdx] ?? "")
              ? row[folderIdx]
              : null,
          rules: [],
          abVariants: [],
          cloaked: false,
          noIndex: true,
          forwardQuery: false,
          archived: false,
          utm: null,
        },
      });
      created += 1;
    } catch (error) {
      skipped += 1;
      errors.push(`row ${offset + 2}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  return { created, skipped, errors: errors.slice(0, 20) };
}

export async function exportWorkspaceLinks(workspaceId: string): Promise<string> {
  const { items } = await listLinks(workspaceId, {
    status: "all",
    sort: "created_desc",
    page: 1,
    pageSize: 100,
  });
  return linksToCsv(items);
}
