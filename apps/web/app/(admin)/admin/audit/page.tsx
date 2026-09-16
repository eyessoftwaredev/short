import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QueryFilterBar } from "@/components/shell/query-filter-bar";
import { QueryPagination } from "@/components/shell/query-pagination";
import { PanelShell } from "@/components/shell/panel-shell";
import {
  Card,
  EmptyState,
  Hero,
  Timeline,
  type FilterOption,
  type TimelineItem,
} from "@/components/ui";
import { ADMIN_PAGE_SIZE, listAuditActionGroups, listAuditLogs } from "@/lib/admin";
import { formatDateTime, formatNumber } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.audit");
  return { title: t("metaTitle") };
}

type SearchParams = Promise<{ status?: string; workspace?: string; page?: string }>;

/** Destructive or security-relevant prefixes get a louder dot in the timeline. */
function toneFor(action: string): TimelineItem["tone"] {
  if (action.includes("deleted") || action.includes("banned") || action.includes("flagged")) {
    return "danger";
  }
  if (action.startsWith("admin.") || action.includes("impersonated")) {
    return "warn";
  }
  if (action.startsWith("billing.")) {
    return "accent";
  }
  return "muted";
}

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperadmin();
  const { status, workspace, page } = await searchParams;
  const t = await getTranslations("admin.audit");
  const tNav = await getTranslations("admin.nav");
  const tn = await getTranslations("nav");

  const current = Math.max(1, Number(page ?? 1) || 1);
  const groups = await listAuditActionGroups();
  const options: readonly FilterOption[] = [
    { id: "all", label: tNav("all") },
    ...groups.map((group) => ({ id: group, label: group })),
  ];
  const actionValue = options.some((option) => option.id === status) ? status : "all";

  const { items, total } = await listAuditLogs({
    action: actionValue,
    workspaceId: workspace,
    page: current,
  });

  const entries: TimelineItem[] = items.map((row) => {
    const target = row.targetId
      ? t("target", { type: row.targetType, id: row.targetId.slice(0, 8) })
      : row.targetType;
    const actor = row.actorEmail ?? t("system");
    const workspaceLabel = row.workspaceName ? ` · ${row.workspaceName}` : "";
    const impersonating = row.impersonatorId ? ` · ${t("impersonating")}` : "";

    return {
      id: row.id,
      title: `${row.action} · ${target}`,
      body: (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate">
            {actor}
            {workspaceLabel}
            {impersonating}
          </span>
          {Object.keys(row.metadata).length > 0 ? (
            <span className="truncate font-mono text-xs text-fg-subtle">
              {JSON.stringify(row.metadata)}
            </span>
          ) : null}
        </span>
      ),
      when: `${formatDateTime(row.createdAt)}${row.ipAddress ? ` · ${row.ipAddress}` : ""}`,
      tone: toneFor(row.action),
    };
  });

  return (
    <PanelShell
      title={tn("admin-audit")}
      crumbs={[{ label: tNav("admin") }, { label: tn("admin-audit") }]}
    >
      <Hero
        eyebrow={t("entries", { count: formatNumber(total) })}
        title={t("title")}
        description={t("description")}
      />

      <QueryFilterBar options={options} value={actionValue} searchable={false} />

      {entries.length === 0 ? (
        <EmptyState
          icon={<Icon name="scroll" className="text-lg" />}
          eyebrow={tn("admin-audit")}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <>
          <Card staticHover>
            <Timeline items={entries} />
          </Card>
          <QueryPagination page={current} pageSize={ADMIN_PAGE_SIZE} total={total} />
        </>
      )}
    </PanelShell>
  );
}
