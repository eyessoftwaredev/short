import { hashToUnitInterval, pickWeightedIndex } from "../hash";
import type { BrowserName, DeviceType, OsName } from "../ua";
import type { AbVariant, Condition, SetOperator, TargetRule } from "./schema";

export type VisitorContext = {
  /** ISO 3166-1 alpha-2, uppercase. */
  country: string;
  /** Two-letter continent code as supplied by Cloudflare (EU, NA, AS...). */
  continent: string;
  region: string;
  city: string;
  device: DeviceType;
  os: OsName;
  browser: BrowserName;
  /** Primary Accept-Language subtag, lowercase. */
  language: string;
  referrer: string;
  now: Date;
};

export type ResolutionSource = "rule" | "ab" | "default" | "expired";

export type Resolution = {
  destination: string;
  source: ResolutionSource;
  ruleId: string | null;
  variantId: string | null;
};

function matchesSet(op: SetOperator, values: readonly string[], actual: string): boolean {
  const normalized = actual.toLowerCase();
  const hit = values.some((value) => value.toLowerCase() === normalized);
  return op === "not_in" ? !hit : hit;
}

/** Wall-clock weekday and minute-of-day for `at` rendered in `timeZone`. */
function zonedParts(at: Date, timeZone: string): { day: number; minutes: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(at);
  const lookup = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const hour = Number.parseInt(lookup("hour"), 10);
  const minute = Number.parseInt(lookup("minute"), 10);

  return {
    day: weekdayIndex[lookup("weekday")] ?? 0,
    // Intl renders midnight as "24" in some ICU builds with hour12: false.
    minutes: ((Number.isNaN(hour) ? 0 : hour % 24) * 60) + (Number.isNaN(minute) ? 0 : minute),
  };
}

function toMinutes(hhmm: string): number {
  const [hour = "0", minute = "0"] = hhmm.split(":");
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10);
}

function referrerHost(referrer: string): string {
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function matchesCondition(condition: Condition, ctx: VisitorContext): boolean {
  switch (condition.type) {
    case "country":
      return matchesSet(condition.op, condition.values, ctx.country);
    case "continent":
      return matchesSet(condition.op, condition.values, ctx.continent);
    case "region":
      return matchesSet(condition.op, condition.values, ctx.region);
    case "device":
      return matchesSet(condition.op, condition.values, ctx.device);
    case "os":
      return matchesSet(condition.op, condition.values, ctx.os);
    case "browser":
      return matchesSet(condition.op, condition.values, ctx.browser);
    case "language":
      return matchesSet(condition.op, condition.values, ctx.language);
    case "referrer": {
      if (condition.op === "empty") {
        return ctx.referrer === "";
      }
      if (condition.op === "not_empty") {
        return ctx.referrer !== "";
      }
      const needle = (condition.value ?? "").toLowerCase();
      if (needle === "") {
        return false;
      }
      if (condition.op === "equals") {
        return referrerHost(ctx.referrer) === needle.replace(/^https?:\/\//, "").replace(/\/$/, "");
      }
      return ctx.referrer.toLowerCase().includes(needle);
    }
    case "schedule": {
      let zoned: { day: number; minutes: number };
      try {
        zoned = zonedParts(ctx.now, condition.timezone);
      } catch {
        // An invalid IANA zone must not take the whole redirect down.
        return false;
      }
      if (!condition.days.includes(zoned.day)) {
        return false;
      }
      const from = toMinutes(condition.from);
      const to = toMinutes(condition.to);
      // A window whose end is before its start wraps past midnight.
      return from <= to
        ? zoned.minutes >= from && zoned.minutes <= to
        : zoned.minutes >= from || zoned.minutes <= to;
    }
    default: {
      const exhaustive: never = condition;
      return exhaustive;
    }
  }
}

export function matchesRule(rule: TargetRule, ctx: VisitorContext): boolean {
  return rule.conditions.every((condition) => matchesCondition(condition, ctx));
}

export type ResolveInput = {
  defaultDestination: string;
  rules?: TargetRule[];
  abVariants?: AbVariant[];
  /** Stable per-visitor key so a given visitor always sees the same A/B variant. */
  abSeed?: string;
  expiresAt?: number | null;
  expiredDestination?: string | null;
};

/**
 * Resolves the destination for one visit. Rules win over A/B splits, which win over
 * the default destination. Rules are evaluated by ascending `priority`, first match wins.
 */
export function resolveDestination(input: ResolveInput, ctx: VisitorContext): Resolution {
  if (input.expiresAt != null && ctx.now.getTime() >= input.expiresAt) {
    return {
      destination: input.expiredDestination ?? input.defaultDestination,
      source: "expired",
      ruleId: null,
      variantId: null,
    };
  }

  const rules = [...(input.rules ?? [])].sort((a, b) => a.priority - b.priority);
  for (const rule of rules) {
    if (matchesRule(rule, ctx)) {
      return { destination: rule.destination, source: "rule", ruleId: rule.id, variantId: null };
    }
  }

  const variants = input.abVariants ?? [];
  if (variants.length > 1) {
    const unit = hashToUnitInterval(input.abSeed ?? "");
    const index = pickWeightedIndex(
      variants.map((variant) => variant.weight),
      unit,
    );
    const variant = variants[index];
    if (variant) {
      return { destination: variant.destination, source: "ab", ruleId: null, variantId: variant.id };
    }
  }

  return {
    destination: input.defaultDestination,
    source: "default",
    ruleId: null,
    variantId: null,
  };
}
