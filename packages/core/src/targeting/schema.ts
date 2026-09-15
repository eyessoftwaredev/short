import { z } from "zod";
import { BROWSER_NAMES, DEVICE_TYPES, OS_NAMES } from "../ua";
import { isSafeDestination, normalizeDestination } from "../url";

/**
 * Zod's `url()` accepts anything the URL constructor can parse, which includes
 * `javascript:` and `data:`. Every value that can reach a `Location` header or a cloak
 * iframe must go through this instead, so the scheme allowlist is enforced on write.
 */
export const safeDestinationSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .transform(normalizeDestination)
  .refine(isSafeDestination, { message: "Only absolute http(s) URLs are allowed" });

export const setOperatorSchema = z.enum(["in", "not_in"]);
export type SetOperator = z.infer<typeof setOperatorSchema>;

export const geoConditionSchema = z.object({
  type: z.enum(["country", "continent", "region"]),
  op: setOperatorSchema,
  values: z.array(z.string().min(1).max(64)).min(1).max(250),
});

export const deviceConditionSchema = z.object({
  type: z.literal("device"),
  op: setOperatorSchema,
  values: z.array(z.enum(DEVICE_TYPES)).min(1),
});

export const clientConditionSchema = z.object({
  type: z.enum(["os", "browser", "language"]),
  op: setOperatorSchema,
  values: z.array(z.string().min(1).max(32)).min(1).max(64),
});

export const referrerConditionSchema = z.object({
  type: z.literal("referrer"),
  op: z.enum(["contains", "equals", "empty", "not_empty"]),
  value: z.string().max(512).optional(),
});

/** `from`/`to` are HH:mm in `timezone`; `days` uses 0=Sunday..6=Saturday. */
export const scheduleConditionSchema = z.object({
  type: z.literal("schedule"),
  timezone: z.string().min(1).max(64),
  from: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  to: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});

export const conditionSchema = z.union([
  geoConditionSchema,
  deviceConditionSchema,
  clientConditionSchema,
  referrerConditionSchema,
  scheduleConditionSchema,
]);

export type Condition = z.infer<typeof conditionSchema>;

export const targetRuleSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int().min(0).max(999),
  /** All conditions must match (AND). Use separate rules for OR semantics. */
  conditions: z.array(conditionSchema).min(1).max(20),
  destination: safeDestinationSchema,
});

export type TargetRule = z.infer<typeof targetRuleSchema>;

export const abVariantSchema = z.object({
  id: z.string().min(1),
  destination: safeDestinationSchema,
  weight: z.number().int().min(0).max(100),
});

export type AbVariant = z.infer<typeof abVariantSchema>;

export const OS_VALUES = OS_NAMES;
export const BROWSER_VALUES = BROWSER_NAMES;
export const DEVICE_VALUES = DEVICE_TYPES;
