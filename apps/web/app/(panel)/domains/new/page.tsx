import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { formatLimit, isWithinLimit } from "@short/core";
import { Icon } from "@/components/kit/icon";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, Callout, Card, EmptyState, PageHeader, Steps } from "@/components/ui";
import { cloudflareEnabled } from "@/lib/cloudflare";
import { cloudflareOAuthEnabled } from "@/lib/cloudflare-oauth";
import { getWorkspaceUsage } from "@/lib/quota";
import { hasWorkspaceRole, requireWorkspace } from "@/lib/session";
import { AddDomainForm } from "../add-domain-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("domains");
  return { title: t("connectTitle") };
}

export default async function NewDomainPage() {
  const [context, t, tc, tn] = await Promise.all([
    requireWorkspace(),
    getTranslations("domains"),
    getTranslations("common"),
    getTranslations("nav"),
  ]);

  const usage = await getWorkspaceUsage(context.workspace.id);
  const limit = context.plan.limits.customDomains;
  const locked = limit === 0;
  const atLimit = !locked && !isWithinLimit(limit, usage.customDomains);
  const canManage = hasWorkspaceRole(context.role, "admin") || context.isSuperadmin;

  const tips = [t("tipSubdomain"), t("tipAccess"), t("tipTiming")];
  if (cloudflareOAuthEnabled()) {
    tips.push(t("tipCloudflare"));
  }

  let body;
  if (!canManage) {
    body = (
      <EmptyState
        icon="lock"
        title={t("memberTitle")}
        description={t("memberNote")}
        actions={
          <Button href="/domains" leadingIcon="arrow-left">
            {t("backToDomains")}
          </Button>
        }
      />
    );
  } else if (locked || atLimit) {
    body = (
      <EmptyState
        tone="first-run"
        icon="rocket"
        title={locked ? t("lockedTitle") : t("quotaFullTitle", { limit: formatLimit(limit) })}
        description={locked ? t("lockedBody") : t("quotaFullBody")}
        actions={
          <>
            <Button href="/domains">{t("backToDomains")}</Button>
            <Button variant="primary" leadingIcon="rocket" href="/billing">
              {tc("seePlans")}
            </Button>
          </>
        }
      />
    );
  } else {
    body = (
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {cloudflareEnabled() ? null : (
            <Callout tone="warn" title={t("sslManualTitle")}>
              {t("cloudflareMissing")}
            </Callout>
          )}
          <AddDomainForm />
        </div>
        <aside className="min-w-0">
          <Card title={t("tipsTitle")}>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {tips.map((tip) => (
                <li key={tip} className="flex min-w-0 items-start gap-2.5 text-sm leading-5 text-fg-muted">
                  <Icon name="circle-check" className="mt-0.5 shrink-0 text-[13px] text-success" />
                  <span className="min-w-0">{tip}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    );
  }

  return (
    <PanelShell
      title={t("connectTitle")}
      crumbs={[{ label: context.workspace.name }, { label: tn("domains"), href: "/domains" }]}
    >
      <PageHeader
        back={{ href: "/domains", label: tn("domains") }}
        title={t("connectTitle")}
        description={t("connectDesc")}
      />
      {canManage && !locked && !atLimit ? (
        <Steps
          current="enter"
          steps={[
            { id: "enter", label: t("stepEnter"), description: t("stepEnterDesc") },
            { id: "dns", label: t("stepDns"), description: t("stepDnsDesc") },
            { id: "live", label: t("stepLive"), description: t("stepLiveDesc") },
          ]}
        />
      ) : null}
      {body}
    </PanelShell>
  );
}
