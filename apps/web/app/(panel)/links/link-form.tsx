"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appLaunchUrl, normalizeDestination, type AbVariant, type LinkOpenMode } from "@short/core";
import { Icon } from "@/components/kit/icon";
import {
  Button,
  Callout,
  Card,
  ConfirmDialog,
  CopyField,
  DateTimePicker,
  Field,
  Input,
  SaveBar,
  SecretInput,
  SectionCard,
  Segmented,
  Select,
  SettingsRow,
  Sheet,
  Switch,
  Textarea,
  toast,
} from "@/components/ui";
import { ImageUpload } from "@/components/media/image-upload";
import { useActionMessage } from "@/lib/action-message";
import type { FetchedLinkMetadata } from "@/lib/link-metadata";
import {
  dateTimeLocalToIso,
  isoToDateTimeLocal,
  linkFormSchema,
  type LinkFormValues,
} from "@/lib/link-form";
import {
  checkSlugAvailabilityAction,
  createLinkAction,
  deleteLinkAction,
  updateLinkAction,
  type SlugAvailability,
} from "./actions";
import { Favicon } from "./favicon";
import { hostnameOf } from "./link-state";
import {
  AppChips,
  BehaviourSummary,
  FieldBlock,
  FormSection,
  SocialPreviewCard,
  StepTitle,
  SUPPORTED_APPS,
  ToggleRow,
  type SummaryItem,
} from "./link-form-parts";
import { fetchLinkMetadataAction } from "./metadata-actions";
import { describeRuleConditions, RuleBuilder } from "./rule-builder";
import { UtmSection, type UtmValues } from "./utm-section";

export type DomainOption = { id: string; hostname: string };
export type FolderOption = { id: string; name: string };

type SectionId =
  | "openMode"
  | "appLinks"
  | "utm"
  | "targeting"
  | "abTest"
  | "limits"
  | "protection"
  | "social"
  | "organize"
  | "notes"
  | "status";

/** Server field paths (from `linkInputSchema`) that are named differently in the form. */
const SERVER_FIELD_ALIASES: Record<string, keyof LinkFormValues> = {
  tags: "tagsText",
  "utm.utm_source": "utmSource",
  "utm.utm_medium": "utmMedium",
  "utm.utm_campaign": "utmCampaign",
  "utm.utm_term": "utmTerm",
  "utm.utm_content": "utmContent",
};

/** Which collapsible group holds a field, so an error can open it and scroll there. */
const FIELD_SECTIONS: Partial<Record<keyof LinkFormValues, SectionId>> = {
  openMode: "openMode",
  iosDestination: "appLinks",
  androidDestination: "appLinks",
  utmSource: "utm",
  utmMedium: "utm",
  utmCampaign: "utm",
  utmTerm: "utm",
  utmContent: "utm",
  forwardQuery: "utm",
  rules: "targeting",
  abVariants: "abTest",
  startsAt: "limits",
  expiresAt: "limits",
  expiredDestination: "limits",
  maxClicks: "limits",
  password: "protection",
  description: "social",
  image: "social",
  cloaked: "social",
  noIndex: "social",
  folderId: "organize",
  tagsText: "organize",
  comments: "notes",
  archived: "status",
};

/** Fields that render their own inline error; anything else is also named in the banner. */
const INLINE_ERROR_FIELDS = new Set<keyof LinkFormValues>([
  "destination",
  "domainId",
  "slug",
  "title",
  "description",
  "image",
  "folderId",
  "tagsText",
  "iosDestination",
  "androidDestination",
  "startsAt",
  "expiresAt",
  "expiredDestination",
  "maxClicks",
  "password",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
]);

/** Message keys the schemas emit, mapped to the translated copy. */
const MESSAGE_KEYS: Record<string, string> = {
  pickDomain: "pickDomain",
  destinationRequired: "destinationRequired",
  slugPattern: "slugPattern",
  slugReserved: "slugReserved",
  startBeforeExpiry: "startBeforeExpiry",
  maxClicksInvalid: "maxClicksInvalid",
  slugTaken: "form.slugTaken",
  folderMissing: "form.folderMissing",
  mediaPath: "form.imageInvalid",
  "Expiry must be in the future": "form.expiryPast",
  "Only absolute http(s) URLs are allowed": "form.urlInvalid",
  "An A/B test needs at least two variants": "abNeedsTwo",
};

function formFieldFor(path: string): keyof LinkFormValues | null {
  const alias = SERVER_FIELD_ALIASES[path] ?? SERVER_FIELD_ALIASES[path.split(".")[0] ?? ""];
  if (alias) {
    return alias;
  }
  const top = path.split(".")[0] ?? "";
  return top in linkFormSchema.shape ? (top as keyof LinkFormValues) : null;
}

function translateMessage(message: string | undefined, t: ReturnType<typeof useTranslations>): string | undefined {
  if (!message) {
    return undefined;
  }
  const key = MESSAGE_KEYS[message];
  return key ? t(key) : message;
}

function looksLikeUrl(value: string): boolean {
  const host = hostnameOf(normalizeDestination(value));
  return host != null && /\.[a-z]{2,}$/i.test(host);
}

type LinkFormProps = {
  mode: "create" | "edit";
  linkId?: string;
  defaultValues: LinkFormValues;
  domains: DomainOption[];
  folders: FolderOption[];
  /** Plan gates; the UI explains the limit instead of failing on submit. */
  canTarget: boolean;
  canAbTest: boolean;
  canProtect: boolean;
  canCloak: boolean;
  hasPassword?: boolean;
  /** Edit only: offers "Delete link" at the bottom. */
  canDelete?: boolean;
  /** Extra cards for the right column, e.g. the link's QR code. */
  aside?: ReactNode;
};

