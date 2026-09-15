import type { Metadata } from "next";
import { formatLimit } from "@short/core";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { cloudflareEnabled } from "@/lib/cloudflare";
import { cnameTarget, listDomains } from "@/lib/domains";
import { hasWorkspaceRole, requireWorkspace } from "@/lib/session";
import { DomainsManager, type DomainRowView } from "./domains-manager";

export const metadata: Metadata = { title: "Domains" };

export default async function DomainsPage() {
  const context = await requireWorkspace();
  const domains = await listDomains(context.workspace.id);

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
  }));

  const custom = rows.filter((row) => !row.isPlatform).length;
  const limit = context.plan.limits.customDomains;

  return (
    <PanelShell title="Domains" crumbs={[{ label: context.workspace.name }]}>
      <Hero
        eyebrow={`${custom} of ${formatLimit(limit)} custom domains`}
        title="Branded short domains"
        description="Point a subdomain at the redirect edge and every link you create can use it. Certificates are issued and renewed automatically."
      />

      <DomainsManager
        rows={rows}
        cnameTarget={cnameTarget()}
        canManage={hasWorkspaceRole(context.role, "admin") || context.isSuperadmin}
        cloudflareConfigured={cloudflareEnabled()}
      />
    </PanelShell>
  );
}
