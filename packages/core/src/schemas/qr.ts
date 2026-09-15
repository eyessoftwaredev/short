import { z } from "zod";

export const QR_DOT_STYLES = ["square", "rounded", "dots"] as const;
export type QrDotStyle = (typeof QR_DOT_STYLES)[number];

export const QR_ERROR_LEVELS = ["L", "M", "Q", "H"] as const;
export type QrErrorLevel = (typeof QR_ERROR_LEVELS)[number];

const hexColor = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: "Use a hex color like #0f766e" });

export const qrStyleSchema = z.object({
  foreground: hexColor.default("#171717"),
  background: hexColor.default("#ffffff"),
  /** Finder-pattern (corner) color; falls back to `foreground` when null. */
  cornerColor: hexColor.nullable().default(null),
  dotStyle: z.enum(QR_DOT_STYLES).default("square"),
  /** Higher correction is required when a logo covers the center. */
  errorCorrection: z.enum(QR_ERROR_LEVELS).default("M"),
  margin: z.number().int().min(0).max(8).default(2),
  size: z.number().int().min(128).max(2048).default(512),
  logoUrl: z.string().trim().url().max(2048).nullable().default(null),
  /** Logo width as a fraction of the QR width. */
  logoScale: z.number().min(0.1).max(0.3).default(0.22),
  caption: z.string().trim().max(60).default(""),
});

export type QrStyle = z.infer<typeof qrStyleSchema>;

export const qrInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  linkId: z.string().uuid(),
  style: qrStyleSchema,
});

export type QrInput = z.infer<typeof qrInputSchema>;

export const QR_EXPORT_FORMATS = ["svg", "png", "pdf"] as const;
export type QrExportFormat = (typeof QR_EXPORT_FORMATS)[number];

/** A logo needs error correction H so the covered modules stay recoverable. */
export function recommendedErrorLevel(style: QrStyle): QrErrorLevel {
  return style.logoUrl ? "H" : style.errorCorrection;
}
