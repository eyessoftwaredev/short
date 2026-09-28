import {
  QR_DOT_STYLES,
  QR_ERROR_LEVELS,
  QR_PAYLOAD_KINDS,
  qrInputSchema,
  safeDestinationSchema,
  type QrInput,
  type QrPayloadKind,
  type QrStyle,
} from "@short/core";
import { z } from "zod";
import { parseWithQrLogoPreset } from "./qr-logo-presets";

const hexColor = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "hexColor");

/** Flat, form-friendly mirror of `qrInputSchema`; `toQrInput` bridges the two. */
export const qrFormSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(120),
  payloadKind: z.enum(QR_PAYLOAD_KINDS),
  linkId: z.string(),
  payloadUrl: z.string().trim().max(2048),
  vcardName: z.string().trim().max(120),
  vcardOrg: z.string().trim().max(120),
  vcardPhone: z.string().trim().max(40),
  vcardEmail: z.string().trim().max(254),
  vcardUrl: z.string().trim().max(2048),
  wifiSsid: z.string().trim().max(64),
  wifiPassword: z.string().max(128),
  wifiSecurity: z.enum(["WPA", "WEP", "nopass"]),
  wifiHidden: z.boolean(),
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
})
  // Kind-specific requirements, on the form's own field names so errors land inline.
  .superRefine((values, ctx) => {
    if (values.payloadKind === "link" && values.linkId === "") {
      ctx.addIssue({ code: "custom", message: "linkRequired", path: ["linkId"] });
    }
    if (values.payloadKind === "url" && !safeDestinationSchema.safeParse(values.payloadUrl).success) {
      ctx.addIssue({ code: "custom", message: "payloadUrl", path: ["payloadUrl"] });
    }
    if (values.payloadKind === "vcard") {
      if (values.vcardName === "") {
        ctx.addIssue({ code: "custom", message: "vcardName", path: ["vcardName"] });
      }
      if (values.vcardEmail !== "" && !z.email().safeParse(values.vcardEmail).success) {
        ctx.addIssue({ code: "custom", message: "vcardEmail", path: ["vcardEmail"] });
      }
    }
    if (values.payloadKind === "wifi" && values.wifiSsid === "") {
      ctx.addIssue({ code: "custom", message: "wifiSsid", path: ["wifiSsid"] });
    }
  });

export type QrFormValues = z.infer<typeof qrFormSchema>;

