import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, Callout, Card, KeyValue, PageHeader } from "@/components/ui";
import { cloudflareEnabled } from "@/lib/cloudflare";
import { cloudflareOAuthEnabled } from "@/lib/cloudflare-oauth";
import { getCloudflareConnectionPublic } from "@/lib/customer-cloudflare";
import { cnameTarget, countDomainLinks, getDomain } from "@/lib/domains";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { hasWorkspaceRole, requireWorkspace } from "@/lib/session";
import { DomainDangerZone } from "../domain-danger-zone";
import { DomainSettings } from "../domain-settings";
import { DomainSetup } from "../domain-setup";
import { DomainStatusBadge } from "../domain-status-badge";
import { domainState, toDomainRowView, type OauthReturn } from "../types";

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

  const linkCount = await countDomainLinks(domain.id);
  const row = toDomainRowView({ ...domain, linkCount });
  const state = domainState(row);
  const live = state === "live";
  const canManage = hasWorkspaceRole(context.role, "admin") || context.isSuperadmin;
  const cloudflareAccount = live ? null : await getCloudflareConnectionPublic(context.workspace.id);
  // Celebrate (and point at the next step) for a day after verification, then get out of the way.
  const recentlyVerified =
    live && domain.verifiedAt !== null && Date.now() - domain.verifiedAt.getTime() < 24 * 60 * 60 * 1000;

  return (
    <PanelShell
      title={domain.hostname}
      crumbs={[{ label: context.workspace.name }, { label: tn("domains"), href: "/domains" }]}
    >
      <PageHeader
        back={{ href: "/domains", label: tn("domains") }}
        title={domain.hostname}
        meta={<DomainStatusBadge state={state} />}
        description={live ? t("liveDesc") : t("setupDesc")}
        actions={
          live ? (
            <Button variant="primary" leadingIcon="plus" href="/links/new">
              {t("createLinkHere")}
            </Button>
          ) : null
        }
      />

      {live ? (
        <>
          {recentlyVerified ? (
            <Callout tone="success" title={t("liveTitle", { host: domain.hostname })}>
              {row.isDefault ? t("liveBodyDefault") : t("liveBody")}
            </Callout>
          ) : null}
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
            <DomainSettings domain={row} canManage={canManage} />
            <Card title={t("detailsTitle")}>
              <KeyValue
                items={[
                  { id: "status", label: t("status"), value: <DomainStatusBadge state={state} /> },
                  { id: "ssl", label: t("detailSsl"), value: t("detailSslActive"), info: t("detailSslInfo") },
                  { id: "links", label: t("detailLinks"), value: formatNumber(linkCount) },
                  {
                    id: "added",
                    label: t("detailAdded"),
                    value: row.createdAt ? formatDate(row.createdAt) : "—",
                  },
                  {
                    id: "verified",
                    label: t("detailVerified"),
                    value: row.verifiedAt ? formatDate(row.verifiedAt) : "—",
                  },
                  {
                    id: "checked",
                    label: t("detailLastCheck"),
                    value: row.lastCheckedAt ? formatDateTime(row.lastCheckedAt) : t("detailNever"),
                  },
                ]}
              />
            </Card>
          </div>
        </>
      ) : (
        <DomainSetup
          domain={row}
          cnameTarget={cnameTarget()}
          canManage={canManage}
          cloudflareOAuth={cloudflareOAuthEnabled()}
          cloudflareAccount={cloudflareAccount}
          sslAutomatic={cloudflareEnabled()}
          oauthReturn={oauthReturn}
        />
      )}

      {canManage ? <DomainDangerZone domain={row} /> : null}
    </PanelShell>
  );
}
