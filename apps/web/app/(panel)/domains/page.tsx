import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { formatLimit, isWithinLimit } from "@short/core";
import { PanelShell } from "@/components/shell/panel-shell";
import { Badge, Button, Callout, EmptyState, PageHeader } from "@/components/ui";
import { cloudflareOAuthEnabled } from "@/lib/cloudflare-oauth";
import { listDomains, refreshPendingDomains } from "@/lib/domains";
import { getWorkspaceUsage } from "@/lib/quota";
import { hasWorkspaceRole, requireWorkspace } from "@/lib/session";
import { DomainsList } from "./domains-list";
import { DomainsPublish } from "./domains-publish";
import { toDomainRowView } from "./types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const REFRESH_BUDGET_MS = 2_500;

function firstQuery(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("domains");
  return { title: t("title") };
}

export default async function DomainsPage({ searchParams }: { searchParams: SearchParams }) {
  const [context, t, tc, query] = await Promise.all([
    requireWorkspace(),
    getTranslations("domains"),
    getTranslations("common"),
    searchParams,
  ]);

  // Cloudflare's OAuth callback lands here when it could not tell which domain started it.
  const cf = firstQuery(query.cf);
  const oauthDomainId = firstQuery(query.domainId);
  if ((cf === "connected" || cf === "error") && oauthDomainId) {
    const reason = firstQuery(query.reason);
    const next = new URLSearchParams({ cf });
    if (reason) {
      next.set("reason", reason);
    }
    redirect(`/domains/${encodeURIComponent(oauthDomainId)}?${next.toString()}`);
  }

  // Nudge hostnames still in setup forward so their badges are current, but never let a
  // slow Cloudflare response hold the page: whatever is not back in time shows next visit.
  await Promise.race([
    refreshPendingDomains({ workspaceId: context.workspace.id }).catch(() => 0),
    new Promise((resolve) => setTimeout(resolve, REFRESH_BUDGET_MS)),
  ]);

  const [domains, usage] = await Promise.all([
    listDomains(context.workspace.id),
    getWorkspaceUsage(context.workspace.id),
  ]);
  const rows = domains.map(toDomainRowView);
  const limit = context.plan.limits.customDomains;
  // The quota is counted across every account the owner has, not just this one.
  const used = usage.customDomains;
  const limitLabel = limit === -1 ? tc("unlimited") : formatLimit(limit);
  const canManage = hasWorkspaceRole(context.role, "admin") || context.isSuperadmin;
  const locked = limit === 0;
  const atLimit = !locked && !isWithinLimit(limit, used);

  const primary = !canManage ? null : locked || atLimit ? (
    <Button variant="primary" leadingIcon="rocket" href="/billing">
      {tc("seePlans")}
    </Button>
  ) : (
    <Button variant="primary" leadingIcon="plus" href="/domains/new">
      {t("add")}
    </Button>
  );

  return (
    <PanelShell title={t("title")} crumbs={[{ label: context.workspace.name }]}>
      <PageHeader
        title={t("title")}
        meta={
          locked ? null : (
            <Badge tone={atLimit ? "warn" : "neutral"}>
              {t("usage", { used, limit: limitLabel })}
            </Badge>
          )
        }
        description={t("listDesc")}
        actions={primary}
      />

      {atLimit && rows.length > 0 && canManage ? (
        <Callout
          tone="warn"
          title={t("quotaFullTitle", { limit: limitLabel })}
          actions={
            <Button size="sm" href="/billing" leadingIcon="rocket">
              {tc("seePlans")}
            </Button>
          }
        >
          {t("quotaFullBody")}
        </Callout>
      ) : null}

      {!canManage ? <Callout tone="info">{t("memberNote")}</Callout> : null}

      {rows.length === 0 ? (
        locked ? (
          <EmptyState
            tone="first-run"
            icon="lock"
            title={t("lockedTitle")}
            description={t("lockedBody")}
            actions={
              <Button variant="primary" leadingIcon="rocket" href="/billing">
                {tc("seePlans")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            tone="first-run"
            icon="globe"
            title={t("emptyTitle")}
            description={t("emptyBody")}
            actions={
              canManage ? (
                atLimit ? (
                  <Button variant="primary" leadingIcon="rocket" href="/billing">
                    {tc("seePlans")}
                  </Button>
                ) : (
                  <Button variant="primary" leadingIcon="plus" href="/domains/new">
                    {t("addFirst")}
                  </Button>
                )
              ) : null
            }
            hint={canManage && cloudflareOAuthEnabled() ? t("emptyHint") : undefined}
          />
        )
      ) : (
        <DomainsList rows={rows} canManage={canManage} />
      )}

      {canManage && rows.length > 0 ? <DomainsPublish /> : null}
    </PanelShell>
  );
}
