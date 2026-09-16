import { z } from "zod";
import { SLUG_PATTERN, isReservedSlug } from "../slug";
import { destinationSchema } from "./link";

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

/**
 * Block fields are deliberately required rather than defaulted: the builder binds these
 * schemas directly through `zodResolver`, which needs the parsed input and output shapes
 * to match. `newBlock()` in the panel supplies every field when a block is created.
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
  iconUrl: z.string().trim().url().max(2048).nullable(),
  highlighted: z.boolean(),
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
  url: z.string().trim().url().max(2048),
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

export const bioBlockSchema = z.discriminatedUnion("type", [
  bioLinkBlockSchema,
  bioSocialBlockSchema,
  bioTextBlockSchema,
  bioHeaderBlockSchema,
  bioImageBlockSchema,
  bioEmbedBlockSchema,
  bioDividerBlockSchema,
]);

export type BioBlock = z.infer<typeof bioBlockSchema>;
export type BioBlockType = BioBlock["type"];

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
  avatarUrl: z.string().trim().url().max(2048).nullable().default(null),
  theme: z.enum(BIOPAGE_THEMES).default("minimal"),
  buttonStyle: z.enum(BIOPAGE_BUTTON_STYLES).default("solid"),
  seoTitle: z.string().trim().max(120).default(""),
  seoDescription: z.string().trim().max(300).default(""),
  published: z.boolean().default(false),
  blocks: z.array(bioBlockSchema).max(100).default([]),
});

export type BiopageInput = z.infer<typeof biopageInputSchema>;