export const emptyQrForm = (linkId: string): QrFormValues => ({
  name: "",
  payloadKind: "link",
  linkId,
  payloadUrl: "",
  vcardName: "",
  vcardOrg: "",
  vcardPhone: "",
  vcardEmail: "",
  vcardUrl: "",
  wifiSsid: "",
  wifiPassword: "",
  wifiSecurity: "WPA",
  wifiHidden: false,
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

export function styleToFormPatch(style: QrStyle): Partial<QrFormValues> {
  return {
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

export function applyQrStyleToForm(
  setValue: (
    name: keyof QrFormValues,
    value: QrFormValues[keyof QrFormValues],
    options?: { shouldDirty?: boolean },
  ) => void,
  style: QrStyle,
): void {
  const patch = styleToFormPatch(style);
  for (const [key, value] of Object.entries(patch) as [keyof QrFormValues, QrFormValues[keyof QrFormValues]][]) {
    setValue(key, value, { shouldDirty: true });
  }
}

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

/** A line break inside a value would start a new vCard property (e.g. a forged URL:). */
function vcardValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ");
}

function encodeVcard(values: QrFormValues): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${vcardValue(values.vcardName)}`,
    values.vcardOrg ? `ORG:${vcardValue(values.vcardOrg)}` : "",
    values.vcardPhone ? `TEL:${vcardValue(values.vcardPhone)}` : "",
    values.vcardEmail ? `EMAIL:${vcardValue(values.vcardEmail)}` : "",
    values.vcardUrl ? `URL:${vcardValue(values.vcardUrl)}` : "",
    "END:VCARD",
  ];
  return lines.filter((line) => line !== "").join("\n");
}

function encodeWifi(values: QrFormValues): string {
  const escape = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");
  return `WIFI:T:${values.wifiSecurity};S:${escape(values.wifiSsid)};P:${escape(values.wifiPassword)};H:${values.wifiHidden ? "true" : "false"};;`;
}

function payloadForKind(values: QrFormValues): string | null {
  if (values.payloadKind === "url") {
    // Normalized (scheme added) and restricted to http(s): no javascript:/data: payloads.
    return safeDestinationSchema.parse(values.payloadUrl);
  }
  if (values.payloadKind === "vcard") {
    return encodeVcard(values);
  }
  if (values.payloadKind === "wifi") {
    return encodeWifi(values);
  }
  return null;
}

/** Live-preview payload for the non-link kinds; tolerates half-filled fields. */
export function previewQrPayload(values: QrFormValues): string {
  if (values.payloadKind === "url") {
    const parsed = safeDestinationSchema.safeParse(values.payloadUrl);
    return parsed.success ? parsed.data : values.payloadUrl;
  }
  return payloadForKind(values) ?? "";
}

export function toQrInput(raw: QrFormValues): QrInput {
  // Server actions receive whatever the client sent, so the form schema runs here too.
  const values = qrFormSchema.parse(raw);
  const style = toQrStyle(values);
  return parseWithQrLogoPreset(style.logoUrl, (logoUrl) =>
    qrInputSchema.parse({
      name: values.name,
      payloadKind: values.payloadKind,
      linkId: values.payloadKind === "link" ? values.linkId : null,
      payload: payloadForKind(values),
      style: { ...style, logoUrl },
    }),
  );
}

export function toQrForm(
  name: string,
  linkId: string,
  style: QrStyle,
  extras?: { payloadKind?: QrPayloadKind; payload?: string | null },
): QrFormValues {
  const kind = extras?.payloadKind ?? "link";
  const payload = extras?.payload ?? "";
  const wifi = kind === "wifi" ? parseWifi(payload) : null;
  const vcard = kind === "vcard" ? parseVcard(payload) : null;

  return {
    ...emptyQrForm(linkId),
    name,
    payloadKind: kind,
    linkId,
    payloadUrl: kind === "url" ? payload : "",
    vcardName: vcard?.name ?? "",
    vcardOrg: vcard?.org ?? "",
    vcardPhone: vcard?.phone ?? "",
    vcardEmail: vcard?.email ?? "",
    vcardUrl: vcard?.url ?? "",
    wifiSsid: wifi?.ssid ?? "",
    wifiPassword: wifi?.password ?? "",
    wifiSecurity: wifi?.security ?? "WPA",
    wifiHidden: wifi?.hidden ?? false,
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

function parseWifi(payload: string): {
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass";
  hidden: boolean;
} | null {
  // SSID and password are backslash-escaped by `encodeWifi`, so `;` can appear inside them.
  const match =
    /^WIFI:T:([^;]*);S:((?:\\.|[^;\\])*);P:((?:\\.|[^;\\])*);H:([^;]*);;$/i.exec(payload);
  if (!match) {
    return null;
  }
  const unescape = (value: string) => value.replace(/\\(.)/g, "$1");
  const security = match[1] === "WEP" || match[1] === "nopass" ? match[1] : "WPA";
  return {
    security,
    ssid: unescape(match[2] ?? ""),
    password: unescape(match[3] ?? ""),
    hidden: match[4] === "true",
  };
}

function parseVcard(payload: string): {
  name: string;
  org: string;
  phone: string;
  email: string;
  url: string;
} {
  const field = (key: string) => {
    const line = payload.split(/\r?\n/).find((entry) => entry.startsWith(`${key}:`));
    return line ? line.slice(key.length + 1) : "";
  };
  return {
    name: field("FN"),
    org: field("ORG"),
    phone: field("TEL"),
    email: field("EMAIL"),
    url: field("URL"),
  };
}
