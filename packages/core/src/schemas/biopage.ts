import { z } from "zod";
import {
  BIOPAGE_BG_TYPES,
  BIOPAGE_FONTS,
  BIOPAGE_LINK_ICONS,
  BIOPAGE_PROFILE_MODES,
  BIOPAGE_TEMPLATES,
  isHexColor,
} from "../bio-chrome";
import { SLUG_PATTERN, isReservedSlug } from "../slug";
import { destinationSchema } from "./link";
import { mediaPathSchema } from "./qr";

export const BIOPAGE_THEMES = [
  "minimal",
  "midnight",
  "sunset",
  "forest",
  "mono",
  "candy",
] as const;
export type BiopageTheme = (typeof BIOPAGE_THEMES)[number];

export const BIOPAGE_BUTTON_STYLES = ["solid", "outline", "soft", "pill"] as const;

export const SOCIAL_PLATFORMS = [
  "x",
  "instagram",
  "youtube",
  "tiktok",
  "linkedin",
  "github",
  "facebook",
  "whatsapp",
  "telegram",
  "email",
  "website",
] as const;

const hexColorSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  })
  .refine((value) => value === null || isHexColor(value), { message: "hexColor" });

const optionalHrefSchema = z
  .union([destinationSchema, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalDateSchema = z
  .union([z.coerce.date(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value instanceof Date ? value : null));

/**
 * Block fields are required rather than defaulted: the builder binds these schemas
 * through `zodResolver`, which needs the parsed input and output shapes to match.
 * `newBlock()` supplies every field on create. `parseStoredBioBlock()` fills additive
 * fields so stored JSON from older pages still parses.
 */
const baseBlock = {
  id: z.string().min(1),
  position: z.number().int().min(0),
  visible: z.boolean(),
};

export const bioLinkBlockSchema = z.object({
  ...baseBlock,
  type: z.literal("link"),
  label: z.string().trim().min(1).max(120),
  destination: destinationSchema,
  iconUrl: mediaPathSchema.nullable(),
  highlighted: z.boolean(),
  iconName: z.enum(BIOPAGE_LINK_ICONS).nullable(),
  newTab: z.boolean(),
});

export const bioSocialBlockSchema = z.object({
  ...baseBlock,
  type: z.literal("social"),
  items: z
    .array(
      z.object({
        platform: z.enum(SOCIAL_PLATFORMS),
        url: z.string().trim().min(1).max(2048),
      }),
    )
    .min(1)
    .max(12),
});

export const bioTextBlockSchema = z.object({
  ...baseBlock,
  type: z.literal("text"),
  body: z.string().trim().max(2000),
  align: z.enum(["left", "center"]),
});

export const bioHeaderBlockSchema = z.object({
  ...baseBlock,
  type: z.literal("header"),
  text: z.string().trim().min(1).max(120),
});

export const bioImageBlockSchema = z.object({
  ...baseBlock,
  type: z.literal("image"),
  url: mediaPathSchema,
  alt: z.string().trim().max(255),
  href: destinationSchema.nullable(),
});

export const bioEmbedBlockSchema = z.object({
  ...baseBlock,
  type: z.literal("embed"),
  provider: z.enum(["youtube", "spotify", "vimeo"]),
  url: z.string().trim().url().max(2048),
});

export const bioDividerBlockSchema = z.object({
  ...baseBlock,
  type: z.literal("divider"),
});

export const bioFormBlockSchema = z.object({
  ...baseBlock,
  type: z.literal("form"),
  mode: z.enum(["email", "whatsapp"]),
  title: z.string().trim().max(120),
  buttonLabel: z.string().trim().min(1).max(40),
  whatsappNumber: z.string().trim().max(20).nullable(),
  successMessage: z.string().trim().max(200),
}).superRefine((block, ctx) => {
  if (block.mode !== "whatsapp") {
    return;
  }
  if (!/^\+?[1-9]\d{6,14}$/.test(block.whatsappNumber ?? "")) {
    ctx.addIssue({ code: "custom", message: "whatsappNumber", path: ["whatsappNumber"] });
  }
});

export const bioBlockSchema = z.discriminatedUnion("type", [
  bioLinkBlockSchema,
  bioSocialBlockSchema,
  bioTextBlockSchema,
  bioHeaderBlockSchema,
  bioImageBlockSchema,
  bioEmbedBlockSchema,
  bioDividerBlockSchema,
  bioFormBlockSchema,
]);

export type BioBlock = z.infer<typeof bioBlockSchema>;
export type BioBlockType = BioBlock["type"];

/** Fills additive fields so stored JSON from older pages still parses. */
export function parseStoredBioBlock(value: unknown): BioBlock | null {
  const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const normalized =
    record.type === "link"
      ? { ...record, iconName: record.iconName ?? null, newTab: record.newTab ?? true }
      : record.type === "form"
        ? {
            ...record,
            whatsappNumber: record.whatsappNumber ?? null,
            successMessage: record.successMessage ?? "",
          }
        : record;
  const parsed = bioBlockSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_PATTERN, { message: "handlePattern" })
  .refine((handle) => !isReservedSlug(handle), { message: "handleReserved" });

export const biopageInputSchema = z.object({
  handle: handleSchema,
  domainId: z.string().uuid().nullable().default(null),
  displayName: z.string().trim().min(1).max(80),
  bio: z.string().trim().max(500).default(""),
  avatarUrl: mediaPathSchema.nullable().default(null),
  theme: z.enum(BIOPAGE_THEMES).default("minimal"),
  buttonStyle: z.enum(BIOPAGE_BUTTON_STYLES).default("solid"),
  templateId: z.enum(BIOPAGE_TEMPLATES).nullable().optional().default(null),
  bgType: z.enum(BIOPAGE_BG_TYPES).optional().default("theme"),
  bgColor: hexColorSchema.optional().default(null),
  bgGradient: z.string().trim().max(400).nullable().optional().default(null),
  bgImageUrl: mediaPathSchema.nullable().optional().default(null),
  buttonColor: hexColorSchema.optional().default(null),
  buttonTextColor: hexColorSchema.optional().default(null),
  textColor: hexColorSchema.optional().default(null),
  fontFamily: z.enum(BIOPAGE_FONTS).optional().default("sans"),
  profileMode: z.enum(BIOPAGE_PROFILE_MODES).optional().default("photo"),
  logoUrl: mediaPathSchema.nullable().optional().default(null),
  profileText: z.string().trim().max(40).optional().default(""),
  coverUrl: mediaPathSchema.nullable().optional().default(null),
  ogImageUrl: mediaPathSchema.nullable().optional().default(null),
  adsEnabled: z.boolean().optional().default(false),
  adMobileImage: mediaPathSchema.nullable().optional().default(null),
  adMobileHref: optionalHrefSchema,
  adLeftImage: mediaPathSchema.nullable().optional().default(null),
  adLeftHref: optionalHrefSchema,
  adRightImage: mediaPathSchema.nullable().optional().default(null),
  adRightHref: optionalHrefSchema,
  customCss: z.string().max(4000).optional().default(""),
  sensitive: z.boolean().optional().default(false),
  password: z.string().min(8).max(128).nullable().optional().default(null),
  removePassword: z.boolean().optional().default(false),
  publishAt: optionalDateSchema,
  unpublishAt: optionalDateSchema,
  seoTitle: z.string().trim().max(120).default(""),
  seoDescription: z.string().trim().max(300).default(""),
  published: z.boolean().default(false),
  blocks: z.array(bioBlockSchema).max(100).default([]),
});

export type BiopageInput = z.infer<typeof biopageInputSchema>;
