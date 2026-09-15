import { abVariantSchema, linkInputSchema, targetRuleSchema, type LinkInput } from "@short/core";
import { z } from "zod";

/**
 * Flat, string-only shape the editor form binds to. Kept separate from
 * `linkInputSchema` because inputs give us strings and the domain schema wants
 * dates, nulls and arrays — `toLinkInput` bridges the two.
 */
export const linkFormSchema = z.object({
  domainId: z.string().min(1, "Pick a domain"),
  slug: z.string().trim(),
  destination: z.string().trim().min(1, "Destination is required"),
  title: z.string().trim().max(255),
  description: z.string().trim().max(1024),
  image: z.string().trim().max(2048),
  comments: z.string().trim().max(2048),
  folderId: z.string(),
  tagsText: z.string().trim().max(512),
  /** `datetime-local` value, i.e. `YYYY-MM-DDTHH:mm`, interpreted in the browser's zone. */
  expiresAt: z.string().trim(),
  expiredDestination: z.string().trim(),
  password: z.string().trim(),
  iosDestination: z.string().trim(),
  androidDestination: z.string().trim(),
  cloaked: z.boolean(),
  noIndex: z.boolean(),
  forwardQuery: z.boolean(),
  archived: z.boolean(),
  utmSource: z.string().trim().max(255),
  utmMedium: z.string().trim().max(255),
  utmCampaign: z.string().trim().max(255),
  utmTerm: z.string().trim().max(255),
  utmContent: z.string().trim().max(255),
  rules: z.array(targetRuleSchema),
  abVariants: z.array(abVariantSchema),
});

export type LinkFormValues = z.infer<typeof linkFormSchema>;

export const emptyLinkForm = (domainId: string): LinkFormValues => ({
  domainId,
  slug: "",
  destination: "",
  title: "",
  description: "",
  image: "",
  comments: "",
  folderId: "",
  tagsText: "",
  expiresAt: "",
  expiredDestination: "",
  password: "",
  iosDestination: "",
  androidDestination: "",
  cloaked: false,
  noIndex: true,
  forwardQuery: false,
  archived: false,
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmTerm: "",
  utmContent: "",
  rules: [],
  abVariants: [],
});

function orUndefined(value: string): string | undefined {
  return value === "" ? undefined : value;
}

/**
 * `password` uses a three-way convention: `""` keeps whatever is stored, `"-"` clears the
 * gate, and anything else sets a new password.
 */
function passwordValue(value: string): string | null | undefined {
  if (value === "") {
    return undefined;
  }
  return value === "-" ? null : value;
}

export function toLinkInput(values: LinkFormValues): LinkInput {
  const utm = {
    utm_source: orUndefined(values.utmSource),
    utm_medium: orUndefined(values.utmMedium),
    utm_campaign: orUndefined(values.utmCampaign),
    utm_term: orUndefined(values.utmTerm),
    utm_content: orUndefined(values.utmContent),
  };
  const hasUtm = Object.values(utm).some((entry) => entry != null);

  return linkInputSchema.parse({
    domainId: values.domainId,
    slug: orUndefined(values.slug),
    destination: values.destination,
    title: orUndefined(values.title),
    description: orUndefined(values.description),
    image: values.image,
    comments: orUndefined(values.comments),
    folderId: values.folderId === "" ? null : values.folderId,
    tags: values.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== ""),
    expiresAt: values.expiresAt === "" ? null : new Date(values.expiresAt),
    expiredDestination: values.expiredDestination === "" ? null : values.expiredDestination,
    password: passwordValue(values.password),
    iosDestination: values.iosDestination === "" ? null : values.iosDestination,
    androidDestination: values.androidDestination === "" ? null : values.androidDestination,
    cloaked: values.cloaked,
    noIndex: values.noIndex,
    forwardQuery: values.forwardQuery,
    archived: values.archived,
    utm: hasUtm ? utm : null,
    rules: values.rules,
    abVariants: values.abVariants,
  });
}

/** Renders a stored timestamp back into the `datetime-local` format. */
export function toDateTimeLocal(date: Date | null): string {
  if (!date) {
    return "";
  }
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
