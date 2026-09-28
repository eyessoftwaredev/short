import type { QrPayloadKind } from "@short/core";
import type { IconName } from "@/components/kit/icon";

/** One glyph per content type, shared by the list cards and the designer's type picker. */
export const QR_KIND_ICONS: Record<QrPayloadKind, IconName> = {
  link: "link",
  url: "globe",
  vcard: "address-card",
  wifi: "wifi",
};
