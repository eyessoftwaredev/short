import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/kit/icon";
import { PanelShell } from "@/components/shell/panel-shell";
import { Badge, Card, Grid, Hero, Section } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  HEALTH_STATUS_KEYS,
  getIngestLag,
  runHealthChecks,
  type HealthCheck,
  type HealthState,
} from "@/lib/health";
import { requireSuperadmin } from "@/lib/session";
import { getStripeStatus } from "@/lib/stripe";
import { StripeSettings } from "./stripe-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.system");
  return { title: t("metaTitle") };
}

/** Probes run on every request; caching them would defeat the purpose. */
export const dynamic = "force-dynamic";

const STATE_META: Record<HealthState, { tone: "accent" | "warn" | "danger" | "muted"; icon: IconName }> = {
  ok: { tone: "accent", icon: "circle-check" },
  degraded: { tone: "warn", icon: "warning" },
  down: { tone: "danger", icon: "circle-xmark" },
  disabled: { tone: "muted", icon: "ban" },
};

export default async function AdminSystemPage() {
  await requireSuperadmin();
  const t = await getTranslations("admin.system");
  const tNav = await getTranslations("admin.nav");
  const tn = await getTranslations("nav");

  const [checks, lag, stripeStatus] = await Promise.all([
    runHealthChecks(),
    getIngestLag(),
    getStripeStatus(),
  ]);

  const down = checks.filter((check) => check.state === "down").length;
  const degraded = checks.filter((check) => check.state === "degraded").length;
  const lagTone = lag.lagSeconds === null ? "muted" : lag.lagSeconds > 300 ? "warn" : "accent";
  const healthyCount = checks.filter((check) => check.state === "ok").length;

  return (
    <PanelShell title={tn("admin-system")} crumbs={[{ label: tNav("admin") }, { label: tn("admin-system") }]}>
      <Hero eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      {down > 0 || degraded > 0 ? (
        <Card
          staticHover
          className={
            down > 0
              ? "flex-row items-center gap-3 border-danger-border bg-danger-surface"
              : "flex-row items-center gap-3 border-warn-border bg-warn-surface"
          }
        >
          <Icon name="warning" className={down > 0 ? "text-sm text-danger" : "text-sm text-warn-ink"} />
          <span className="text-sm">
            {down > 0 ? t("downAlert", { count: down }) : t("slowAlert", { count: degraded })}
          </span>
        </Card>
      ) : null}

      <Grid columns={3}>
        <Card
          label={t("ingestLag")}
          value={lag.lagSeconds === null ? "—" : `${formatNumber(lag.lagSeconds)}s`}
          delta={
            lag.lastEventAt
              ? t("lastEvent", { when: formatDateTime(lag.lastEventAt) })
              : t("noEvents")
          }
          staticHover
          className={lagTone === "warn" ? "border-warn-border" : undefined}
        />
        <Card
          label={t("eventsHour")}
          value={formatNumber(lag.eventsLastHour)}
          delta={t("eventsHourDelta")}
          staticHover
        />
        <Card
          label={t("dependencies")}
          value={`${healthyCount}/${checks.length}`}
          delta={t("healthy")}
          staticHover
        />
      </Grid>

      <StripeSettings status={stripeStatus} />

      <Section title={t("dependencies")} description={t("dependenciesDesc")}>
        <div className="flex min-w-0 flex-col gap-3">
          {checks.map((check) => (
            <HealthRow
              key={check.id}
              check={check}
              statusLabel={t(HEALTH_STATUS_KEYS[check.state])}
              latencyLabel={
                check.latencyMs === null ? null : t("latencyMs", { ms: check.latencyMs })
              }
            />
          ))}
        </div>
      </Section>

      <Section title={t("edge")} description={t("edgeDesc")}>
        <Grid columns={2}>
          <Card staticHover className="gap-2">
            <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-fg-subtle uppercase">
              <Icon name="pulse" className="text-xs" />
              {t("redirectWorker")}
            </span>
            <span className="text-sm text-fg-muted">{t("redirectWorkerBody")}</span>
          </Card>
          <Card staticHover className="gap-2">
            <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-fg-subtle uppercase">
              <Icon name="pulse" className="text-xs" />
              {t("ingestConsumer")}
            </span>
            <span className="text-sm text-fg-muted">{t("ingestConsumerBody")}</span>
          </Card>
        </Grid>
      </Section>
    </PanelShell>
  );
}

function HealthRow({
  check,
  statusLabel,
  latencyLabel,
}: {
  check: HealthCheck;
  statusLabel: string;
  latencyLabel: string | null;
}) {
  const meta = STATE_META[check.state];

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-default border border-border px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-default bg-surface">
        <Icon
          name={meta.icon}
          className={
            check.state === "ok"
              ? "text-sm text-accent-ink"
              : check.state === "down"
                ? "text-sm text-danger"
                : check.state === "degraded"
                  ? "text-sm text-warn-ink"
                  : "text-sm text-fg-subtle"
          }
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{check.label}</span>
        <span className="truncate text-xs text-fg-muted">{check.detail}</span>
      </span>
      {latencyLabel ? (
        <span className="shrink-0 font-mono text-xs text-fg-subtle">{latencyLabel}</span>
      ) : null}
      <Badge tone={meta.tone}>{statusLabel}</Badge>
    </div>
  );
}
