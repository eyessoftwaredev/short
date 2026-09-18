import {
  BIOPAGE_BUTTON_STYLES,
  BIOPAGE_FONTS,
  BIOPAGE_THEMES,
  bioBlockSchema,
  biopageInputSchema,
  handleSchema,
  scheduleInstant,
  type BioBlock,
  type BioBlockType,
  type BiopageInput,
} from "@short/core";
import { z } from "zod";

export const bioFormSchema = z.object({
  handle: handleSchema,
  domainId: z.string(),
  displayName: z.string().trim().min(1, "displayNameRequired").max(80),
  bio: z.string().trim().max(500),
  avatarUrl: z.string().trim().max(2048),
  theme: z.enum(BIOPAGE_THEMES),
  buttonStyle: z.enum(BIOPAGE_BUTTON_STYLES),
  templateId: z.string().nullable(),
  bgType: z.enum(["theme", "color", "gradient", "image"]),
  bgColor: z.string(),
  bgGradient: z.string(),
  bgImageUrl: z.string(),
  buttonColor: z.string(),
  buttonTextColor: z.string(),
  textColor: z.string(),
  fontFamily: z.enum(BIOPAGE_FONTS),
  profileMode: z.enum(["photo", "text", "logo"]),
  logoUrl: z.string(),
  profileText: z.string().max(40),
  coverUrl: z.string(),
  ogImageUrl: z.string(),
  adsEnabled: z.boolean(),
  adMobileImage: z.string(),
  adMobileHref: z.string(),
  adLeftImage: z.string(),
  adLeftHref: z.string(),
  adRightImage: z.string(),
  adRightHref: z.string(),
  customCss: z.string().max(4000),
  sensitive: z.boolean(),
  password: z.string(),
  removePassword: z.boolean(),
  hasPassword: z.boolean(),
  publishAt: z.string(),
  unpublishAt: z.string(),
  seoTitle: z.string().trim().max(120),
  seoDescription: z.string().trim().max(300),
  published: z.boolean(),
  blocks: z.array(bioBlockSchema).max(100),
});

export type BioFormValues = z.infer<typeof bioFormSchema>;

function emptyMedia(): string {
  return "";
}

export const emptyBioForm = (handle = ""): BioFormValues => ({
  handle,
  domainId: "",
  displayName: "",
  bio: "",
  avatarUrl: "",
  theme: "minimal",
  buttonStyle: "solid",
  templateId: null,
  bgType: "theme",
  bgColor: "",
  bgGradient: "",
  bgImageUrl: "",
  buttonColor: "",
  buttonTextColor: "",
  textColor: "",
  fontFamily: "sans",
  profileMode: "photo",
  logoUrl: "",
  profileText: "",
  coverUrl: "",
  ogImageUrl: "",
  adsEnabled: false,
  adMobileImage: "",
  adMobileHref: "",
  adLeftImage: "",
  adLeftHref: "",
  adRightImage: "",
  adRightHref: "",
  customCss: "",
  sensitive: false,
  password: "",
  removePassword: false,
  hasPassword: false,
  publishAt: "",
  unpublishAt: "",
  seoTitle: "",
  seoDescription: "",
  published: false,
  blocks: [],
});

function optionalDate(value: string): Date | null {
  return scheduleInstant(value.trim() === "" ? null : value);
}

function emptyToNull(value: string): string | null {
  return value.trim() === "" ? null : value;
}

export function toBiopageInput(values: BioFormValues): BiopageInput {
  return biopageInputSchema.parse({
    handle: values.handle,
    domainId: values.domainId === "" ? null : values.domainId,
    displayName: values.displayName,
    bio: values.bio,
    avatarUrl: emptyToNull(values.avatarUrl),
    theme: values.theme,
    buttonStyle: values.buttonStyle,
    templateId: values.templateId,
    bgType: values.bgType,
    bgColor: emptyToNull(values.bgColor),
    bgGradient: emptyToNull(values.bgGradient),
    bgImageUrl: emptyToNull(values.bgImageUrl),
    buttonColor: emptyToNull(values.buttonColor),
    buttonTextColor: emptyToNull(values.buttonTextColor),
    textColor: emptyToNull(values.textColor),
    fontFamily: values.fontFamily,
    profileMode: values.profileMode,
    logoUrl: emptyToNull(values.logoUrl),
    profileText: values.profileText,
    coverUrl: emptyToNull(values.coverUrl),
    ogImageUrl: emptyToNull(values.ogImageUrl),
    adsEnabled: values.adsEnabled,
    adMobileImage: emptyToNull(values.adMobileImage),
    adMobileHref: emptyToNull(values.adMobileHref),
    adLeftImage: emptyToNull(values.adLeftImage),
    adLeftHref: emptyToNull(values.adLeftHref),
    adRightImage: emptyToNull(values.adRightImage),
    adRightHref: emptyToNull(values.adRightHref),
    customCss: values.customCss,
    sensitive: values.sensitive,
    password: values.password.trim() === "" ? null : values.password,
    removePassword: values.removePassword,
    publishAt: optionalDate(values.publishAt),
    unpublishAt: optionalDate(values.unpublishAt),
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
    published: values.published,
    blocks: values.blocks.map((block, index) => ({ ...block, position: index })),
  });
}

/** Sensible starting config per block type, so a freshly added block already renders. */
export function newBlock(type: BioBlockType, position: number): BioBlock {
  const id = crypto.randomUUID();

  switch (type) {
    case "link":
      return {
        id,
        position,
        type: "link",
        label: "",
        destination: "https://",
        iconUrl: null,
        highlighted: false,
        iconName: null,
        newTab: true,
        visible: true,
      };
    case "social":
      return {
        id,
        position,
        type: "social",
        items: [{ platform: "instagram", url: "https://instagram.com/" }],
        visible: true,
      };
    case "text":
      return { id, position, type: "text", body: "", align: "center", visible: true };
    case "header":
      return { id, position, type: "header", text: "", visible: true };
    case "image":
      return { id, position, type: "image", url: "https://", alt: "", href: null, visible: true };
    case "embed":
      return { id, position, type: "embed", provider: "youtube", url: "https://", visible: true };
    case "form":
      return {
        id,
        position,
        type: "form",
        mode: "email",
        title: "",
        buttonLabel: "Subscribe",
        whatsappNumber: null,
        successMessage: "",
        visible: true,
      };
    default:
      return { id, position, type: "divider", visible: true };
  }
}

export function toFormDate(value: Date | string | null | undefined): string {
  const date = scheduleInstant(value);
  if (!date) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

void emptyMedia;
