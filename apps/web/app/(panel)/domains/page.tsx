import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { formatLimit } from "@short/core";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { cloudflareEnabled } from "@/lib/cloudflare";
import { getCloudflareConnectionPublic } from "@/lib/customer-cloudflare";
import { cnameTarget, listDomains } from "@/lib/domains";
import { hasWorkspaceRole, requireWorkspace } from "@/lib/session";
import { DomainsManager, type DomainRowView } from "./domains-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("domains");
  return { title: t("title") };
}

export default async function DomainsPage() {
  const [context, t, tc] = await Promise.all([
    requireWorkspace(),
    getTranslations("domains"),
    getTranslations("common"),
  ]);
  const [domains, cloudflareAccount] = await Promise.all([
    listDomains(context.workspace.id),
    getCloudflareConnectionPublic(context.workspace.id),
  ]);

  const rows: DomainRowView[] = domains.map((domain) => ({
    id: domain.id,
    hostname: domain.hostname,
    status: domain.status,
    sslStatus: domain.sslStatus,
    isPlatform: domain.isPlatform,
    isDefault: domain.isDefault,
    rootDestination: domain.rootDestination,
    notFoundDestination: domain.notFoundDestination,
    linkCount: domain.linkCount,
    lastCheckedAt: domain.lastCheckedAt?.toISOString() ?? null,
    validationRecords: domain.validationRecords,
  }));

  const custom = rows.filter((row) => !row.isPlatform).length;
  const limit = context.plan.limits.customDomains;
  const limitLabel = limit === -1 ? tc("unlimited") : formatLimit(limit);

  return (
    <PanelShell title={t("title")} crumbs={[{ label: context.workspace.name }]}>
      <Hero
        eyebrow={t("customCount", { used: custom, limit: limitLabel })}
        title={t("heroTitle")}
        description={t("heroDesc")}
      />

      <DomainsManager
        rows={rows}
        cnameTarget={cnameTarget()}
        canManage={hasWorkspaceRole(context.role, "admin") || context.isSuperadmin}
        cloudflareConfigured={cloudflareEnabled()}
        cloudflareAccount={cloudflareAccount}
      />
    </PanelShell>
  );
}
