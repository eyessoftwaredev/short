import type { BioBlockType } from "@short/core";
import type { IconName } from "@/components/kit/icon";

/**
 * Icon per block type. Plain module (no "use client") so server pages such as the
 * stats screen can read it too.
 */
export const BLOCK_ICONS: Record<BioBlockType, IconName> = {
  link: "link",
  social: "share-nodes",
  header: "tag",
  text: "file-lines",
  image: "image",
  embed: "youtube",
  form: "envelope",
  divider: "minus",
};

/** Most-used first: a first-time user should see "Link button" before "Divider". */
export const BLOCK_ORDER: BioBlockType[] = [
  "link",
  "social",
  "header",
  "text",
  "image",
  "embed",
  "form",
  "divider",
];
