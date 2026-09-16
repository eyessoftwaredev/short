import {
  BIOPAGE_BUTTON_STYLES,
  BIOPAGE_THEMES,
  bioBlockSchema,
  biopageInputSchema,
  handleSchema,
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
  seoTitle: z.string().trim().max(120),
  seoDescription: z.string().trim().max(300),
  published: z.boolean(),
  blocks: z.array(bioBlockSchema).max(100),
});

export type BioFormValues = z.infer<typeof bioFormSchema>;

export const emptyBioForm = (handle = ""): BioFormValues => ({
  handle,
  domainId: "",
  displayName: "",
  bio: "",
  avatarUrl: "",
  theme: "minimal",
  buttonStyle: "solid",
  seoTitle: "",
  seoDescription: "",
  published: false,
  blocks: [],
});

export function toBiopageInput(values: BioFormValues): BiopageInput {
  return biopageInputSchema.parse({
    handle: values.handle,
    domainId: values.domainId === "" ? null : values.domainId,
    displayName: values.displayName,
    bio: values.bio,
    avatarUrl: values.avatarUrl === "" ? null : values.avatarUrl,
    theme: values.theme,
    buttonStyle: values.buttonStyle,
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
    default:
      return { id, position, type: "divider", visible: true };
  }
}
