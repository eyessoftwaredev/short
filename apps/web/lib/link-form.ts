import {
  abVariantSchema,
  LINK_OPEN_MODES,
  linkInputSchema,
  targetRuleSchema,
  type LinkInput,
} from "@short/core";
import { z } from "zod";

/**
 * Flat, string-only shape the editor form binds to. Kept separate from
 * `linkInputSchema` because inputs give us strings and the domain schema wants
 * dates, nulls and arrays — `toLinkInput` bridges the two.
 */
export const linkFormSchema = z.object({
  domainId: z.string().min(1, "pickDomain"),
  slug: z.string().trim(),
  destination: z.string().trim().min(1, "destinationRequired"),
  title: z.string().trim().max(255),
  description: z.string().trim().max(1024),
  image: z.string().trim().max(2048),
  comments: z.string().trim().max(2048),
  folderId: z.string(),
  tagsText: z.string().trim().max(512),
  /**
   * In the browser this is the `datetime-local` value (`YYYY-MM-DDTHH:mm`, local time).
   * The editor converts it with `dateTimeLocalToIso` before submitting, because the server
   * action would otherwise parse it in the server's zone, not the user's.
   */
  expiresAt: z.string().trim(),
  /**
   * Same `datetime-local` / ISO handling as `expiresAt`. Optional so a form built
   * without it leaves the stored schedule alone; `""` clears it.
   */
  startsAt: z.string().trim().optional(),
  expiredDestination: z.string().trim(),
  password: z.string().trim(),
  iosDestination: z.string().trim(),
  androidDestination: z.string().trim(),
  cloaked: z.boolean(),
  noIndex: z.boolean(),
  forwardQuery: z.boolean(),
  /**
   * Optional so a form built without it (an older edit page) leaves the stored mode
   * alone instead of resetting it to `auto`.
   */
  openMode: z.enum(LINK_OPEN_MODES).optional(),
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
  startsAt: "",
  expiredDestination: "",
  password: "",
  iosDestination: "",
  androidDestination: "",
  cloaked: false,
  noIndex: true,
  forwardQuery: false,
  openMode: "auto",
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

function sameMinute(a: Date, b: Date): boolean {
  return Math.floor(a.getTime() / 60_000) === Math.floor(b.getTime() / 60_000);
}

export type ToLinkInputOptions = {
  /**
   * The link's stored expiry when editing. The core schema only accepts future expiries,
   * which would block every edit of an already-expired link; an unchanged past expiry
   * (the form keeps minute precision) is carried over instead of re-validated.
   */
  currentExpiresAt?: Date | null;
};

export function toLinkInput(values: LinkFormValues, options: ToLinkInputOptions = {}): LinkInput {
  const expiresAt = values.expiresAt === "" ? null : new Date(values.expiresAt);
  const keepPastExpiry =
    expiresAt != null &&
    options.currentExpiresAt != null &&
    !Number.isNaN(expiresAt.getTime()) &&
    expiresAt.getTime() <= Date.now() &&
    sameMinute(expiresAt, options.currentExpiresAt);

  const utm = {
    utm_source: orUndefined(values.utmSource),
    utm_medium: orUndefined(values.utmMedium),
    utm_campaign: orUndefined(values.utmCampaign),
    utm_term: orUndefined(values.utmTerm),
    utm_content: orUndefined(values.utmContent),
  };
  const hasUtm = Object.values(utm).some((entry) => entry != null);

  const input = linkInputSchema.parse({
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
    startsAt:
      values.startsAt === undefined ? undefined : values.startsAt === "" ? null : values.startsAt,
    expiresAt: keepPastExpiry ? null : expiresAt,
    expiredDestination: values.expiredDestination === "" ? null : values.expiredDestination,
    password: passwordValue(values.password),
    iosDestination: values.iosDestination === "" ? null : values.iosDestination,
    androidDestination: values.androidDestination === "" ? null : values.androidDestination,
    cloaked: values.cloaked,
    noIndex: values.noIndex,
    forwardQuery: values.forwardQuery,
    openMode: values.openMode,
    archived: values.archived,
    utm: hasUtm ? utm : null,
    rules: values.rules,
    abVariants: values.abVariants,
  });
  return keepPastExpiry ? { ...input, expiresAt: options.currentExpiresAt ?? null } : input;
}

/**
 * Renders a timestamp into the `datetime-local` format using the zone of the runtime it
 * runs in — call it in the browser, not in a server component.
 */
export function toDateTimeLocal(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const DATE_TIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** Server → form: an absolute ISO timestamp becomes the browser-local input value. */
export function isoToDateTimeLocal(value: string): string {
  if (value === "" || DATE_TIME_LOCAL.test(value)) {
    return value;
  }
  return toDateTimeLocal(new Date(value));
}

/** Form → server: the browser-local input value becomes an absolute ISO timestamp. */
export function dateTimeLocalToIso(value: string): string {
  if (value === "") {
    return "";
  }
  const date = new Date(value);
  // Leave junk untouched so the server-side schema reports it as a field error.
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
