import { z } from "zod";
import { SLUG_PATTERN, isReservedSlug } from "../slug";
import { abVariantSchema, safeDestinationSchema, targetRuleSchema } from "../targeting";

export const destinationSchema = safeDestinationSchema;

export const slugSchema = z
  .string()
  .trim()
  .regex(SLUG_PATTERN, { message: "slugPattern" })
  .refine((slug) => !isReservedSlug(slug), { message: "slugReserved" });

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
    image: destinationSchema.optional().or(z.literal("")),
    comments: z.string().trim().max(2048).optional(),
    folderId: z.string().uuid().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(48)).max(20).default([]),
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
  );

export type LinkInput = z.infer<typeof linkInputSchema>;

export const linkListQuerySchema = z.object({
  search: z.string().trim().max(255).optional(),
  domainId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
  tag: z.string().trim().max(48).optional(),
  status: z.enum(["all", "active", "archived", "expired"]).default("all"),
  sort: z.enum(["created_desc", "created_asc", "clicks_desc", "slug_asc"]).default("created_desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export type LinkListQuery = z.infer<typeof linkListQuerySchema>;
