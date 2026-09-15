import type { Metadata } from "next";
import { Activity, CheckCircle2, CircleSlash, TriangleAlert, XCircle } from "lucide-react";
import { PanelShell } from "@/components/shell/panel-shell";
import { Badge, Card, Grid, Hero, Section } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getIngestLag, runHealthChecks, type HealthCheck, type HealthState } from "@/lib/health";
import { requireSuperadmin } from "@/lib/session";

export const metadata: Metadata = { title: "System · Admin" };

/** Probes run on every request; caching them would defeat the purpose. */
export const dynamic = "force-dynamic";

const STATE_META: Record<
  HealthState,
  { tone: "accent" | "warn" | "danger" | "muted"; label: string; icon: typeof CheckCircle2 }
> = {
  ok: { tone: "accent", label: "Healthy", icon: CheckCircle2 },
  degraded: { tone: "warn", label: "Slow", icon: TriangleAlert },
  down: { tone: "danger", label: "Down", icon: XCircle },
  disabled: { tone: "muted", label: "Not configured", icon: CircleSlash },
};

export default async function AdminSystemPage() {
  await requireSuperadmin();

  const [checks, lag] = await Promise.all([runHealthChecks(), getIngestLag()]);

  const down = checks.filter((check) => check.state === "down").length;
  const degraded = checks.filter((check) => check.state === "degraded").length;
  const lagTone = lag.lagSeconds === null ? "muted" : lag.lagSeconds > 300 ? "warn" : "accent";

  return (
    <PanelShell title="System" crumbs={[{ label: "Admin" }, { label: "System" }]}>
      <Hero
        eyebrow="Live probes"
        title="System status"
        description="Each dependency is probed when this page loads. Anything marked as not configured is optional and degrades gracefully."
      />

      {down > 0 || degraded > 0 ? (
        <Card
          staticHover
          className={
            down > 0
              ? "flex-row items-center gap-3 border-danger-border bg-danger-surface"
              : "flex-row items-center gap-3 border-warn-border bg-warn-surface"
          }
        >
          <TriangleAlert className={down > 0 ? "size-4 text-danger" : "size-4 text-warn-ink"} />
          <span className="text-sm">
            {down > 0
              ? `${down} dependenc${down === 1 ? "y is" : "ies are"} unreachable.`
              : `${degraded} dependenc${degraded === 1 ? "y is" : "ies are"} responding slowly.`}
          </span>
        </Card>
      ) : null}

      <Grid columns={3}>
        <Card
          label="Ingest lag"
          value={lag.lagSeconds === null ? "—" : `${formatNumber(lag.lagSeconds)}s`}
          delta={
            lag.lastEventAt ? `Last event ${formatDateTime(lag.lastEventAt)}` : "No events recorded"
          }
          staticHover
          className={lagTone === "warn" ? "border-warn-border" : undefined}
        />
        <Card
          label="Events / hour"
          value={formatNumber(lag.eventsLastHour)}
          delta="Worker → Queue → ClickHouse"
          staticHover
        />
        <Card
          label="Dependencies"
          value={`${checks.filter((check) => check.state === "ok").length}/${checks.length}`}
          delta="Healthy"
          staticHover
        />
      </Grid>

      <Section title="Dependencies" description="Round-trip latency measured from the panel.">
        <div className="flex min-w-0 flex-col gap-3">
          {checks.map((check) => (
            <HealthRow key={check.id} check={check} />
          ))}
        </div>
      </Section>

      <Section
        title="Edge components"
        description="The redirect worker and queue consumer are deployed with Wrangler and report through the ingest lag above."
      >
        <Grid columns={2}>
          <Card staticHover className="gap-2">
            <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-fg-subtle uppercase">
              <Activity className="size-3.5" />
              Redirect worker
            </span>
            <span className="text-sm text-fg-muted">
              Reads `link:{"{hostname}"}:{"{slug}"}` from KV and falls back to
              `/api/internal/resolve` on a miss, so a stale namespace still resolves.
            </span>
          </Card>
          <Card staticHover className="gap-2">
            <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-fg-subtle uppercase">
              <Activity className="size-3.5" />
              Ingest consumer
            </span>
            <span className="text-sm text-fg-muted">
              Batches 100 events or 5 seconds into ClickHouse. A growing ingest lag points at
              this worker or the queue rather than the panel.
            </span>
          </Card>
        </Grid>
      </Section>
    </PanelShell>
  );
}

function HealthRow({ check }: { check: HealthCheck }) {
  const meta = STATE_META[check.state];
  const Icon = meta.icon;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-default border border-border px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-default bg-surface">
        <Icon
          className={
            check.state === "ok"
              ? "size-4 text-accent-ink"
              : check.state === "down"
                ? "size-4 text-danger"
                : check.state === "degraded"
                  ? "size-4 text-warn-ink"
                  : "size-4 text-fg-subtle"
          }
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{check.label}</span>
        <span className="truncate text-xs text-fg-muted">{check.detail}</span>
      </span>
      {check.latencyMs === null ? null : (
        <span className="shrink-0 font-mono text-xs text-fg-subtle">{check.latencyMs}ms</span>
      )}
      <Badge tone={meta.tone}>{meta.label}</Badge>
    </div>
  );
}
