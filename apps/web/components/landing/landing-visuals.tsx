import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";
import { Badge, Sparkline } from "@/components/ui";
import { buildQrSvg } from "@/lib/qr-svg";
import { cn } from "@/lib/cx";

/*
 * Static product illustrations for the landing page. Built from tokens and real
 * markup rather than screenshots, so they follow the theme, stay crisp at any
 * size and cost no image bytes. Everything here is decorative: the copy beside
 * each visual carries the meaning, so the wrappers are hidden from assistive tech.
 */

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface-subtle p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-sm border px-2 text-xs font-medium whitespace-nowrap",
        tone === "accent"
          ? "border-accent-border bg-accent-surface text-accent-on-surface"
          : "border-border bg-bg text-fg-muted",
      )}
    >
      {children}
    </span>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────── */

export type HeroPreviewCopy = {
  /** Illustration figure, pre-formatted for the visitor's locale. */
  total: string;
  active: string;
  rules: string;
  clicks: string;
  last7: string;
  topCountries: string;
  otherwise: string;
};

export function HeroPreview({
  shortHost,
  countries,
  copy,
}: {
  shortHost: string;
  countries: ReadonlyArray<{ code: string; name: string; share: number }>;
  copy: HeroPreviewCopy;
}) {
  const rules: ReadonlyArray<{ icon: IconName; when: string; to: string }> = [
    { icon: "apple", when: "iOS", to: "apps.apple.com/app/acme" },
    { icon: "android", when: "Android", to: "play.google.com/store/apps" },
    { icon: "earth", when: countries[0]?.name ?? "TR", to: "acme.com/tr" },
  ];

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-5xl min-w-0 px-4 sm:px-6">
      <div className="overflow-hidden rounded-xl border border-border bg-bg shadow-modal">
        <div className="flex items-center gap-2 border-b border-border-subtle bg-surface-subtle px-4 py-2.5">
          <span className="size-2.5 rounded-pill bg-border-strong" />
          <span className="size-2.5 rounded-pill bg-border-strong" />
          <span className="size-2.5 rounded-pill bg-border-strong" />
          <span className="ml-3 hidden h-6 min-w-0 flex-1 items-center rounded-sm bg-bg px-2.5 font-mono text-[11px] text-fg-subtle sm:flex">
            {shortHost}/launch
          </span>
        </div>
        <div className="grid min-w-0 gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-default bg-accent-surface text-accent-on-surface">
                <Icon name="link" className="text-sm" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-mono text-[15px] font-medium text-ink">{shortHost}/launch</span>
                <span className="truncate text-xs text-fg-subtle">acme.com/spring-launch</span>
              </div>
              <Badge tone="success" dot size="sm" className="ml-auto">
                {copy.active}
              </Badge>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-xs font-medium text-fg-subtle">{copy.rules}</span>
              {rules.map((rule) => (
                <div
                  key={rule.when}
                  className="flex min-w-0 items-center gap-2.5 rounded-default border border-border-subtle bg-surface-subtle px-3 py-2"
                >
                  <Icon name={rule.icon} className="text-sm text-fg-muted" />
                  <span className="shrink-0 text-[13px] font-medium text-ink">{rule.when}</span>
                  <Icon name="arrow-right" className="text-[10px] text-fg-subtle" />
                  <span className="min-w-0 truncate font-mono text-xs text-fg-muted">{rule.to}</span>
                </div>
              ))}
              <div className="flex min-w-0 items-center gap-2.5 rounded-default border border-dashed border-border px-3 py-2">
                <Icon name="globe" className="text-sm text-fg-subtle" />
                <span className="shrink-0 text-[13px] text-fg-muted">{copy.otherwise}</span>
                <Icon name="arrow-right" className="text-[10px] text-fg-subtle" />
                <span className="min-w-0 truncate font-mono text-xs text-fg-muted">acme.com/spring-launch</span>
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-border-subtle p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-fg-subtle">{copy.clicks}</span>
              <span className="text-xs text-fg-subtle">{copy.last7}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="numeric text-3xl font-semibold tracking-tight text-ink">{copy.total}</span>
              <span className="inline-flex items-center gap-0.5 rounded-pill bg-success-surface px-1.5 py-0.5 text-[11px] font-medium text-success-ink">
                <Icon name="arrow-up" className="text-[9px]" />
                18%
              </span>
            </div>
            <Sparkline data={[22, 30, 26, 38, 34, 48, 44, 58, 52, 66, 61, 74]} height={56} tone="accent" />
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-fg-subtle">{copy.topCountries}</span>
              {countries.map((country) => (
                <div key={country.code} className="flex min-w-0 items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 truncate text-fg-muted">{country.name}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface">
                    <span className="block h-full rounded-pill bg-chart-1" style={{ width: `${country.share}%` }} />
                  </span>
                  <span className="numeric w-8 shrink-0 text-right text-fg-subtle">{country.share}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Feature visuals ──────────────────────────────────────────────────── */

export type TargetingCopy = {
  country: string;
  device: string;
  os: string;
  language: string;
  otherwise: string;
  caption: string;
};

export function TargetingVisual({ copy, countryName }: { copy: TargetingCopy; countryName: string }) {
  const rows: ReadonlyArray<{ conditions: ReadonlyArray<{ label: string; value: string }>; to: string }> = [
    { conditions: [{ label: copy.country, value: countryName }], to: "acme.com/tr" },
    {
      conditions: [
        { label: copy.device, value: "Mobile" },
        { label: copy.os, value: "iOS" },
      ],
      to: "apps.apple.com/app/acme",
    },
    { conditions: [{ label: copy.language, value: "Deutsch" }], to: "acme.com/de" },
  ];

  return (
    <Frame className="flex flex-col justify-center gap-2">
      {rows.map((row, index) => (
        <div
          key={row.to}
          className="flex min-w-0 flex-col gap-2 rounded-default border border-border bg-bg px-3 py-2.5 shadow-xs sm:flex-row sm:items-center"
        >
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="numeric flex size-5 shrink-0 items-center justify-center rounded-xs bg-surface text-[11px] font-medium text-fg-subtle">
              {index + 1}
            </span>
            {row.conditions.map((condition) => (
              <Chip key={condition.label}>
                <span className="text-fg-subtle">{condition.label}</span>
                <span className="text-ink">{condition.value}</span>
              </Chip>
            ))}
          </span>
          <span className="flex min-w-0 items-center gap-2 sm:ml-auto">
            <Icon name="arrow-right" className="text-[10px] text-accent" />
            <span className="min-w-0 truncate font-mono text-xs text-ink">{row.to}</span>
          </span>
        </div>
      ))}
      <div className="flex min-w-0 items-center gap-2 rounded-default border border-dashed border-border-strong px-3 py-2.5">
        <Chip>{copy.otherwise}</Chip>
        <span className="ml-auto flex min-w-0 items-center gap-2">
          <Icon name="arrow-right" className="text-[10px] text-fg-subtle" />
          <span className="min-w-0 truncate font-mono text-xs text-fg-muted">acme.com</span>
        </span>
      </div>
      <p className="m-0 pt-1 text-xs text-fg-subtle">{copy.caption}</p>
    </Frame>
  );
}

export function OpenInAppVisual({
  apps,
  badge,
}: {
  apps: ReadonlyArray<{ icon: IconName; name: string; url: string; label: string }>;
  badge: string;
}) {
  return (
    <Frame className="flex flex-col justify-center gap-2">
      {apps.map((app) => (
        <div
          key={app.name}
          className="flex min-w-0 items-center gap-3 rounded-default border border-border bg-bg px-3 py-2.5 shadow-xs"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-default bg-surface text-ink">
            <Icon name={app.icon} className="text-base" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-medium text-ink">{app.label}</span>
            <span className="truncate font-mono text-[11px] text-fg-subtle">{app.url}</span>
          </span>
          <Badge tone="accent" size="sm" className="hidden sm:inline-flex">
            <Icon name="mobile-screen" className="text-[10px]" />
            {badge}
          </Badge>
        </div>
      ))}
    </Frame>
  );
}

export function QrVisual({
  url,
  caption,
  logoSrc,
  chips,
}: {
  url: string;
  caption: string;
  logoSrc: string;
  chips: readonly string[];
}) {
  let svg = "";
  try {
    // A real, scannable code for the platform site: the logo sits in the
    // middle and the caption band is the "frame" the designer offers.
    svg = buildQrSvg(
      url,
      {
        foreground: "currentColor",
        background: "white",
        cornerColor: null,
        dotStyle: "rounded",
        errorCorrection: "H",
        margin: 2,
        size: 180,
        logoUrl: null,
        logoScale: 0.22,
        caption,
        frame: "none",
        frameText: "",
        frameColor: null,
      },
      { logoHref: logoSrc, size: 180 },
    );
  } catch {
    svg = "";
  }

  return (
    <Frame className="flex flex-col items-center justify-center gap-4">
      <div className="shrink-0 overflow-hidden rounded-md text-inverse shadow-card ring-1 ring-border [&_svg]:block [&_svg]:h-auto [&_svg]:w-40">
        {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <Icon name="qrcode" className="text-7xl" />}
      </div>
      <div className="flex min-w-0 flex-wrap justify-center gap-1.5">
        {chips.map((chip, index) => (
          <Chip key={chip} tone={index === chips.length - 1 ? "accent" : "neutral"}>
            <Icon name="check" className="text-[10px]" />
            {chip}
          </Chip>
        ))}
      </div>
    </Frame>
  );
}

export function BioVisual({
  name,
  role,
  links,
  handle,
}: {
  name: string;
  role: string;
  links: readonly string[];
  handle: string;
}) {
  const socials: IconName[] = ["instagram", "youtube", "tiktok", "linkedin"];
  return (
    <Frame className="flex items-center justify-center py-5">
      <div className="flex w-full max-w-60 flex-col items-center gap-3 rounded-[22px] border border-border bg-bg px-4 pt-6 pb-4 shadow-lift">
        <span className="flex size-14 items-center justify-center rounded-pill bg-accent text-lg font-semibold text-on-accent">
          {name.slice(0, 1)}
        </span>
        <span className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-sm font-semibold text-ink">{name}</span>
          <span className="text-xs text-fg-muted">{role}</span>
        </span>
        <span className="flex gap-2 text-fg-muted">
          {socials.map((icon) => (
            <Icon key={icon} name={icon} className="text-sm" />
          ))}
        </span>
        <span className="flex w-full flex-col gap-1.5">
          {links.map((label) => (
            <span
              key={label}
              className="rounded-default border border-border bg-surface-subtle px-3 py-2 text-center text-xs font-medium text-ink"
            >
              {label}
            </span>
          ))}
        </span>
        <span className="font-mono text-[11px] text-fg-subtle">{handle}</span>
      </div>
    </Frame>
  );
}

export function DomainsVisual({ verified, pending, https }: { verified: string; pending: string; https: string }) {
  const rows = [
    { host: "go.acme.com", ok: true },
    { host: "links.acme.io", ok: true },
    { host: "promo.acme.shop", ok: false },
  ];
  return (
    <Frame className="flex flex-col justify-center gap-2">
      {rows.map((row) => (
        <div
          key={row.host}
          className="flex min-w-0 items-center gap-2.5 rounded-default border border-border bg-bg px-3 py-2.5 shadow-xs"
        >
          <span title={row.ok ? https : undefined} className="flex">
            <Icon name={row.ok ? "lock" : "globe"} className={cn("text-xs", row.ok ? "text-success" : "text-fg-subtle")} />
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink">{row.host}</span>
          {row.ok ? (
            <Badge tone="success" dot size="sm">
              {verified}
            </Badge>
          ) : (
            <Badge tone="warn" dot size="sm">
              {pending}
            </Badge>
          )}
        </div>
      ))}
    </Frame>
  );
}

export function AnalyticsVisual({
  total,
  clicks,
  last7,
  breakdown,
}: {
  total: string;
  clicks: string;
  last7: string;
  breakdown: ReadonlyArray<{ icon: IconName; label: string; share: number }>;
}) {
  return (
    <Frame className="flex flex-col justify-center gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-baseline gap-2">
          <span className="numeric text-2xl font-semibold tracking-tight text-ink">{total}</span>
          <span className="text-xs text-fg-subtle">{clicks}</span>
        </span>
        <span className="text-xs text-fg-subtle">{last7}</span>
      </div>
      <Sparkline data={[8, 12, 10, 15, 13, 19, 17, 23, 21, 26]} height={44} tone="accent" />
      <div className="flex flex-col gap-1.5">
        {breakdown.map((row) => (
          <div key={row.label} className="flex min-w-0 items-center gap-2 text-xs">
            <Icon name={row.icon} className="text-[11px] text-fg-subtle" />
            <span className="w-16 shrink-0 truncate text-fg-muted">{row.label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface">
              <span className="block h-full rounded-pill bg-chart-1" style={{ width: `${row.share}%` }} />
            </span>
            <span className="numeric w-8 shrink-0 text-right text-fg-subtle">{row.share}%</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function ApiVisual({
  apiBase,
  shortHost,
  requestLabel,
  eventLabel,
}: {
  apiBase: string;
  shortHost: string;
  requestLabel: string;
  eventLabel: string;
}) {
  return (
    <div aria-hidden="true" className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0 overflow-hidden rounded-lg border border-on-inverse-border bg-inverse">
        <div className="flex items-center justify-between border-b border-on-inverse-border px-4 py-2">
          <span className="text-[11px] font-medium text-on-inverse-dim">{requestLabel}</span>
          <span className="font-mono text-[11px] text-on-inverse-dim">curl</span>
        </div>
        <pre className="m-0 overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-on-inverse-dim">
          <code>
            <span className="font-semibold text-on-inverse">POST</span> {apiBase}/links{"\n"}
            <span>Authorization: Bearer short_•••</span>
            {"\n\n"}
            {`{\n  "destination": "https://acme.com/launch",\n  "slug": "launch"\n}`}
          </code>
        </pre>
      </div>
      <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-on-inverse-border bg-inverse">
        <div className="flex items-center justify-between border-b border-on-inverse-border px-4 py-2">
          <span className="text-[11px] font-medium text-on-inverse-dim">{eventLabel}</span>
          <span className="font-mono text-[11px] text-on-inverse-dim">webhook</span>
        </div>
        <pre className="m-0 flex-1 overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-on-inverse-dim">
          <code>
            {`{\n  "event": `}
            <span className="font-semibold text-on-inverse">&quot;link.clicked&quot;</span>
            {`,\n  "data": {\n    "hostname": "${shortHost}",\n    "slug": "launch",\n    "country": "TR",\n    "device": "mobile"\n  }\n}`}
          </code>
        </pre>
      </div>
    </div>
  );
}

export function TeamsVisual({
  members,
  workspaces,
}: {
  members: ReadonlyArray<{ initials: string; name: string; role: string }>;
  workspaces: readonly string[];
}) {
  return (
    <Frame className="flex flex-col justify-center gap-3">
      <div className="flex flex-wrap gap-1.5">
        {workspaces.map((workspace, index) => (
          <Chip key={workspace} tone={index === 1 ? "accent" : "neutral"}>
            <Icon name={index === 0 ? "circle-user" : "users"} className="text-[10px]" />
            {workspace}
          </Chip>
        ))}
      </div>
      <div className="flex flex-col divide-y divide-border-subtle rounded-default border border-border bg-bg shadow-xs">
        {members.map((member) => (
          <div key={member.name} className="flex min-w-0 items-center gap-2.5 px-3 py-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-surface text-[11px] font-semibold text-fg-muted">
              {member.initials}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{member.name}</span>
            <span className="shrink-0 text-xs text-fg-subtle">{member.role}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}
