import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { QueryFilterBar } from "@/components/shell/query-filter-bar";
import { QueryPagination } from "@/components/shell/query-pagination";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  Badge,
  Button,
  Callout,
  EmptyState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type FilterOption,
} from "@/components/ui";
import { ADMIN_PAGE_SIZE, listAuditActionGroups, listAuditLogs } from "@/lib/admin";
import { cn } from "@/lib/cx";
import { formatDateTime, formatNumber } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.audit");
  return { title: t("metaTitle") };
}

type SearchParams = Promise<{ status?: string; workspace?: string; page?: string }>;

type Tone = "danger" | "warn" | "accent" | "neutral";

/** Destructive or security-relevant actions get a louder marker. */
function toneFor(action: string): Tone {
  if (
    action.includes("deleted") ||
    action.includes("remove") ||
    action.includes("banned") ||
    action.includes("flagged") ||
    action.includes("cleared")
  ) {
    return "danger";
  }
  if (action.startsWith("admin.") || action.includes("impersonated")) {
    return "warn";
  }
  if (action.startsWith("billing.")) {
    return "accent";
  }
  return "neutral";
}

const DOT: Record<Tone, string> = {
  danger: "bg-danger",
  warn: "bg-warn",
  accent: "bg-accent",
  neutral: "bg-border-strong",
};

/** `{ "reason": "spam", "count": 3 }` → `reason: spam · count: 3`, the way people read it. */
function describeMetadata(metadata: Record<string, unknown>): string {
  return Object.entries(metadata)
    .map(([key, value]) => {
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return `${key}: ${text}`;
    })
    .join(" · ");
}

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getLocale();
  await requireSuperadmin();
  const { status, workspace, page } = await searchParams;
  const [t, tNav] = await Promise.all([getTranslations("admin.audit"), getTranslations("admin.nav")]);

  const current = Math.max(1, Number(page ?? 1) || 1);
  const groups = await listAuditActionGroups();
  const options: readonly FilterOption[] = [
    { id: "all", label: tNav("all") },
    ...groups.map((group) => ({ id: group, label: group })),
  ];
  const actionValue = options.some((option) => option.id === status) ? status : "all";
  const workspaceId = workspace?.trim() || undefined;

  const { items, total } = await listAuditLogs({
    action: actionValue,
    workspaceId,
    page: current,
  });

  const clearWorkspaceHref = actionValue && actionValue !== "all" ? `/admin/audit?status=${encodeURIComponent(actionValue)}` : "/admin/audit";

  return (
    <PanelShell title={t("title")} crumbs={[{ label: tNav("admin"), href: "/admin" }]}>
      <PageHeader
        title={t("title")}
        meta={<Badge tone="neutral">{t("entries", { count: formatNumber(total, locale) })}</Badge>}
        description={t("description")}
      />

      {workspaceId ? (
        <Callout
          tone="info"
          icon="filter"
          title={
            items[0]?.workspaceName
              ? t("filteredByAccount", { name: items[0].workspaceName })
              : t("filteredByAccountUnknown")
          }
          actions={
            <Button size="sm" href={clearWorkspaceHref} leadingIcon="xmark">
              {t("showAll")}
            </Button>
          }
        />
      ) : null}

      <QueryFilterBar options={options} value={actionValue} searchable={false} />

      {items.length === 0 ? (
        <EmptyState
          icon="scroll"
          title={actionValue !== "all" || workspaceId ? t("emptyFilteredTitle") : t("emptyTitle")}
          description={actionValue !== "all" || workspaceId ? t("emptyFilteredDesc") : t("emptyDesc")}
          actions={
            actionValue !== "all" || workspaceId ? (
              <Button href="/admin/audit" leadingIcon="xmark">
                {tNav("clearFilters")}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <Table label={t("title")} density="compact">
            <TableHead>
              <TableRow>
                <TableHeaderCell className="w-44">{t("colWhen")}</TableHeaderCell>
                <TableHeaderCell>{t("colWhat")}</TableHeaderCell>
                <TableHeaderCell className="hidden md:table-cell">{t("colWho")}</TableHeaderCell>
                <TableHeaderCell className="hidden lg:table-cell">{tNav("workspace")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => {
                const tone = toneFor(row.action);
                const target = row.targetId
                  ? t("target", { type: row.targetType, id: row.targetId.slice(0, 8) })
                  : row.targetType;
                const details = Object.keys(row.metadata).length > 0 ? describeMetadata(row.metadata) : null;
                const actor = row.actorEmail ?? t("system");
                return (
                  <TableRow key={row.id}>
                    <TableCell className="align-top">
                      <span className="flex flex-col gap-0.5">
                        <span className="numeric text-[13px] whitespace-nowrap text-ink">
                          {formatDateTime(row.createdAt, locale)}
                        </span>
                        {row.ipAddress ? (
                          <span className="font-mono text-xs text-fg-subtle">{row.ipAddress}</span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="align-top">
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className={cn("size-2 shrink-0 rounded-full", DOT[tone])} aria-hidden="true" />
                          <span className="font-mono text-[13px] font-medium text-ink">{row.action}</span>
                          <span className="font-mono text-xs text-fg-subtle">{target}</span>
                        </span>
                        {details ? (
                          <span className="line-clamp-2 max-w-2xl text-xs wrap-anywhere text-fg-muted" title={details}>
                            {details}
                          </span>
                        ) : null}
                        {/* Actor and account columns collapse into the row on small screens. */}
                        <span className="truncate text-xs text-fg-muted md:hidden">
                          {actor}
                          {row.workspaceName ? ` · ${row.workspaceName}` : ""}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden align-top md:table-cell">
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="truncate font-mono text-xs text-ink">{actor}</span>
                        {row.impersonatorId ? (
                          <span>
                            <Badge tone="warn" size="sm">
                              {t("impersonatedBadge")}
                            </Badge>
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="hidden align-top text-[13px] text-fg-muted lg:table-cell">
                      {row.workspaceName ?? t("platformLevel")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <QueryPagination page={current} pageSize={ADMIN_PAGE_SIZE} total={total} />
        </>
      )}
    </PanelShell>
  );
}
