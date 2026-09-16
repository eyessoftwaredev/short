import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { formatLimit } from "@short/core";
import { Icon } from "@/components/kit/icon";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, Hero } from "@/components/ui";
import { listDomains } from "@/lib/domains";
import { hasWorkspaceRole, requireWorkspace } from "@/lib/session";
import { DomainsList } from "./domains-list";
import { DomainsPublish } from "./domains-publish";
import { toDomainRowView } from "./types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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

  const cf = firstQuery(query.cf);
  const oauthDomainId = firstQuery(query.domainId);
  if ((cf === "connected" || cf === "error") && oauthDomainId) {
    const reason = firstQuery(query.reason);
    const next = new URLSearchParams({ cf });
    if (reason) {
      next.set("reason", reason);
    }
    redirect(`/domains/${oauthDomainId}?${next.toString()}`);
  }

  const domains = await listDomains(context.workspace.id);
  const rows = domains.map(toDomainRowView);
  const custom = rows.length;
  const limit = context.plan.limits.customDomains;
  const limitLabel = limit === -1 ? tc("unlimited") : formatLimit(limit);
  const canManage = hasWorkspaceRole(context.role, "admin") || context.isSuperadmin;

  return (
    <PanelShell title={t("title")} crumbs={[{ label: context.workspace.name }]}>
      <Hero
        variant="compact"
        eyebrow={t("customCount", { used: custom, limit: limitLabel })}
        title={t("heroTitle")}
        description={t("heroDesc")}
        actions={
          rows.length > 0 ? (
            <Button variant="primary" href="/domains/new">
              <Icon name="plus" className="text-sm" />
              {t("add")}
            </Button>
          ) : undefined
        }
      />

      <DomainsList rows={rows} />
      {canManage && rows.length > 0 ? <DomainsPublish /> : null}
    </PanelShell>
  );
}
