import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { cloudflareOAuthEnabled } from "@/lib/cloudflare-oauth";
import { getCloudflareConnectionPublic } from "@/lib/customer-cloudflare";
import { cnameTarget, getDomain } from "@/lib/domains";
import { hasWorkspaceRole, requireWorkspace } from "@/lib/session";
import { DomainSettings } from "../domain-settings";
import { DomainSetup } from "../domain-setup";
import { listStatus, toDomainRowView, type OauthReturn } from "../types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstQuery(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const [{ id }, context, t] = await Promise.all([
    params,
    requireWorkspace(),
    getTranslations("domains"),
  ]);
  const domain = await getDomain(context.workspace.id, id);
  return { title: domain && !domain.isPlatform ? domain.hostname : t("title") };
}

export default async function DomainDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const [{ id }, context, t, tn, query] = await Promise.all([
    params,
    requireWorkspace(),
    getTranslations("domains"),
    getTranslations("nav"),
    searchParams,
  ]);

  const domain = await getDomain(context.workspace.id, id);
  if (!domain || domain.isPlatform) {
    notFound();
  }

  const cf = firstQuery(query.cf);
  const oauthReturn: OauthReturn | null =
    cf === "connected" || cf === "error"
      ? { result: cf, domainId: domain.id, reason: firstQuery(query.reason) }
      : null;

  const row = toDomainRowView(domain);
  const verified = listStatus(row) === "verified";
  const canManage = hasWorkspaceRole(context.role, "admin") || context.isSuperadmin;
  const cloudflareAccount = verified ? null : await getCloudflareConnectionPublic(context.workspace.id);

  return (
    <PanelShell
      title={domain.hostname}
      crumbs={[
        { label: context.workspace.name },
        { label: tn("domains"), href: "/domains" },
        { label: domain.hostname },
      ]}
    >
      <Hero
        variant="compact"
        eyebrow={verified ? t("verified") : t("pending")}
        title={domain.hostname}
        description={verified ? t("settingsNamed", { host: domain.hostname }) : t("dnsHint")}
      />
      {verified ? (
        <DomainSettings domain={row} canManage={canManage} />
      ) : (
        <DomainSetup
          domain={row}
          cnameTarget={cnameTarget()}
          canManage={canManage}
          cloudflareOAuth={cloudflareOAuthEnabled()}
          cloudflareAccount={cloudflareAccount}
          oauthReturn={oauthReturn}
        />
      )}
    </PanelShell>
  );
}
