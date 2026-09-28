/**
 * Destination health, checked by the panel's link-health cron. Pure state logic lives
 * here so it is unit tested; the HTTP probing itself is Node-only and lives in the panel.
 */
export const LINK_HEALTH_STATUSES = ["unknown", "ok", "broken"] as const;
export type LinkHealthStatus = (typeof LINK_HEALTH_STATUSES)[number];

/** A single failed probe is often a blip (deploy, rate limit); two in a row is a pattern. */
export const HEALTH_FAILURES_TO_BREAK = 2;

export type HealthProbeOutcome = "ok" | "broken" | "inconclusive";

export type HealthProbe = {
  /** `inconclusive` (e.g. the host resolves to a private address) leaves the state alone. */
  outcome: HealthProbeOutcome;
  /** Final HTTP status, null when no response arrived (DNS failure, timeout, refused). */
  statusCode: number | null;
  /** Short machine-readable cause for a failure: `dns`, `timeout`, `http_404`, ... */
  reason: string | null;
};

/**
 * 2xx/3xx answer, and so does any other 4xx (401, 403, 405, 429 ...): the server is up
 * and deliberately refusing an anonymous robot. Only "gone" and server errors count.
 */
export function classifyHealthStatus(status: number): Exclude<HealthProbeOutcome, "inconclusive"> {
  if (status === 404 || status === 410 || (status >= 500 && status <= 599)) {
    return "broken";
  }
  return "ok";
}

export type LinkHealthState = {
  status: LinkHealthStatus;
  failures: number;
  statusCode: number | null;
  brokenSince: Date | null;
};

export type LinkHealthTransition = LinkHealthState & {
  /** The link just crossed into `broken` (webhook + email worthy). */
  becameBroken: boolean;
  /** The link was `broken` and now answers again. */
  recovered: boolean;
};

export function nextHealthState(
  previous: LinkHealthState,
  probe: HealthProbe,
  now: Date,
): LinkHealthTransition {
  if (probe.outcome === "inconclusive") {
    return { ...previous, becameBroken: false, recovered: false };
  }

  if (probe.outcome === "ok") {
    return {
      status: "ok",
      failures: 0,
      statusCode: probe.statusCode,
      brokenSince: null,
      becameBroken: false,
      recovered: previous.status === "broken",
    };
  }

  const failures = Math.min(previous.failures + 1, 1000);
  if (failures < HEALTH_FAILURES_TO_BREAK) {
    // First strike: remember it, but keep showing whatever the link was before.
    return {
      status: previous.status,
      failures,
      statusCode: probe.statusCode,
      brokenSince: previous.brokenSince,
      becameBroken: false,
      recovered: false,
    };
  }

  return {
    status: "broken",
    failures,
    statusCode: probe.statusCode,
    brokenSince: previous.brokenSince ?? now,
    becameBroken: previous.status !== "broken",
    recovered: false,
  };
}
