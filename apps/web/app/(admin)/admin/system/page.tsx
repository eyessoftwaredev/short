import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/kit/icon";
import { PanelShell } from "@/components/shell/panel-shell";
import { Badge, Callout, Card, Grid, PageHeader, StatCard } from "@/components/ui";
import { cn } from "@/lib/cx";
import { formatDateTime, formatNumber } from "@/lib/format";
import { HEALTH_STATUS_KEYS, getIngestLag, runHealthChecks, type HealthState } from "@/lib/health";
import { requireSuperadmin } from "@/lib/session";
import { getStripeStatus } from "@/lib/stripe";
import { RecheckButton } from "./recheck-button";
import { StripeSettings } from "./stripe-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.system");
  return { title: t("metaTitle") };
}

/** Probes run on every request; caching them would defeat the purpose. */
export const dynamic = "force-dynamic";

/** Ingest older than this means the worker → queue → ClickHouse path has stalled. */
const LAG_WARN_SECONDS = 300;

const STATE_META: Record<
  HealthState,
  { tone: "success" | "warn" | "danger" | "neutral"; icon: IconName; iconClass: string }
> = {
  ok: { tone: "success", icon: "circle-check", iconClass: "bg-success-surface text-success" },
  degraded: { tone: "warn", icon: "warning", iconClass: "bg-warn-surface text-warn" },
  down: { tone: "danger", icon: "circle-xmark", iconClass: "bg-danger-surface text-danger" },
  disabled: { tone: "neutral", icon: "ban", iconClass: "bg-surface text-fg-subtle" },
};

export default async function AdminSystemPage() {
  await requireSuperadmin();
  const [t, tNav] = await Promise.all([getTranslations("admin.system"), getTranslations("admin.nav")]);

  const [checks, lag, stripeStatus] = await Promise.all([
    runHealthChecks(),
    getIngestLag(),
    getStripeStatus(),
  ]);

  const down = checks.filter((check) => check.state === "down").length;
  const degraded = checks.filter((check) => check.state === "degraded").length;
  const configured = checks.filter((check) => check.state !== "disabled");
  const healthyCount = checks.filter((check) => check.state === "ok").length;
  const lagging = lag.lagSeconds !== null && lag.lagSeconds > LAG_WARN_SECONDS;

  return (
    <PanelShell title={t("title")} crumbs={[{ label: tNav("admin"), href: "/admin" }]}>
      <PageHeader
        title={t("title")}
        meta={
          <Badge tone={down > 0 ? "danger" : degraded > 0 ? "warn" : "success"} dot>
            {down > 0 ? t("statusDown") : degraded > 0 ? t("statusDegraded") : t("statusOk")}
          </Badge>
        }
        description={t("description")}
        actions={<RecheckButton label={t("recheck")} />}
      />

      {down > 0 ? (
        <Callout tone="danger" title={t("downAlert", { count: down })}>
          {t("downAlertBody")}
        </Callout>
      ) : degraded > 0 ? (
        <Callout tone="warn" title={t("slowAlert", { count: degraded })}>
          {t("slowAlertBody")}
        </Callout>
      ) : (
        <Callout tone="success" title={t("allHealthy")}>
          {t("allHealthyBody", { count: configured.length })}
        </Callout>
      )}

      {lagging ? (
        <Callout tone="warn" icon="clock" title={t("lagAlert", { seconds: formatNumber(lag.lagSeconds ?? 0) })}>
          {t("lagAlertBody")}
        </Callout>
      ) : null}

      <Grid columns={3}>
        <StatCard
          icon="clock"
          label={t("ingestLag")}
          info={t("ingestLagInfo")}
          value={lag.lagSeconds === null ? "—" : `${formatNumber(lag.lagSeconds)}s`}
          deltaLabel={
            lag.lastEventAt ? t("lastEvent", { when: formatDateTime(lag.lastEventAt) }) : t("noEvents")
          }
        />
        <StatCard
          icon="pulse"
          label={t("eventsHour")}
          info={t("eventsHourInfo")}
          value={formatNumber(lag.eventsLastHour)}
          deltaLabel={t("eventsHourDelta")}
        />
        <StatCard
          icon="layer-group"
          label={t("dependencies")}
          info={t("dependenciesInfo")}
          value={`${healthyCount}/${configured.length}`}
          deltaLabel={t("healthy")}
        />
      </Grid>

      <Card title={t("dependencies")} description={t("dependenciesDesc")}>
        <ul className="m-0 flex list-none flex-col divide-y divide-border-subtle p-0">
          {checks.map((check) => {
            const meta = STATE_META[check.state];
            return (
              <li key={check.id} className="flex min-w-0 flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={cn("flex size-8 shrink-0 items-center justify-center rounded-default", meta.iconClass)}
                  aria-hidden="true"
                >
                  <Icon name={meta.icon} className="text-xs" />
                </span>
                <span className="flex min-w-0 flex-1 basis-48 flex-col">
                  <span className="truncate text-sm font-medium text-ink">{check.label}</span>
                  <span className="truncate text-xs text-fg-muted" title={check.detail}>
                    {check.detail}
                  </span>
                </span>
                {check.latencyMs === null ? null : (
                  <span className="numeric shrink-0 font-mono text-xs text-fg-subtle">
                    {t("latencyMs", { ms: check.latencyMs })}
                  </span>
                )}
                <Badge tone={meta.tone} dot>
                  {t(HEALTH_STATUS_KEYS[check.state])}
                </Badge>
              </li>
            );
          })}
        </ul>
      </Card>

      <StripeSettings status={stripeStatus} />

      <Grid columns={2}>
        <Card title={t("redirectWorker")} description={t("edgeDesc")}>
          <p className="m-0 text-[13px] leading-5 text-fg-muted">{t("redirectWorkerBody")}</p>
        </Card>
        <Card title={t("ingestConsumer")} description={t("edgeDesc")}>
          <p className="m-0 text-[13px] leading-5 text-fg-muted">{t("ingestConsumerBody")}</p>
        </Card>
      </Grid>
    </PanelShell>
  );
}
