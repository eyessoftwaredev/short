import {
  QR_DOT_STYLES,
  QR_ERROR_LEVELS,
  qrInputSchema,
  type QrInput,
  type QrStyle,
} from "@short/core";
import { z } from "zod";

const hexColor = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "hexColor");

/** Flat, form-friendly mirror of `qrInputSchema`; `toQrInput` bridges the two. */
export const qrFormSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(120),
  linkId: z.string().min(1, "linkRequired"),
  foreground: hexColor,
  background: hexColor,
  useCustomCorners: z.boolean(),
  cornerColor: hexColor,
  dotStyle: z.enum(QR_DOT_STYLES),
  errorCorrection: z.enum(QR_ERROR_LEVELS),
  margin: z.number().int().min(0).max(8),
  size: z.number().int().min(128).max(2048),
  logoUrl: z.string().trim().max(2048),
  logoScale: z.number().min(0.1).max(0.3),
  caption: z.string().trim().max(60),
});

export type QrFormValues = z.infer<typeof qrFormSchema>;

export const emptyQrForm = (linkId: string): QrFormValues => ({
  name: "",
  linkId,
  foreground: "#171717",
  background: "#ffffff",
  useCustomCorners: false,
  cornerColor: "#0f766e",
  dotStyle: "rounded",
  errorCorrection: "M",
  margin: 2,
  size: 512,
  logoUrl: "",
  logoScale: 0.22,
  caption: "",
});

export function toQrStyle(values: QrFormValues): QrStyle {
  return {
    foreground: values.foreground,
    background: values.background,
    cornerColor: values.useCustomCorners ? values.cornerColor : null,
    dotStyle: values.dotStyle,
    errorCorrection: values.errorCorrection,
    margin: values.margin,
    size: values.size,
    logoUrl: values.logoUrl === "" ? null : values.logoUrl,
    logoScale: values.logoScale,
    caption: values.caption,
  };
}

export function toQrInput(values: QrFormValues): QrInput {
  return qrInputSchema.parse({
    name: values.name,
    linkId: values.linkId,
    style: toQrStyle(values),
  });
}

export function toQrForm(name: string, linkId: string, style: QrStyle): QrFormValues {
  return {
    name,
    linkId,
    foreground: style.foreground,
    background: style.background,
    useCustomCorners: style.cornerColor != null,
    cornerColor: style.cornerColor ?? "#0f766e",
    dotStyle: style.dotStyle,
    errorCorrection: style.errorCorrection,
    margin: style.margin,
    size: style.size,
    logoUrl: style.logoUrl ?? "",
    logoScale: style.logoScale,
    caption: style.caption,
  };
}