export function LinkForm({
  mode,
  linkId,
  defaultValues,
  domains,
  folders,
  canTarget,
  canAbTest,
  canProtect,
  canCloak,
  hasPassword = false,
  canDelete = false,
  aside,
}: LinkFormProps) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const ts = useTranslations("stats");
  const locale = useLocale();
  const router = useRouter();
  const actionMessage = useActionMessage();
  const [openSections, setOpenSections] = useState<ReadonlySet<SectionId>>(() => new Set());
  const [rulesOpen, setRulesOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // The edit page sends the schedule as ISO; the inputs need it in the viewer's zone.
  const initialValues = useMemo(
    () => ({
      ...defaultValues,
      expiresAt: isoToDateTimeLocal(defaultValues.expiresAt),
      startsAt: defaultValues.startsAt === undefined ? undefined : isoToDateTimeLocal(defaultValues.startsAt),
    }),
    [defaultValues],
  );

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: initialValues,
  });

  const passwordField = register("password");
  const destinationField = register("destination");
  const values = watch();
  const selectedDomain = useMemo(
    () => domains.find((domain) => domain.id === values.domainId) ?? domains[0],
    [domains, values.domainId],
  );
  const shortHost = selectedDomain?.hostname ?? "";
  const slug = (values.slug ?? "").trim();
  const shortUrl = shortHost && slug ? `https://${shortHost}/${slug}` : null;
  const destination = normalizeDestination(values.destination ?? "");
  const destinationHost = hostnameOf(destination);

  const setSection = (id: SectionId, open: boolean): void =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });

  /** Opens the group holding `field` and brings it into view. */
  const reveal = (fields: (keyof LinkFormValues)[]): void => {
    const sections = fields.map((field) => FIELD_SECTIONS[field]).filter((id): id is SectionId => id != null);
    if (sections.length > 0) {
      setOpenSections((prev) => new Set([...prev, ...sections]));
    }
    const first = fields[0];
    if (!first) {
      return;
    }
    const target = FIELD_SECTIONS[first] ? `section-${FIELD_SECTIONS[first]}` : `field-${first}`;
    window.setTimeout(
      () => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  };

  /* ── Destination metadata: prefill title/description, feed the preview ─────── */

  const [meta, setMeta] = useState<FetchedLinkMetadata | null>(null);
  const [metaStatus, setMetaStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const metaRequest = useRef(0);
  const lastMetaUrl = useRef("");
  const autoFilled = useRef({ title: "", description: "" });
  /** On edit, fetched values only fill fields once the user changed the destination. */
  const destinationEdited = useRef(false);

  useEffect(() => {
    const url = normalizeDestination(values.destination ?? "");
    if (!looksLikeUrl(url)) {
      // Cleared or half-typed: drop the old page's preview and ignore late answers.
      if (lastMetaUrl.current !== "") {
        lastMetaUrl.current = "";
        metaRequest.current += 1;
        setMeta(null);
        setMetaStatus("idle");
      }
      return undefined;
    }
    if (url === lastMetaUrl.current) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      lastMetaUrl.current = url;
      const request = ++metaRequest.current;
      setMetaStatus("loading");
      fetchLinkMetadataAction(url)
        .then((result) => {
          if (request !== metaRequest.current) {
            return;
          }
          if (!result.ok) {
            setMeta(null);
            // Being throttled is not the page's fault; stay quiet about it.
            setMetaStatus(result.error === "metadata_unavailable" ? "error" : "idle");
            return;
          }
          setMeta(result.data);
          setMetaStatus("ok");
          if (mode === "edit" && !destinationEdited.current) {
            return;
          }
          const current = getValues();
          const title = result.data.title?.trim().slice(0, 255) ?? "";
          if (title && (current.title.trim() === "" || current.title === autoFilled.current.title)) {
            autoFilled.current.title = title;
            setValue("title", title, { shouldDirty: true });
          }
          const description = result.data.description?.trim().slice(0, 1024) ?? "";
          if (
            description &&
            (current.description.trim() === "" || current.description === autoFilled.current.description)
          ) {
            autoFilled.current.description = description;
            setValue("description", description, { shouldDirty: true });
          }
        })
        .catch(() => {
          if (request === metaRequest.current) {
            setMetaStatus("idle");
          }
        });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [values.destination, mode, getValues, setValue]);

  /* ── Slug availability hint ──────────────────────────────────────────────── */

  const [slugCheck, setSlugCheck] = useState<{ key: string; status: SlugAvailability | "checking" } | null>(null);
  const slugKey = `${values.domainId}/${slug}`;
  const slugUnchanged = mode === "edit" && slug === initialValues.slug && values.domainId === initialValues.domainId;

  useEffect(() => {
    if (slug === "" || slugUnchanged) {
      return undefined;
    }
    const key = slugKey;
    const timer = window.setTimeout(() => {
      setSlugCheck({ key, status: "checking" });
      checkSlugAvailabilityAction(values.domainId, slug, linkId)
        .then((result) => {
          setSlugCheck((prev) =>
            prev?.key === key ? { key, status: result.ok ? result.data : "unknown" } : prev,
          );
        })
        .catch(() => setSlugCheck((prev) => (prev?.key === key ? { key, status: "unknown" } : prev)));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [linkId, slug, slugKey, slugUnchanged, values.domainId]);

  const slugStatus = slug !== "" && !slugUnchanged && slugCheck?.key === slugKey ? slugCheck.status : null;
  const slugProblem: string | undefined =
    slugStatus === "taken"
      ? t("form.slugTaken")
      : slugStatus === "invalid"
        ? t("slugPattern")
        : slugStatus === "reserved"
          ? t("slugReserved")
          : slugStatus === "too_short" || slugStatus === "premium"
            ? actionMessage(slugStatus === "too_short" ? "slug_too_short" : "slug_premium")
            : undefined;

  /* ── Submit ──────────────────────────────────────────────────────────────── */

  const showError = (message: string): void => {
    setFormError(message);
    // After the banner has rendered.
    window.setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const onValid = async (formValues: LinkFormValues): Promise<void> => {
    setFormError(null);
    // Sent as an absolute timestamp so the server does not re-read it in its own zone.
    const payload = {
      ...formValues,
      expiresAt: dateTimeLocalToIso(formValues.expiresAt),
      startsAt: formValues.startsAt === undefined ? undefined : dateTimeLocalToIso(formValues.startsAt),
    };
    try {
      const result =
        mode === "create" ? await createLinkAction(payload) : await updateLinkAction(linkId ?? "", payload);

      if (!result.ok) {
        if (result.error === "slug_too_short" || result.error === "slug_premium") {
          setError("slug", { type: "server", message: actionMessage(result.error) });
          reveal(["slug"]);
          return;
        }
        // Server-side schema errors land on the matching input instead of only a
        // "fix the highlighted fields" banner with nothing highlighted.
        const unmatched: string[] = [];
        const fields: (keyof LinkFormValues)[] = [];
        for (const [path, messages] of Object.entries(result.fieldErrors ?? {})) {
          const field = formFieldFor(path);
          const message = translateMessage(messages[0], t) ?? "";
          if (field) {
            setError(field, { type: "server", message });
            fields.push(field);
          }
          if (!field || !INLINE_ERROR_FIELDS.has(field)) {
            unmatched.push(message);
          }
        }
        if (fields.length > 0) {
          reveal(fields);
        }
        if (unmatched.length > 0 || fields.length === 0) {
          showError(
            unmatched.length > 0 ? `${actionMessage(result.error)}: ${unmatched.join(", ")}` : actionMessage(result.error),
          );
        } else {
          toast.error(t("form.saveFailed"), t("form.fixErrors"));
        }
        return;
      }

      if (mode === "create") {
        toast.success(t("form.created"), result.data.shortUrl);
        router.push(`/links/${result.data.id}/stats`);
        return;
      }
      toast.success(t("form.saved"));
      // The password never round-trips; a saved one must not be re-sent next time.
      reset({ ...formValues, password: "" });
      router.refresh();
    } catch {
      showError(actionMessage("generic"));
    }
  };

  const onInvalid = (fieldErrors: FieldErrors<LinkFormValues>): void => {
    const fields = Object.keys(fieldErrors) as (keyof LinkFormValues)[];
    reveal(fields);
    const hidden = fields.filter((field) => !INLINE_ERROR_FIELDS.has(field));
    const parts = hidden.map((field) =>
      field === "rules"
        ? t("form.rulesInvalid")
        : field === "abVariants"
          ? t("form.abInvalid")
          : (translateMessage(fieldErrors[field]?.message, t) ?? ""),
    );
    // Visible fields show their own message; only name what is not on screen.
    if (parts.length > 0) {
      showError(`${t("form.fixErrors")} ${parts.join(" ")}`);
    } else {
      setFormError(null);
      toast.error(t("form.saveFailed"), t("form.fixErrors"));
    }
  };

  /* ── Derived state for the sections and the preview ─────────────────────── */

  const appFor = (url: string): string | null => appLaunchUrl(url, "android")?.app ?? null;
  const destinationApp = destinationHost ? appFor(destination) : null;
  const destinationAppName = SUPPORTED_APPS.find((app) => app.id === destinationApp)?.name ?? null;
  const openMode: LinkOpenMode = values.openMode ?? "auto";
  const utmValues: UtmValues = {
    utmSource: values.utmSource,
    utmMedium: values.utmMedium,
    utmCampaign: values.utmCampaign,
    utmTerm: values.utmTerm,
    utmContent: values.utmContent,
  };
  const utmCount = Object.values(utmValues).filter((value) => value.trim() !== "").length;
  const tags = values.tagsText
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
  const folderName = folders.find((folder) => folder.id === values.folderId)?.name ?? null;
  const maxClicks = values.maxClicks?.trim() ?? "";
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );
  const formatLocal = (value: string | undefined): string | null => {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : dateTime.format(date);
  };
  const startsLabel = formatLocal(values.startsAt);
  const expiresLabel = formatLocal(values.expiresAt);
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const abTotal = values.abVariants.reduce((sum, variant) => sum + (variant.weight || 0), 0);

  const previewImage = values.cloaked && values.image ? values.image : (meta?.image ?? (values.image || null));
  const preview = values.cloaked
    ? {
        title: values.title || meta?.title || "",
        description: values.description || meta?.description || "",
        domain: shortHost,
      }
    : {
        title: meta?.title || values.title || "",
        description: meta?.description || values.description || "",
        domain: meta?.siteName || destinationHost || shortHost,
      };

  const summary: SummaryItem[] = [];
  summary.push({
    id: "destination",
    icon: "arrow-right",
    text: destinationHost ? t("form.sumDestination", { host: destinationHost }) : t("form.sumNoDestination"),
  });
  if (values.iosDestination.trim() || values.androidDestination.trim()) {
    summary.push({ id: "apps", icon: "mobile-screen", text: t("form.sumAppLinks") });
  }
  if (openMode === "app") {
    summary.push({
      id: "open",
      icon: "mobile-screen",
      text: destinationAppName ? t("form.sumOpenApp", { app: destinationAppName }) : t("form.sumOpenAppNone"),
      tone: destinationAppName ? "default" : "warn",
    });
  } else if (openMode === "browser") {
    summary.push({ id: "open", icon: "compass", text: t("form.sumOpenBrowser") });
  }
  if (values.rules.length > 0) {
    summary.push({ id: "rules", icon: "sliders", text: t("form.sumRules", { count: values.rules.length }) });
  }
  if (values.abVariants.length > 1) {
    summary.push({ id: "ab", icon: "layer-group", text: t("form.sumAb", { count: values.abVariants.length }) });
  }
  if (utmCount > 0) {
    summary.push({ id: "utm", icon: "bullseye", text: t("form.sumUtm", { count: utmCount }) });
  }
  if (startsLabel) {
    summary.push({ id: "starts", icon: "calendar", text: t("form.sumStarts", { date: startsLabel }) });
  }
  if (expiresLabel) {
    summary.push({ id: "expires", icon: "clock", text: t("form.sumExpires", { date: expiresLabel }) });
  }
  if (maxClicks !== "" && /^\d+$/.test(maxClicks)) {
    summary.push({
      id: "limit",
      icon: "gauge-high",
      text: t("form.sumLimit", { count: Number(maxClicks), formatted: numberFormat.format(Number(maxClicks)) }),
    });
  }
  const passwordOn = values.password !== "-" && (values.password.trim() !== "" || hasPassword);
  if (passwordOn) {
    summary.push({ id: "password", icon: "lock", text: t("form.sumPassword") });
  }
  if (values.cloaked) {
    summary.push({ id: "cloak", icon: "eye-slash", text: t("form.sumCloaked") });
  }
  if (values.archived) {
    summary.push({ id: "archived", icon: "archive", text: t("form.sumArchived"), tone: "warn" });
  }

  const sectionInvalid = (id: SectionId): boolean =>
    (Object.keys(errors) as (keyof LinkFormValues)[]).some((field) => FIELD_SECTIONS[field] === id);

  const addVariant = (): void => {
    const next: AbVariant = { id: crypto.randomUUID(), destination: "", weight: 50 };
    const list = values.abVariants.length === 0 && destination ? [
      { id: crypto.randomUUID(), destination, weight: 50 },
      next,
    ] : [...values.abVariants, next];
    setValue("abVariants", list, { shouldDirty: true });
  };

  const pickerLabels = {
    locale,
    placeholder: t("form.pickDateTime"),
    clearLabel: t("form.clearDate"),
    prevLabel: ts("prevMonth"),
    nextLabel: ts("nextMonth"),
    hourLabel: t("form.hour"),
    minuteLabel: t("form.minute"),
  };

  const openModeHint: Record<LinkOpenMode, string> = {
    auto: t("form.openAutoBody"),
    app: t("form.openAppBody"),
    browser: t("form.openBrowserBody"),
  };

  const iosStore = /(^|\.)apps\.apple\.com$|(^|\.)itunes\.apple\.com$/i.test(
    hostnameOf(normalizeDestination(values.iosDestination)) ?? "",
  );
  const androidStore = /(^|\.)play\.google\.com$/i.test(hostnameOf(normalizeDestination(values.androidDestination)) ?? "");

  return (
    <>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <form
          className="flex min-w-0 flex-col gap-6"
          autoComplete="off"
          noValidate
          onSubmit={(event) => {
            void handleSubmit(onValid, onInvalid)(event);
          }}
        >
          {formError ? (
            <div ref={errorRef} className="scroll-mt-24">
              <Callout tone="danger" title={t("form.saveFailed")} onDismiss={() => setFormError(null)}>
                {formError}
              </Callout>
            </div>
          ) : null}

          {/* ── 1. Where should it go? ─────────────────────────────────────── */}
          <Card title={<StepTitle n={1}>{t("form.step1Title")}</StepTitle>} description={t("form.step1Desc")}>
            <div id="field-destination" className="scroll-mt-24">
              <Field
                label={t("destination")}
                info={t("info.destination")}
                required
                error={translateMessage(errors.destination?.message, t)}
                hint={
                  metaStatus === "error"
                    ? t("form.metaFailed")
                    : metaStatus === "ok" && meta?.siteName
                      ? t("form.metaFound", { site: meta.siteName })
                      : t("form.destinationHint")
                }
              >
                <Input
                  type="url"
                  inputMode="url"
                  placeholder={t("destinationPlaceholder")}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={errors.destination ? true : undefined}
                  prefix={
                    destinationHost ? (
                      <Favicon url={destination} src={meta?.favicon} size="sm" />
                    ) : (
                      <Icon name="link" className="text-xs" />
                    )
                  }
                  suffix={
                    metaStatus === "loading" ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <Icon name="spinner" className="text-xs" />
                        <span className="hidden sm:inline">{t("form.metaLoading")}</span>
                      </span>
                    ) : metaStatus === "ok" ? (
                      <Icon name="circle-check" className="text-xs text-success" />
                    ) : null
                  }
                  {...destinationField}
                  onChange={(event) => {
                    destinationEdited.current = true;
                    void destinationField.onChange(event);
                  }}
                />
              </Field>
            </div>

            <div id="field-title" className="scroll-mt-24">
              <Field
                label={t("titleField")}
                info={t("info.title")}
                optional={tc("optional")}
                error={errors.title?.message}
                hint={
                  values.title !== "" && values.title === autoFilled.current.title
                    ? t("form.titleAutoHint")
                    : t("form.titleHint")
                }
              >
                <Input maxLength={255} placeholder={t("form.titlePlaceholder")} {...register("title")} />
              </Field>
            </div>
          </Card>

          {/* ── 2. Short link ─────────────────────────────────────────────── */}
          <Card title={<StepTitle n={2}>{t("form.step2Title")}</StepTitle>} description={t("form.step2Desc")}>
            {domains.length === 0 ? (
              <Callout tone="warn" title={t("form.noDomains")}>
                {t("form.noDomainsBody")}
              </Callout>
            ) : null}
            <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
              <div id="field-domainId" className="scroll-mt-24">
                <Field
                  label={t("domain")}
                  info={t("info.domain")}
                  error={translateMessage(errors.domainId?.message, t)}
                  hint={t("form.domainHint")}
                >
                  <Select {...register("domainId")}>
                    {domains.map((domain) => (
                      <option key={domain.id} value={domain.id}>
                        {domain.hostname}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div id="field-slug" className="scroll-mt-24">
                <Field
                  label={t("form.slugLabel")}
                  info={t("info.slug")}
                  optional={tc("optional")}
                  error={translateMessage(errors.slug?.message, t) ?? slugProblem}
                  hint={
                    slugStatus === "checking" ? (
                      <span className="flex items-center gap-1.5">
                        <Icon name="spinner" className="text-[11px]" />
                        {t("form.slugChecking")}
                      </span>
                    ) : slugStatus === "available" ? (
                      <span className="flex items-center gap-1.5 text-success-ink">
                        <Icon name="circle-check" className="text-[11px]" />
                        {t("form.slugAvailable")}
                      </span>
                    ) : (
                      t("slugHint")
                    )
                  }
                >
                  <Input
                    placeholder={t("slugPlaceholder")}
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono"
                    aria-invalid={errors.slug || slugProblem ? true : undefined}
                    prefix={<span className="font-mono text-[13px]">/</span>}
                    {...register("slug")}
                  />
                </Field>
              </div>
            </div>

            {shortUrl ? (
              <CopyField
                label={t("form.yourShortLink")}
                info={t("form.yourShortLinkInfo")}
                value={shortUrl}
                href={mode === "edit" && slugUnchanged ? shortUrl : undefined}
                hint={mode === "create" ? t("form.shortLinkLiveAfterCreate") : undefined}
              />
            ) : (
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">{t("form.yourShortLink")}</span>
                <span className="flex h-9.5 min-w-0 items-center rounded-default border border-dashed border-border-strong bg-surface-subtle px-3 font-mono text-sm">
                  <span className="truncate text-fg-muted">{shortHost}/</span>
                  <span className="truncate text-fg-subtle italic">{t("form.randomSlug")}</span>
                </span>
                <span className="text-[13px] leading-5 text-fg-subtle">{t("form.randomSlugHint")}</span>
              </div>
            )}
          </Card>

          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="m-0 text-base leading-6 font-semibold tracking-[-0.01em] text-ink">{t("form.moreTitle")}</h2>
            <p className="m-0 text-sm text-fg-muted">{t("form.moreDesc")}</p>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {/* ── Open behaviour ─────────────────────────────────────────── */}
            <FormSection
              id="openMode"
              icon="mobile-screen"
              title={t("form.openTitle")}
              description={t("form.openDesc")}
              summary={openMode === "app" ? t("form.openApp") : openMode === "browser" ? t("form.openBrowser") : undefined}
              invalid={sectionInvalid("openMode")}
              open={openSections.has("openMode")}
              onOpenChange={(open) => setSection("openMode", open)}
            >
              {/* Controlled rather than registered: an edit page that does not pass the
                  stored mode must leave it untouched, not submit the first option. */}
              <FieldBlock label={t("openModeField")} info={t("info.openMode")}>
                <Segmented<LinkOpenMode>
                  label={t("openModeField")}
                  value={openMode}
                  onChange={(next) => setValue("openMode", next, { shouldDirty: true })}
                  items={[
                    { id: "auto", label: t("form.openAuto"), icon: "arrow-right" },
                    { id: "app", label: t("form.openApp"), icon: "mobile-screen" },
                    { id: "browser", label: t("form.openBrowser"), icon: "compass" },
                  ]}
                  className="max-w-full overflow-x-auto"
                />
              </FieldBlock>
              <p className="m-0 text-sm leading-6 text-fg-muted">{openModeHint[openMode]}</p>
              {openMode === "app" ? (
                <div className="flex min-w-0 flex-col gap-3">
                  <span className="text-[13px] font-medium text-fg-subtle">{t("form.supportedApps")}</span>
                  <AppChips highlight={destinationApp} />
                  {destinationHost ? (
                    destinationAppName ? (
                      <Callout tone="success" title={t("form.appDetected", { app: destinationAppName })} />
                    ) : (
                      <Callout tone="warn" title={t("form.appNotDetected")}>
                        {t("form.appNotDetectedBody")}
                      </Callout>
                    )
                  ) : null}
                </div>
              ) : null}
            </FormSection>

            {/* ── Smart app link ─────────────────────────────────────────── */}
            <FormSection
              id="appLinks"
              icon="apple"
              title={t("form.appLinksTitle")}
              description={t("form.appLinksDesc")}
              summary={
                values.iosDestination.trim() && values.androidDestination.trim()
                  ? t("form.appLinksBoth")
                  : values.iosDestination.trim()
                    ? "iPhone"
                    : values.androidDestination.trim()
                      ? "Android"
                      : undefined
              }
              invalid={sectionInvalid("appLinks")}
              open={openSections.has("appLinks")}
              onOpenChange={(open) => setSection("appLinks", open)}
            >
              <Callout tone="accent" icon="sparkles" title={t("form.appLinksExplainTitle")}>
                {t("form.appLinksExplain")}
              </Callout>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <Field
                  label={t("form.iosLabel")}
                  info={t("info.iosDestination")}
                  error={translateMessage(errors.iosDestination?.message, t)}
                  hint={iosStore ? t("form.appStoreDetected") : t("form.iosHint")}
                >
                  <Input
                    type="url"
                    inputMode="url"
                    spellCheck={false}
                    placeholder="https://apps.apple.com/app/…"
                    prefix={<Icon name="apple" className="text-xs" />}
                    {...register("iosDestination")}
                  />
                </Field>
                <Field
                  label={t("form.androidLabel")}
                  info={t("info.androidDestination")}
                  error={translateMessage(errors.androidDestination?.message, t)}
                  hint={androidStore ? t("form.playStoreDetected") : t("form.androidHint")}
                >
                  <Input
                    type="url"
                    inputMode="url"
                    spellCheck={false}
                    placeholder="https://play.google.com/store/apps/details?id=…"
                    prefix={<Icon name="android" className="text-xs" />}
                    {...register("androidDestination")}
                  />
                </Field>
              </div>
            </FormSection>

            {/* ── Campaign tracking (UTM) ────────────────────────────────── */}
            <FormSection
              id="utm"
              icon="bullseye"
              title={t("form.utmTitle")}
              description={t("form.utmDesc")}
              summary={utmCount > 0 ? t("form.utmCount", { count: utmCount }) : undefined}
              invalid={sectionInvalid("utm")}
              open={openSections.has("utm")}
              onOpenChange={(open) => setSection("utm", open)}
            >
              <UtmSection
                values={utmValues}
                destination={values.destination}
                errors={{
                  utmSource: errors.utmSource?.message,
                  utmMedium: errors.utmMedium?.message,
                  utmCampaign: errors.utmCampaign?.message,
                  utmTerm: errors.utmTerm?.message,
                  utmContent: errors.utmContent?.message,
                }}
                onChange={(next) => {
                  for (const [key, value] of Object.entries(next) as [keyof UtmValues, string][]) {
                    if (value !== getValues(key)) {
                      setValue(key, value, { shouldDirty: true });
                    }
                  }
                }}
                forwardQuery={values.forwardQuery}
                onForwardQueryChange={(next) => setValue("forwardQuery", next, { shouldDirty: true })}
              />
            </FormSection>

            {/* ── Targeting ──────────────────────────────────────────────── */}
            <FormSection
              id="targeting"
              icon="sliders"
              title={t("form.targetingTitle")}
              description={t("form.targetingDesc")}
              summary={values.rules.length > 0 ? t("rulesCount", { count: values.rules.length }) : undefined}
              locked={canTarget ? undefined : t("form.upgradeBadge")}
              invalid={sectionInvalid("targeting")}
              open={openSections.has("targeting")}
              onOpenChange={(open) => setSection("targeting", open)}
            >
              {!canTarget ? (
                <Callout
                  tone="neutral"
                  icon="lock"
                  title={t("targetingPaywall")}
                  actions={
                    values.rules.length > 0 ? (
                      <Button size="sm" onClick={() => setValue("rules", [], { shouldDirty: true })}>
                        {t("clearRules")}
                      </Button>
                    ) : (
                      <Button size="sm" leadingIcon="rocket" href="/billing">
                        {t("seePlans")}
                      </Button>
                    )
                  }
                />
              ) : null}
              {values.rules.length === 0 ? (
                <p className="m-0 text-sm text-fg-muted">{t("rulesEmpty")}</p>
              ) : (
                <ol className="m-0 flex list-none flex-col gap-2 p-0">
                  {values.rules.map((rule, index) => (
                    <li
                      key={rule.id}
                      className="flex min-w-0 items-start gap-3 rounded-md border border-border-subtle bg-surface-subtle p-3"
                    >
                      <span className="numeric flex size-6 shrink-0 items-center justify-center rounded-full bg-bg text-xs font-semibold text-fg-muted ring-1 ring-border">
                        {index + 1}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5 text-[13px] leading-5">
                        <span className="text-ink">
                          {rule.conditions.length > 0
                            ? describeRuleConditions(rule, t, locale)
                            : t("form.ruleNoConditions")}
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5 text-fg-muted">
                          <Icon name="arrow-right" className="text-[10px]" />
                          <span className="truncate font-mono">{rule.destination || t("notSet")}</span>
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {errors.rules ? <Callout tone="danger" title={t("form.rulesInvalid")} /> : null}
              {canTarget ? (
                <Button className="w-fit" leadingIcon="sliders" onClick={() => setRulesOpen(true)}>
                  {values.rules.length === 0 ? t("form.addRules") : t("configureRules")}
                </Button>
              ) : null}
            </FormSection>

            {/* ── A/B test ───────────────────────────────────────────────── */}
            <FormSection
              id="abTest"
              icon="layer-group"
              title={t("abTest")}
              description={t("form.abDesc")}
              summary={values.abVariants.length > 0 ? t("form.abCount", { count: values.abVariants.length }) : undefined}
              locked={canAbTest ? undefined : t("form.upgradeBadge")}
              invalid={sectionInvalid("abTest")}
              open={openSections.has("abTest")}
              onOpenChange={(open) => setSection("abTest", open)}
            >
              {!canAbTest ? (
                <Callout
                  tone="neutral"
                  icon="lock"
                  title={t("abTestPaywall")}
                  actions={
                    values.abVariants.length > 0 ? (
                      <Button size="sm" onClick={() => setValue("abVariants", [], { shouldDirty: true })}>
                        {t("clearAb")}
                      </Button>
                    ) : (
                      <Button size="sm" leadingIcon="rocket" href="/billing">
                        {t("seePlans")}
                      </Button>
                    )
                  }
                />
              ) : (
                <p className="m-0 text-sm leading-6 text-fg-muted">{t("abTestDesc")}</p>
              )}
              {values.abVariants.map((variant, index) => (
                <div key={variant.id} className="flex min-w-0 items-end gap-2">
                  <Field label={t("variant", { n: index + 1 })} info={t("info.variant")} className="min-w-0 flex-1">
                    <Input
                      value={variant.destination}
                      placeholder={t("variantPlaceholder")}
                      disabled={!canAbTest}
                      spellCheck={false}
                      onChange={(event) =>
                        setValue(
                          "abVariants",
                          values.abVariants.map((item, position) =>
                            position === index ? { ...item, destination: event.target.value } : item,
                          ),
                          { shouldDirty: true },
                        )
                      }
                    />
                  </Field>
                  <Field label={t("weight")} info={t("info.weight")} className="w-28">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={variant.weight}
                      disabled={!canAbTest}
                      suffix={
                        abTotal > 0 ? (
                          <span className="numeric text-[11px]">{Math.round(((variant.weight || 0) / abTotal) * 100)}%</span>
                        ) : null
                      }
                      onChange={(event) =>
                        setValue(
                          "abVariants",
                          values.abVariants.map((item, position) =>
                            position === index ? { ...item, weight: Number(event.target.value) || 0 } : item,
                          ),
                          { shouldDirty: true },
                        )
                      }
                    />
                  </Field>
                  <Button
                    variant="ghost"
                    icon
                    aria-label={t("removeVariant")}
                    onClick={() =>
                      setValue(
                        "abVariants",
                        values.abVariants.filter((_, position) => position !== index),
                        { shouldDirty: true },
                      )
                    }
                  >
                    <Icon name="trash" className="text-sm" />
                  </Button>
                </div>
              ))}
              {values.abVariants.length === 1 ? <Callout tone="warn" title={t("abNeedsTwo")} /> : null}
              {errors.abVariants && values.abVariants.length !== 1 ? (
                <Callout tone="danger" title={t("form.abInvalid")} />
              ) : null}
              {canAbTest ? (
                <Button className="w-fit" leadingIcon="plus" onClick={addVariant}>
                  {values.abVariants.length === 0 ? t("form.startAbTest") : t("addVariant")}
                </Button>
              ) : null}
            </FormSection>

            {/* ── Limits & schedule ──────────────────────────────────────── */}
            <FormSection
              id="limits"
              icon="clock"
              title={t("form.limitsTitle")}
              description={t("form.limitsDesc")}
              summary={
                maxClicks !== "" && expiresLabel
                  ? t("form.limitsBoth")
                  : maxClicks !== ""
                    ? t("form.limitsClicks", { count: Number(maxClicks) || 0 })
                    : expiresLabel
                      ? t("form.limitsEnds")
                      : startsLabel
                        ? t("form.limitsStarts")
                        : undefined
              }
              invalid={sectionInvalid("limits")}
              open={openSections.has("limits")}
              onOpenChange={(open) => setSection("limits", open)}
            >
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <FieldBlock
                  label={t("startsAt")}
                  info={t("info.startsAt")}
                  hint={t("startsAtHint")}
                  error={translateMessage(errors.startsAt?.message, t)}
                >
                  {/* Controlled for the same reason as the open mode. */}
                  <DateTimePicker
                    value={values.startsAt ?? ""}
                    onChange={(next) => {
                      clearErrors("startsAt");
                      setValue("startsAt", next, { shouldDirty: true });
                    }}
                    {...pickerLabels}
                  />
                </FieldBlock>
                <FieldBlock
                  label={t("expiresAt")}
                  info={t("info.expiresAt")}
                  hint={t("form.expiresHint")}
                  error={translateMessage(errors.expiresAt?.message, t)}
                >
                  <DateTimePicker
                    value={values.expiresAt}
                    onChange={(next) => {
                      clearErrors("expiresAt");
                      setValue("expiresAt", next, { shouldDirty: true });
                    }}
                    {...pickerLabels}
                  />
                </FieldBlock>
              </div>

              <Field
                label={t("form.maxClicksLabel")}
                info={t("form.maxClicksInfo")}
                optional={tc("optional")}
                error={translateMessage(errors.maxClicks?.message, t)}
                hint={t("form.maxClicksHint")}
              >
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={t("form.maxClicksPlaceholder")}
                  suffix={<span className="text-[13px]">{t("form.maxClicksSuffix")}</span>}
                  wrapperClassName="max-w-xs"
                  {...register("maxClicks")}
                />
              </Field>

              <Field
                label={t("expiredDestination")}
                info={t("info.expiredDestination")}
                optional={tc("optional")}
                error={translateMessage(errors.expiredDestination?.message, t)}
                hint={t("form.expiredDestinationHint")}
              >
                <Input
                  type="url"
                  inputMode="url"
                  spellCheck={false}
                  placeholder={t("expiredPlaceholder")}
                  autoComplete="off"
                  {...register("expiredDestination")}
                />
              </Field>
            </FormSection>

            {/* ── Protection ─────────────────────────────────────────────── */}
            <FormSection
              id="protection"
              icon="lock"
              title={t("form.protectionTitle")}
              description={t("form.protectionDesc")}
              summary={passwordOn ? t("form.protectionOn") : undefined}
              locked={canProtect ? undefined : t("form.upgradeBadge")}
              invalid={sectionInvalid("protection")}
              open={openSections.has("protection")}
              onOpenChange={(open) => setSection("protection", open)}
            >
              <Field
                label={t("password")}
                info={t("info.password")}
                error={errors.password?.message}
                hint={!canProtect ? t("passwordPaywall") : hasPassword ? t("passwordKeep") : t("passwordHint")}
              >
                <SecretInput
                  domName="link-gate-password"
                  disabled={!canProtect}
                  placeholder={hasPassword ? t("form.passwordKeepPlaceholder") : t("form.passwordPlaceholder")}
                  ref={passwordField.ref}
                  onChange={passwordField.onChange}
                  onBlur={passwordField.onBlur}
                />
              </Field>
              {hasPassword && canProtect ? (
                <Button
                  size="sm"
                  variant="ghost"
                  leadingIcon="unlock"
                  className="w-fit"
                  onClick={() => setValue("password", "-", { shouldDirty: true })}
                >
                  {values.password === "-" ? t("form.passwordWillBeRemoved") : t("form.removePassword")}
                </Button>
              ) : null}
            </FormSection>

            {/* ── Social preview ─────────────────────────────────────────── */}
            <FormSection
              id="social"
              icon="share-nodes"
              title={t("form.socialTitle")}
              description={t("form.socialDesc")}
              summary={values.cloaked ? t("form.socialCustom") : undefined}
              invalid={sectionInvalid("social")}
              open={openSections.has("social")}
              onOpenChange={(open) => setSection("social", open)}
            >
              <Callout tone="info">{t("form.socialExplain")}</Callout>
              <Field
                label={t("descriptionField")}
                info={t("info.description")}
                optional={tc("optional")}
                error={errors.description?.message}
              >
                <Textarea rows={3} maxLength={1024} {...register("description")} />
              </Field>
              <FieldBlock
                label={t("previewImage")}
                info={t("info.image")}
                hint={t("form.imageHint")}
                error={translateMessage(errors.image?.message, t)}
              >
                <ImageUpload value={values.image} onChange={(url) => setValue("image", url, { shouldDirty: true })} />
              </FieldBlock>
              <ToggleRow
                label={t("cloak")}
                info={t("info.cloak")}
                description={canCloak ? t("cloakDesc") : t("cloakPaywall")}
                control={
                  <Switch
                    checked={values.cloaked}
                    disabled={!canCloak}
                    aria-label={t("cloak")}
                    onCheckedChange={(checked) => setValue("cloaked", checked, { shouldDirty: true })}
                  />
                }
              />
              <ToggleRow
                label={t("noIndex")}
                info={t("info.noIndex")}
                description={t.rich("noIndexDesc", {
                  code: (chunks) => <code className="font-mono text-xs">{chunks}</code>,
                })}
                control={
                  <Switch
                    checked={values.noIndex}
                    aria-label={t("noIndex")}
                    onCheckedChange={(checked) => setValue("noIndex", checked, { shouldDirty: true })}
                  />
                }
              />
            </FormSection>

            {/* ── Folder & tags ──────────────────────────────────────────── */}
            <FormSection
              id="organize"
              icon="folder"
              title={t("form.organizeTitle")}
              description={t("form.organizeDesc")}
              summary={
                folderName ??
                (tags.length > 0 ? t("form.tagsCount", { count: tags.length }) : undefined)
              }
              invalid={sectionInvalid("organize")}
              open={openSections.has("organize")}
              onOpenChange={(open) => setSection("organize", open)}
            >
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <Field
                  label={t("folder")}
                  info={t("info.folder")}
                  error={translateMessage(errors.folderId?.message, t)}
                  hint={folders.length === 0 ? t("form.noFoldersHint") : undefined}
                >
                  <Select {...register("folderId")}>
                    <option value="">{t("noFolder")}</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("tags")} info={t("info.tags")} hint={t("tagsHint")} error={errors.tagsText?.message}>
                  <Input placeholder={t("tagsPlaceholder")} maxLength={512} {...register("tagsText")} />
                </Field>
              </div>
            </FormSection>

            {/* ── Notes ──────────────────────────────────────────────────── */}
            <FormSection
              id="notes"
              icon="file-lines"
              title={t("notes")}
              description={t("form.notesDesc")}
              summary={values.comments.trim() !== "" ? t("form.notesAdded") : undefined}
              invalid={sectionInvalid("notes")}
              open={openSections.has("notes")}
              onOpenChange={(open) => setSection("notes", open)}
            >
              <Field label={t("notes")} info={t("info.notes")} error={errors.comments?.message}>
                <Textarea rows={4} maxLength={2048} placeholder={t("form.notesPlaceholder")} {...register("comments")} />
              </Field>
            </FormSection>
          </div>

          {mode === "edit" ? (
            <div id="section-status" className="flex min-w-0 scroll-mt-24 flex-col gap-6">
              <SectionCard title={t("form.statusTitle")} description={t("form.statusDesc")}>
                <SettingsRow label={t("form.pauseLabel")} description={t("archiveDesc")} info={t("info.archive")}>
                  <Switch
                    checked={values.archived}
                    aria-label={t("form.pauseLabel")}
                    className="md:ml-auto"
                    onCheckedChange={(checked) => setValue("archived", checked, { shouldDirty: true })}
                  />
                </SettingsRow>
              </SectionCard>
              {canDelete ? (
                <SectionCard tone="danger" title={t("form.dangerTitle")} description={t("form.dangerDesc")}>
                  <SettingsRow label={t("form.deleteLabel")} description={t("form.deleteDesc")}>
                    <Button variant="danger" leadingIcon="trash" className="md:ml-auto md:w-fit" onClick={() => setDeleteOpen(true)}>
                      {t("form.deleteButton")}
                    </Button>
                  </SettingsRow>
                </SectionCard>
              ) : null}
            </div>
          ) : null}

          <SaveBar
            dirty={isDirty || mode === "create"}
            saving={isSubmitting}
            message={
              mode === "create"
                ? values.destination.trim() === ""
                  ? t("form.addDestinationFirst")
                  : t("readyToCreate")
                : tc("unsavedChanges")
            }
            actions={
              <>
                {mode === "create" ? (
                  <Button size="sm" variant="ghost" href="/links">
                    {tc("cancel")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      reset(initialValues);
                      setFormError(null);
                    }}
                    disabled={isSubmitting}
                  >
                    {t("discard")}
                  </Button>
                )}
                <Button size="sm" variant="primary" type="submit" loading={isSubmitting}>
                  {mode === "create" ? t("createLink") : t("saveChanges")}
                </Button>
              </>
            }
          />
        </form>

        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-20">
          <Card
            title={t("form.previewTitle")}
            description={values.cloaked ? t("form.previewCustom") : t("form.previewFromPage")}
          >
            <SocialPreviewCard
              title={preview.title}
              description={preview.description}
              image={previewImage}
              domain={preview.domain || t("form.previewNoDomain")}
              loading={metaStatus === "loading"}
            />
          </Card>
          <Card title={t("form.summaryTitle")} description={t("form.summaryDesc")}>
            <BehaviourSummary items={summary} />
          </Card>
          {aside}
        </aside>
      </div>

      <Sheet
        open={rulesOpen}
        side="right"
        size="lg"
        title={t("targetingRules")}
        description={t("rulesSheetDesc")}
        onClose={() => setRulesOpen(false)}
        footer={
          <Button variant="primary" onClick={() => setRulesOpen(false)}>
            {tc("done")}
          </Button>
        }
      >
        <RuleBuilder
          rules={values.rules}
          disabled={!canTarget}
          onChange={(rules) => {
            clearErrors("rules");
            setValue("rules", rules, { shouldDirty: true });
          }}
        />
      </Sheet>

      {mode === "edit" && linkId ? (
        <ConfirmDialog
          open={deleteOpen}
          title={t("list.deleteTitle", { slug: initialValues.slug })}
          description={t("list.deleteBody")}
          confirmLabel={t("list.deleteConfirm")}
          loading={deleting}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => {
            setDeleting(true);
            deleteLinkAction(linkId)
              .then((result) => {
                if (!result.ok) {
                  toast.error(actionMessage(result.error));
                  setDeleting(false);
                  return;
                }
                toast.success(t("list.deleted", { slug: initialValues.slug }));
                router.push("/links");
              })
              .catch(() => {
                toast.error(actionMessage("generic"));
                setDeleting(false);
              });
          }}
        />
      ) : null}
    </>
  );
}
