import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
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

export const metadata: Metadata = { title: "Audit log · Admin" };

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

function describe(action: string, targetType: string, targetId: string | null): string {
  const target = targetId ? `${targetType} ${targetId.slice(0, 8)}` : targetType;
  return `${action} · ${target}`;
}

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperadmin();
  const { status, workspace, page } = await searchParams;

  const current = Math.max(1, Number(page ?? 1) || 1);
  const groups = await listAuditActionGroups();
  const options: readonly FilterOption[] = [
    { id: "all", label: "All" },
    ...groups.map((group) => ({ id: group, label: group })),
  ];
  const actionValue = options.some((option) => option.id === status) ? status : "all";

  const { items, total } = await listAuditLogs({
    action: actionValue,
    workspaceId: workspace,
    page: current,
  });

  const entries: TimelineItem[] = items.map((row) => ({
    id: row.id,
    title: describe(row.action, row.targetType, row.targetId),
    body: (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate">
          {row.actorEmail ?? "system"}
          {row.workspaceName ? ` · ${row.workspaceName}` : ""}
          {row.impersonatorId ? " · while impersonating" : ""}
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
  }));

  return (
    <PanelShell title="Audit log" crumbs={[{ label: "Admin" }, { label: "Audit" }]}>
      <Hero
        eyebrow={`${formatNumber(total)} entries`}
        title="Audit log"
        description="Append-only record of every mutation, including the superadmin who took it and whether it happened during impersonation."
      />

      <QueryFilterBar options={options} value={actionValue} searchable={false} />

      {entries.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="size-5" />}
          eyebrow="Audit"
          title="Nothing recorded yet"
          description="Entries appear as soon as someone creates, edits or removes something."
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
