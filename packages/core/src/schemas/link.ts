import { z } from "zod";
import { LINK_HEALTH_STATUSES } from "../link-health";
import { LINK_OPEN_MODES } from "../open-mode";
import { SLUG_PATTERN, isReservedSlug } from "../slug";
import { abVariantSchema, safeDestinationSchema, targetRuleSchema } from "../targeting";

export const destinationSchema = safeDestinationSchema;

export const slugSchema = z
  .string()
  .trim()
  .regex(SLUG_PATTERN, { message: "slugPattern" })
  .refine((slug) => !isReservedSlug(slug), { message: "slugReserved" });

/** Upper bound for a link's click limit; anything larger is effectively unlimited. */
export const MAX_CLICKS_LIMIT = 1_000_000_000;

export const utmSchema = z.object({
  utm_source: z.string().trim().max(255).optional(),
  utm_medium: z.string().trim().max(255).optional(),
  utm_campaign: z.string().trim().max(255).optional(),
  utm_term: z.string().trim().max(255).optional(),
  utm_content: z.string().trim().max(255).optional(),
});

export const linkInputSchema = z
  .object({
    domainId: z.string().uuid(),
    slug: slugSchema.optional(),
    destination: destinationSchema,
    title: z.string().trim().max(255).optional(),
    description: z.string().trim().max(1024).optional(),
    image: z
      .string()
      .trim()
      .max(2048)
      .refine((value) => value === "" || /^\/api\/media\/[0-9a-f-]{36}$/i.test(value), {
        message: "mediaPath",
      })
      .optional(),
    comments: z.string().trim().max(2048).optional(),
    folderId: z.string().uuid().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(48)).max(20).default([]),
    // Scheduled go-live; may lie in the past so a link that already started stays
    // editable. Omitted on an update keeps the stored value, null clears it.
    startsAt: z.coerce.date().nullable().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    expiredDestination: destinationSchema.nullable().optional(),
    // Every gate attempt costs the edge 100k PBKDF2 rounds, so short passwords are both
    // guessable and a cheap way to burn worker CPU.
    password: z.string().min(8).max(128).nullable().optional(),
    iosDestination: destinationSchema.nullable().optional(),
    androidDestination: destinationSchema.nullable().optional(),
    cloaked: z.boolean().default(false),
    noIndex: z.boolean().default(true),
    forwardQuery: z.boolean().default(false),
    // Optional rather than defaulted: an update that omits it keeps the stored mode
    // (same convention as `password`); a create without it stores `auto`.
    openMode: z.enum(LINK_OPEN_MODES).optional(),
    // Lifetime click cap (bots excluded, QR scans included). Omitted on an update keeps
    // the stored value, null removes the cap. Enforced by the panel's click-limit cron,
    // so a busy link can overshoot by up to one cron interval.
    maxClicks: z.number().int().min(1).max(MAX_CLICKS_LIMIT).nullable().optional(),
    archived: z.boolean().default(false),
    utm: utmSchema.nullable().default(null),
    rules: z.array(targetRuleSchema).max(50).default([]),
    abVariants: z.array(abVariantSchema).max(10).default([]),
  })
  .refine((value) => value.abVariants.length !== 1, {
    message: "An A/B test needs at least two variants",
    path: ["abVariants"],
  })
  .refine(
    (value) => value.expiresAt == null || value.expiresAt.getTime() > Date.now(),
    { message: "Expiry must be in the future", path: ["expiresAt"] },
  )
  .refine(
    (value) =>
      value.startsAt == null ||
      value.expiresAt == null ||
      value.startsAt.getTime() < value.expiresAt.getTime(),
    { message: "startBeforeExpiry", path: ["startsAt"] },
  );

export type LinkInput = z.infer<typeof linkInputSchema>;

export const linkListQuerySchema = z.object({
  search: z.string().trim().max(255).optional(),
  domainId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  tag: z.string().trim().max(48).optional(),
  status: z.enum(["all", "active", "archived", "expired", "scheduled"]).default("all"),
  /** Destination health from the link-health monitor, e.g. `broken`. */
  health: z.enum(LINK_HEALTH_STATUSES).optional(),
  /** `set`: links with a click limit; `reached`: links that used it up. */
  clickLimit: z.enum(["set", "reached"]).optional(),
  sort: z.enum(["created_desc", "created_asc", "clicks_desc", "slug_asc"]).default("created_desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export type LinkListQuery = z.infer<typeof linkListQuerySchema>;
