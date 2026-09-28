"use client";

import {
  QR_DOT_STYLES,
  QR_ERROR_LEVELS,
  QR_FRAME_TEXT_MAX,
  QR_FRAMES,
  QR_PAYLOAD_KINDS,
  type QrFrame,
  type QrPayloadKind,
  type QrStyle,
} from "@short/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Icon } from "@/components/kit/icon";
import { ImageUpload } from "@/components/media/image-upload";
import {
  Badge,
  Button,
  Callout,
  Card,
  Chip,
  ConfirmDialog,
  CopyButton,
  Disclosure,
  Field,
  Input,
  Modal,
  PageHeader,
  SaveBar,
  SecretInput,
  SectionCard,
  Segmented,
  Select,
  Switch,
  toast,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { cn } from "@/lib/cx";
import { getQrLogoPreset, qrLogoPresetUrl } from "@/lib/qr-logo-presets";
import {
  applyQrStyleToForm,
  previewQrPayload,
  qrFormSchema,
  toQrStyle,
  type QrFormValues,
} from "@/lib/qr-form";
import { buildQrSvg, qrPrintWidthCm } from "@/lib/qr-svg";
import type { QrTemplateView } from "@/lib/qr-templates";
import {
  createQrCodeAction,
  deleteQrCodeAction,
  deleteQrTemplateAction,
  saveQrTemplateAction,
  updateQrCodeAction,
} from "./actions";
import {
  ColorControl,
  ControlLabel,
  LinkPicker,
  OptionGroup,
  QrGlyph,
  Slider,
  StepCard,
  SvgMarkup,
  SwitchRow,
  type QrLinkOption,
} from "./designer-parts";
import { QrDownloadMenu } from "./qr-download-menu";
import { useQrDownload, type QrDownloadFormat } from "./qr-download";
import { QR_KIND_ICONS } from "./qr-kinds";
import {
  contrastRatio,
  MIN_SCAN_CONTRAST,
  QR_PALETTES,
  scanQuality,
  type QrPaletteId,
  type ScanQualityKind,
} from "./qr-presets";

export type { QrLinkOption };

type QrDesignerProps = {
  mode: "create" | "edit";
  qrId?: string;
  defaultValues: QrFormValues;
  links: QrLinkOption[];
  /** `qrLogo` is a paid feature; the UI explains it instead of failing on submit. */
  canUseLogo: boolean;
  templates: QrTemplateView[];
};

/** PNG/PDF widths offered for download; 4096 is for large-format print. */
const DOWNLOAD_SIZES = [512, 1024, 2048, 4096] as const;

/**
 * A new code has no id yet, but the `?qr=<uuid>` marker changes the module count. This
 * stand-in keeps the preview the same density as the saved code will be.
 */
const PLACEHOLDER_QR_ID = "00000000-0000-0000-0000-000000000000";

/** Tiny fixed payload for the frame option thumbnails. */
const THUMB_PAYLOAD = "https://kisa.ly";

/** Past this share of the width a logo starts eating the data scanners need. */
const LOGO_LARGE = 0.25;

const QUALITY_LABEL_KEYS: Record<ScanQualityKind, `quality.${ScanQualityKind}`> = {
  invalid: "quality.invalid",
  fail: "quality.fail",
  low: "quality.low",
  inverted: "quality.inverted",
  good: "quality.good",
};

/** Ready-made logos offered in one click, picked for what the code is for. */
const QUICK_LOGOS: Record<QrPayloadKind, string[]> = {
  link: ["instagram", "whatsapp", "tiktok", "youtube", "facebook", "website", "menu", "review"],
  url: ["website", "instagram", "whatsapp", "youtube", "menu", "shop", "pdf", "review"],
  vcard: ["vcard", "phone", "email", "linkedin", "whatsapp", "website"],
  wifi: ["wifi", "coffee", "menu", "heart", "location", "website"],
};

/** Frame label suggestions per content type (keys under `qr.frameSuggest`). */
const FRAME_SUGGESTIONS: Record<QrPayloadKind, ("scanMe" | "menu" | "follow" | "offer" | "wifi" | "contact")[]> = {
  link: ["scanMe", "menu", "follow", "offer"],
  url: ["scanMe", "menu", "offer"],
  vcard: ["scanMe", "contact"],
  wifi: ["scanMe", "wifi"],
};

function normalizeHex(value: string | null | undefined): string | null {
  return value ? value.trim().toLowerCase() : null;
}

/** Whether the form currently looks exactly like a saved template. */
function matchesTemplate(style: Partial<QrStyle>, values: QrFormValues): boolean {
  const current = toQrStyle(values);
  return (
    normalizeHex(style.foreground) === normalizeHex(current.foreground) &&
    normalizeHex(style.background) === normalizeHex(current.background) &&
    normalizeHex(style.cornerColor) === normalizeHex(current.cornerColor) &&
    style.dotStyle === current.dotStyle &&
    (style.logoUrl ?? null) === current.logoUrl &&
    (style.frame ?? "none") === current.frame &&
    (style.frameText ?? "") === current.frameText &&
    normalizeHex(style.frameColor) === normalizeHex(current.frameColor) &&
    (style.caption ?? "") === current.caption
  );
}

export function QrDesigner({
  mode,
  qrId,
  defaultValues,
  links,
  canUseLogo,
  templates,
}: QrDesignerProps) {
  const router = useRouter();
  const t = useTranslations("qr");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const locale = useLocale();
  const kindLabelId = useId();
  const linkLabelId = useId();
  const paletteLabelId = useId();
  const shapeLabelId = useId();
  const frameLabelId = useId();
  const formatLabelId = useId();

  const [formError, setFormError] = useState<{ message: string; upgrade: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<QrDownloadFormat>("png");
  const [downloadSize, setDownloadSize] = useState<number>(() =>
    DOWNLOAD_SIZES.includes(defaultValues.size as (typeof DOWNLOAD_SIZES)[number]) ? defaultValues.size : 1024,
  );
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<QrTemplateView | null>(null);
  const [mobilePreview, setMobilePreview] = useState(false);
  const { download, pending: downloading } = useQrDownload();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    clearErrors,
    trigger,
    formState: { errors, isDirty, isSubmitting, dirtyFields },
  } = useForm<QrFormValues>({
    resolver: zodResolver(qrFormSchema),
    defaultValues,
  });

  const wifiPasswordField = register("wifiPassword");
  const values = watch();
  const set = useCallback(
    <K extends keyof QrFormValues>(name: K, value: QrFormValues[K]) =>
      setValue(name, value as never, { shouldDirty: true, shouldValidate: name in errors }),
    [setValue, errors],
  );

  const kind = values.payloadKind;
  const isLink = kind === "link";
  const target = links.find((link) => link.id === values.linkId);
  const frame: QrFrame = values.frame ?? "none";
  const frameText = values.frameText ?? "";
  const hasLogo = values.logoUrl !== "";
  const style = toQrStyle(values);

  const payload = useMemo(() => {
    if (isLink) {
      return `${target?.url ?? "https://kisa.ly/example"}?qr=${qrId ?? PLACEHOLDER_QR_ID}`;
    }
    return previewQrPayload(values) || "https://example.com";
  }, [isLink, qrId, target?.url, values]);

  // The same renderer as the exports; only the logo is loaded by the browser here
  // instead of being inlined.
  const svg = useMemo(() => {
    try {
      return buildQrSvg(payload, style, {
        logoHref: hasLogo ? values.logoUrl : null,
        size: 320,
      });
    } catch {
      return null;
    }
    // `style` is rebuilt every render from `values`; it is covered by `values`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, values, hasLogo]);

  // Frame choices drawn with the real renderer in the current colours.
  const frameThumbs = useMemo(() => {
    const thumbs = {} as Record<QrFrame, string | null>;
    for (const option of QR_FRAMES) {
      try {
        thumbs[option] = buildQrSvg(
          THUMB_PAYLOAD,
          {
            ...style,
            logoUrl: null,
            caption: "",
            margin: option === "none" ? 2 : 1,
            frame: option,
            frameText: option === "none" ? "" : frameText.trim() || t("frameSuggest.scanMe"),
          },
          { size: 120 },
        );
      } catch {
        thumbs[option] = null;
      }
    }
    return thumbs;
    // Only the colours, shape and label change the thumbnails.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style.foreground, style.background, style.cornerColor, style.frameColor, style.dotStyle, frameText, t]);

  const quality = scanQuality(values.foreground, values.background);
  const qualityLabel = t(QUALITY_LABEL_KEYS[quality.kind]);
  const ratio = contrastRatio(values.foreground, values.background);
  const cornerRatio = values.useCustomCorners ? contrastRatio(values.cornerColor, values.background) : null;
  const frameAccent = style.frameColor ?? values.foreground;
  const frameRatio =
    frame !== "none" && frameText.trim() !== "" ? contrastRatio(frameAccent, values.background) : null;
  const logoLarge = hasLogo && values.logoScale > LOGO_LARGE;
  const activePalette: QrPaletteId | "" =
    QR_PALETTES.find(
      (palette) =>
        normalizeHex(values.foreground) === palette.foreground &&
        normalizeHex(values.background) === palette.background &&
        (palette.corner == null
          ? !values.useCustomCorners
          : values.useCustomCorners && normalizeHex(values.cornerColor) === palette.corner),
    )?.id ?? "";

  const fieldError = useCallback(
    (message: string | undefined): string | undefined => {
      switch (message) {
        case undefined:
        case "":
          return undefined;
        case "nameRequired":
        case "vcardName":
          return t("nameRequired");
        case "linkRequired":
          return t("linkRequired");
        case "hexColor":
          return t("hexColor");
        case "payloadUrl":
          return t("payloadUrlInvalid");
        case "vcardEmail":
          return t("vcardEmailInvalid");
        case "wifiSsid":
          return t("wifiSsidRequired");
        case "frameTextTooLong":
          return t("frameTextTooLong");
        default:
          return te("validation");
      }
    },
    [t, te],
  );

  /** Runs the server action; returns the saved id, or null after showing why not. */
  const persist = useCallback(
    async (formValues: QrFormValues): Promise<string | null> => {
      setFormError(null);
      if (svg === null) {
        setFormError({ message: t("payloadTooLongSave"), upgrade: false });
        return null;
      }
      let result: Awaited<ReturnType<typeof createQrCodeAction>>;
      try {
        result =
          mode === "create"
            ? await createQrCodeAction(formValues)
            : await updateQrCodeAction(qrId ?? "", formValues);
      } catch {
        setFormError({ message: actionMessage("generic"), upgrade: false });
        return null;
      }

      if (!result.ok) {
        const fields = result.fieldErrors ?? {};
        if (fields.payload?.[0] === "payloadTooLong") {
          setFormError({ message: t("payloadTooLongSave"), upgrade: false });
          return null;
        }
        for (const [path, messages] of Object.entries(fields)) {
          if (path in formValues) {
            setError(path as keyof QrFormValues, { type: "server", message: messages[0] ?? "" });
          }
        }
        setFormError({ message: actionMessage(result.error), upgrade: result.error === "quota" });
        return null;
      }
      return result.data.id;
    },
    [actionMessage, mode, qrId, setError, svg, t],
  );

  const onInvalid = useCallback(() => {
    toast.error(t("fixErrorsTitle"), t("fixErrorsBody"));
  }, [t]);

  const onSubmit = handleSubmit(async (formValues) => {
    const id = await persist(formValues);
    if (!id) {
      return;
    }
    if (mode === "create") {
      toast.success(t("createdToast"));
      router.push(`/qr/${id}`);
      return;
    }
    reset(formValues);
    toast.success(t("savedToast"));
    router.refresh();
  }, onInvalid);

  /** Downloads read the saved design, so unsaved edits are saved first. */
  const saveBeforeDownload = useCallback(
    (): Promise<boolean> =>
      isDirty
        ? new Promise<boolean>((resolve) => {
            void handleSubmit(
              async (formValues) => {
                const id = await persist(formValues);
                if (!id) {
                  resolve(false);
                  return;
                }
                reset(formValues);
                router.refresh();
                resolve(true);
              },
              () => {
                onInvalid();
                resolve(false);
              },
            )();
          })
        : Promise.resolve(true),
    [handleSubmit, isDirty, onInvalid, persist, reset, router],
  );

  async function runDownload(): Promise<void> {
    if (!qrId || !(await saveBeforeDownload())) {
      return;
    }
    await download(qrId, downloadFormat, downloadFormat === "svg" ? undefined : downloadSize);
  }

  function chooseKind(next: QrPayloadKind): void {
    set("payloadKind", next);
    if (next === "link" && values.linkId === "" && links[0]) {
      set("linkId", links[0].id);
    }
    setFormError(null);
    clearErrors();
  }

  function applyTemplate(template: QrTemplateView): void {
    const logoBlocked = !canUseLogo && template.style.logoUrl != null && template.style.logoUrl !== "";
    // A template made on a plan with logos still applies after a downgrade, minus the
    // logo: saving it would otherwise fail on the plan check.
    applyQrStyleToForm(setValue, {
      ...template.style,
      logoUrl: logoBlocked ? (hasLogo ? values.logoUrl : null) : template.style.logoUrl,
    });
    if (logoBlocked) {
      toast.info(t("templateLogoSkipped"));
    }
  }

  async function remove(): Promise<void> {
    if (!qrId) {
      return;
    }
    setDeleting(true);
    const result = await deleteQrCodeAction(qrId).catch(() => null);
    if (!result?.ok) {
      setDeleting(false);
      setConfirmDelete(false);
      toast.error(t("deleteFailed"), actionMessage(result?.error));
      return;
    }
    toast.success(t("deletedToast"));
    router.push("/qr");
  }

  function closeTemplateModal(): void {
    setSaveTemplateOpen(false);
    setTemplateName("");
    setTemplateError(null);
  }

  function saveTemplate(): void {
    const name = templateName.trim();
    if (name === "" || templateBusy) {
      return;
    }
    void (async () => {
      setTemplateBusy(true);
      setTemplateError(null);
      try {
        const valid = await trigger(["foreground", "background", "cornerColor", "frameColor", "frameText"]);
        if (!valid) {
          setTemplateError(t("templateFixColours"));
          return;
        }
        const result = await saveQrTemplateAction(name, values);
        if (!result.ok) {
          setTemplateError(result.error === "quota" ? t("templateLogoPaid") : t("templateSaveFailed"));
          return;
        }
        closeTemplateModal();
        toast.success(t("templateSavedToast", { name: result.data.name }));
        router.refresh();
      } catch {
        setTemplateError(t("templateSaveFailed"));
      } finally {
        setTemplateBusy(false);
      }
    })();
  }

  function deleteTemplate(): void {
    const template = templateToDelete;
    if (!template) {
      return;
    }
    void (async () => {
      setTemplateBusy(true);
      try {
        const result = await deleteQrTemplateAction(template.id);
        if (!result.ok && result.error !== "not_found") {
          toast.error(t("templateDeleteFailed"));
          return;
        }
        toast.success(t("templateDeletedToast", { name: template.name }));
        setTemplateToDelete(null);
        router.refresh();
      } catch {
        toast.error(t("templateDeleteFailed"));
      } finally {
        setTemplateBusy(false);
      }
    })();
  }

  /* ── Preview ─────────────────────────────────────────────────────────── */

  const previewLabel = t("previewAria", { name: values.name || t("thisCode") });
  const opensText = isLink
    ? target
      ? target.shortLabel
      : t("previewNoLink")
    : kind === "url"
      ? payload
      : kind === "wifi"
        ? t("opensWifi", { name: values.wifiSsid || "…" })
        : t("opensContact", { name: values.vcardName || "…" });

  const previewStage = (large: boolean) =>
    svg ? (
      <SvgMarkup
        svg={svg}
        label={previewLabel}
        className={cn(
          "w-full [&>svg]:rounded-sm [&>svg]:shadow-card",
          large ? "max-w-72" : "max-w-60",
        )}
      />
    ) : (
      <div className="flex aspect-square w-full max-w-60 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-danger-border bg-danger-surface px-5 text-center">
        <Icon name="warning" className="text-base text-danger" />
        <p className="m-0 text-sm font-medium text-danger-ink">{t("payloadTooLong")}</p>
        <p className="m-0 text-[13px] leading-5 text-fg-muted">{t("payloadTooLongHint")}</p>
      </div>
    );

  const qualityBadge = (
    <Badge tone={quality.tone} dot>
      {qualityLabel}
    </Badge>
  );

  /* ── Header ──────────────────────────────────────────────────────────── */

  const kindBadge = (
    <Badge tone={isLink ? "accent" : "neutral"}>
      <span className="inline-flex items-center gap-1">
        <Icon name={QR_KIND_ICONS[kind]} className="text-[10px]" />
        {t(`payload.${kind}`)}
      </span>
    </Badge>
  );

  const header =
    mode === "create" ? (
      <PageHeader
        back={{ href: "/qr", label: t("title") }}
        title={t("designTitle")}
        description={t("designDesc")}
      />
    ) : (
      <PageHeader
        back={{ href: "/qr", label: t("title") }}
        title={values.name.trim() || t("untitled")}
        meta={kindBadge}
        description={
          isLink && target ? t("encodes", { url: target.url.replace(/^https?:\/\//, "") }) : t("staticDesc")
        }
        secondaryActions={
          isLink && values.linkId ? (
            <Button leadingIcon="chart-line" href={`/links/${values.linkId}/stats`}>
              {t("scanStats")}
            </Button>
          ) : null
        }
        actions={
          qrId ? (
            <QrDownloadMenu
              qrId={qrId}
              name={values.name}
              size={downloadSize}
              buttonSize="md"
              beforeDownload={saveBeforeDownload}
            />
          ) : null
        }
      />
    );

  const printCm = qrPrintWidthCm(downloadSize);

  return (
    <form
      className="flex min-w-0 flex-col gap-6"
      autoComplete="off"
      noValidate
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      {header}

      {formError ? (
        <Callout
          tone="danger"
          title={formError.message}
          actions={
            formError.upgrade ? (
              <Button size="sm" leadingIcon="rocket" href="/billing">
                {tc("seePlans")}
              </Button>
            ) : null
          }
          onDismiss={() => setFormError(null)}
        />
      ) : null}

      {/*
        Two columns only from xl: next to the 16rem sidebar a 1024px screen leaves too
        little room for the controls, so up to xl the preview rides along in a sticky strip.
      */}
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Phones and tablets: the preview rides along at the top, collapsed to a thumbnail. */}
          <div className="sticky top-[4.25rem] z-10 xl:hidden">
            <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-elevated/95 p-3 shadow-pop backdrop-blur-md">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-default border border-border-subtle bg-surface p-1">
                  {svg ? (
                    <SvgMarkup svg={svg} className="w-full" />
                  ) : (
                    <Icon name="warning" className="text-sm text-danger" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-medium text-ink">
                    {values.name.trim() || t("untitled")}
                  </span>
                  <span className="flex">{qualityBadge}</span>
                </span>
                <Button
                  size="sm"
                  leadingIcon={mobilePreview ? "eye-slash" : "eye"}
                  aria-expanded={mobilePreview}
                  onClick={() => setMobilePreview((open) => !open)}
                >
                  {mobilePreview ? t("hidePreview") : t("showPreview")}
                </Button>
              </div>
              {mobilePreview ? (
                <div className="flex justify-center rounded-md bg-surface p-4">{previewStage(false)}</div>
              ) : null}
            </div>
          </div>

          {/* 1 · Content */}
          <StepCard id="qr-content" step={1} title={t("stepContent")} description={t("stepContentDesc")}>
            <Field
              label={t("name")}
              info={t("info.name")}
              hint={t("nameHint")}
              error={fieldError(errors.name?.message)}
              required
            >
              <Input
                placeholder={t("namePlaceholder")}
                maxLength={120}
                aria-invalid={errors.name ? true : undefined}
                {...register("name")}
              />
            </Field>

            <div className="flex min-w-0 flex-col gap-2">
              <ControlLabel id={kindLabelId} label={t("payloadKind")} info={t("info.payloadKind")} />
              <OptionGroup<QrPayloadKind>
                labelledBy={kindLabelId}
                value={kind}
                onChange={chooseKind}
                className="sm:grid-cols-2"
                options={QR_PAYLOAD_KINDS.map((option) => ({
                  id: option,
                  icon: QR_KIND_ICONS[option],
                  title: t(`kindCard.${option}.title`),
                  description: t(`kindCard.${option}.desc`),
                  badge:
                    option === "link" ? (
                      <Badge tone="accent" size="sm">
                        {t("kindCard.recommended")}
                      </Badge>
                    ) : null,
                }))}
              />
            </div>

            {isLink ? (
              links.length === 0 ? (
                <Callout
                  tone="info"
                  icon="link"
                  title={t("needLinkTitle")}
                  actions={
                    <Button size="sm" leadingIcon="plus" href="/links/new">
                      {t("createLink")}
                    </Button>
                  }
                >
                  {t("needLinkDesc")}
                </Callout>
              ) : (
                <div className="flex min-w-0 flex-col gap-2">
                  <ControlLabel id={linkLabelId} label={t("shortLink")} info={t("info.shortLink")} />
                  <LinkPicker
                    links={links}
                    value={values.linkId}
                    labelledBy={linkLabelId}
                    error={fieldError(errors.linkId?.message)}
                    onChange={(id) => set("linkId", id)}
                  />
                  <span className="text-[13px] leading-5 text-fg-subtle">{t("shortLinkHint")}</span>
                </div>
              )
            ) : null}

            {kind === "url" ? (
              <Field
                label={t("payloadUrl")}
                info={t("info.payloadUrl")}
                hint={t("payloadUrlHint")}
                error={fieldError(errors.payloadUrl?.message)}
                required
              >
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com"
                  aria-invalid={errors.payloadUrl ? true : undefined}
                  {...register("payloadUrl")}
                />
              </Field>
            ) : null}

            {kind === "vcard" ? (
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <Field
                  label={t("vcardName")}
                  info={t("info.vcardName")}
                  className="sm:col-span-2"
                  error={fieldError(errors.vcardName?.message)}
                  required
                >
                  <Input autoComplete="off" {...register("vcardName")} />
                </Field>
                <Field label={t("vcardOrg")} info={t("info.vcardOrg")} optional={tc("optional")}>
                  <Input {...register("vcardOrg")} />
                </Field>
                <Field label={t("vcardPhone")} info={t("info.vcardPhone")} optional={tc("optional")}>
                  <Input type="tel" inputMode="tel" placeholder="+90 555 000 00 00" {...register("vcardPhone")} />
                </Field>
                <Field
                  label={t("vcardEmail")}
                  info={t("info.vcardEmail")}
                  optional={tc("optional")}
                  error={fieldError(errors.vcardEmail?.message)}
                >
                  <Input type="email" inputMode="email" {...register("vcardEmail")} />
                </Field>
                <Field label={t("vcardUrl")} info={t("info.vcardUrl")} optional={tc("optional")}>
                  <Input type="url" inputMode="url" placeholder="https://" {...register("vcardUrl")} />
                </Field>
              </div>
            ) : null}

            {kind === "wifi" ? (
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <Field
                  label={t("wifiSsid")}
                  info={t("info.wifiSsid")}
                  error={fieldError(errors.wifiSsid?.message)}
                  required
                >
                  <Input {...register("wifiSsid")} />
                </Field>
                <Field label={t("wifiPassword")} info={t("info.wifiPassword")}>
                  <SecretInput
                    domName="qr-wifi-password"
                    ref={wifiPasswordField.ref}
                    onChange={wifiPasswordField.onChange}
                    onBlur={wifiPasswordField.onBlur}
                  />
                </Field>
                <Field label={t("wifiSecurity")} info={t("info.wifiSecurity")}>
                  <Select {...register("wifiSecurity")}>
                    <option value="WPA">WPA/WPA2/WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">{t("wifiOpen")}</option>
                  </Select>
                </Field>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <ControlLabel label={t("wifiHidden")} info={t("info.wifiHidden")} />
                  <span className="flex h-9.5 items-center">
                    <Switch
                      checked={values.wifiHidden}
                      aria-label={t("wifiHidden")}
                      onCheckedChange={(checked) => set("wifiHidden", checked)}
                    />
                  </span>
                </div>
              </div>
            ) : null}

            {!isLink ? (
              <Callout
                tone="neutral"
                icon="lock"
                title={t("staticTitle")}
                actions={
                  links.length > 0 ? (
                    <Button size="sm" leadingIcon="link" onClick={() => chooseKind("link")}>
                      {t("useShortLink")}
                    </Button>
                  ) : null
                }
              >
                {t("staticBody")}
              </Callout>
            ) : null}
          </StepCard>

          {/* 2 · Style */}
          <StepCard id="qr-style" step={2} title={t("stepStyle")} description={t("stepStyleDesc")}>
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <ControlLabel label={t("templatesTitle")} info={t("info.templates")} />
                <Button size="sm" variant="ghost" leadingIcon="plus" onClick={() => setSaveTemplateOpen(true)}>
                  {t("saveTemplate")}
                </Button>
              </div>
              {templates.length > 0 ? (
                <ul className="m-0 flex min-w-0 list-none flex-wrap gap-2 p-0">
                  {templates.map((template) => {
                    const active = matchesTemplate(template.style, values);
                    return (
                      <li
                        key={template.id}
                        className={cn(
                          "inline-flex min-w-0 items-stretch overflow-hidden rounded-pill border text-[13px] shadow-xs",
                          active
                            ? "border-accent-border bg-accent-surface font-medium text-accent-on-surface"
                            : "border-border bg-bg text-ink",
                        )}
                      >
                        <button
                          type="button"
                          aria-pressed={active}
                          disabled={templateBusy}
                          className="inline-flex min-w-0 items-center gap-2 py-1 pr-2.5 pl-1.5 transition-colors hover:bg-surface-subtle disabled:opacity-50"
                          onClick={() => applyTemplate(template)}
                        >
                          <QrGlyph
                            foreground={template.style.foreground}
                            background={template.style.background}
                            corner={template.style.cornerColor}
                            dotStyle={template.style.dotStyle}
                            className="size-6 rounded-sm"
                          />
                          <span className="max-w-40 truncate">{template.name}</span>
                        </button>
                        <button
                          type="button"
                          aria-label={t("deleteTemplate", { name: template.name })}
                          disabled={templateBusy}
                          className="inline-flex shrink-0 items-center border-l border-border px-2 text-fg-subtle transition-colors hover:bg-danger-surface hover:text-danger disabled:opacity-50"
                          onClick={() => setTemplateToDelete(template)}
                        >
                          <Icon name="xmark" className="text-[10px]" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="m-0 text-[13px] leading-5 text-fg-subtle">{t("templatesEmpty")}</p>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <ControlLabel id={paletteLabelId} label={t("presets")} info={t("info.palettes")} />
              <OptionGroup<QrPaletteId>
                labelledBy={paletteLabelId}
                layout="tile"
                value={activePalette}
                className="grid-cols-3 sm:grid-cols-5"
                onChange={(id) => {
                  const palette = QR_PALETTES.find((entry) => entry.id === id);
                  if (!palette) {
                    return;
                  }
                  set("foreground", palette.foreground);
                  set("background", palette.background);
                  set("useCustomCorners", palette.corner != null);
                  if (palette.corner) {
                    set("cornerColor", palette.corner);
                  }
                }}
                options={QR_PALETTES.map((palette) => ({
                  id: palette.id,
                  title: <span className="text-xs">{t(`palette.${palette.id}`)}</span>,
                  visual: (
                    <QrGlyph
                      foreground={palette.foreground}
                      background={palette.background}
                      corner={palette.corner}
                      dotStyle={values.dotStyle}
                      className="size-10 rounded-sm ring-1 ring-border-subtle"
                    />
                  ),
                }))}
              />
            </div>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <ColorControl
                label={t("foreground")}
                info={t("info.foreground")}
                pickerAria={t("colourPicker", { label: t("foreground") })}
                error={fieldError(errors.foreground?.message)}
                value={values.foreground}
                onPick={(value) => set("foreground", value)}
                inputProps={register("foreground")}
              />
              <ColorControl
                label={t("background")}
                info={t("info.background")}
                pickerAria={t("colourPicker", { label: t("background") })}
                error={fieldError(errors.background?.message)}
                value={values.background}
                onPick={(value) => set("background", value)}
                inputProps={register("background")}
              />
            </div>

            {quality.kind === "fail" ? (
              <Callout
                tone="danger"
                title={t("contrastFailTitle")}
                actions={
                  <Button
                    size="sm"
                    onClick={() => {
                      set("foreground", "#171717");
                      set("background", "#ffffff");
                    }}
                  >
                    {t("useClassicColours")}
                  </Button>
                }
              >
                {t("contrastFailBody", { ratio: (ratio ?? 1).toFixed(1) })}
              </Callout>
            ) : quality.kind === "low" ? (
              <Callout tone="warn" title={t("contrastLowTitle")}>
                {t("contrastLowBody", { ratio: (ratio ?? 1).toFixed(1) })}
              </Callout>
            ) : quality.kind === "inverted" ? (
              <Callout
                tone="warn"
                title={t("invertedTitle")}
                actions={
                  <Button
                    size="sm"
                    onClick={() => {
                      const { foreground, background } = values;
                      set("foreground", background);
                      set("background", foreground);
                    }}
                  >
                    {t("swapColours")}
                  </Button>
                }
              >
                {t("qualityInvertedAdvice")}
              </Callout>
            ) : null}

            <SwitchRow
              label={t("tintFinders")}
              info={t("info.tintFinders")}
              hint={t("tintFindersHint")}
              checked={values.useCustomCorners}
              onCheckedChange={(checked) => set("useCustomCorners", checked)}
            />

            {values.useCustomCorners ? (
              <ColorControl
                label={t("cornerColour")}
                info={t("info.cornerColour")}
                pickerAria={t("colourPicker", { label: t("cornerColour") })}
                error={fieldError(errors.cornerColor?.message)}
                value={values.cornerColor}
                onPick={(value) => set("cornerColor", value)}
                inputProps={register("cornerColor")}
              />
            ) : null}

            {cornerRatio != null && cornerRatio < MIN_SCAN_CONTRAST ? (
              <Callout tone="danger" title={t("cornerContrastTitle")}>
                {t("cornerContrastBody")}
              </Callout>
            ) : null}

            <div className="flex min-w-0 flex-col gap-2">
              <ControlLabel id={shapeLabelId} label={t("moduleShape")} info={t("info.moduleShape")} />
              <OptionGroup
                labelledBy={shapeLabelId}
                layout="tile"
                value={values.dotStyle}
                className="grid-cols-3"
                onChange={(id) => set("dotStyle", id)}
                options={QR_DOT_STYLES.map((dotStyle) => ({
                  id: dotStyle,
                  title: t(`dotStyle.${dotStyle}`),
                  visual: (
                    <QrGlyph
                      foreground={values.foreground}
                      background={values.background}
                      corner={style.cornerColor}
                      dotStyle={dotStyle}
                      className="size-14 rounded-sm ring-1 ring-border-subtle"
                    />
                  ),
                }))}
              />
            </div>

            <Disclosure variant="plain" title={t("styleAdvanced")} description={t("styleAdvancedDesc")}>
              <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                <Field
                  label={t("errorCorrection")}
                  info={t("info.errorCorrection")}
                  hint={hasLogo ? t("errorLocked") : t("errorHint")}
                >
                  {hasLogo ? (
                    <Select value="H" disabled aria-readonly>
                      <option value="H">{t("errorLevel.H")}</option>
                    </Select>
                  ) : (
                    <Select {...register("errorCorrection")}>
                      {QR_ERROR_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {t(`errorLevel.${level}`)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Slider
                  label={t("quietZone")}
                  info={t("info.quietZone")}
                  readout={t("quietZoneReadout", { count: values.margin })}
                  value={values.margin}
                  min={0}
                  max={8}
                  step={1}
                  hint={values.margin < 2 ? t("quietZoneTight") : undefined}
                  onChange={(value) => set("margin", value)}
                />
              </div>
            </Disclosure>
          </StepCard>

          {/* 3 · Logo */}
          <StepCard
            id="qr-logo"
            step={3}
            title={t("stepLogo")}
            description={t("stepLogoDesc")}
            actions={canUseLogo ? null : <Badge tone="accent">{t("paidPlans")}</Badge>}
          >
            {canUseLogo ? null : (
              <Callout
                tone="accent"
                icon="sparkles"
                title={t("logoUpsellTitle")}
                actions={
                  <Button size="sm" leadingIcon="rocket" href="/billing">
                    {tc("seePlans")}
                  </Button>
                }
              >
                {t("logoUpsellBody")}
              </Callout>
            )}

            <div className="flex min-w-0 flex-col gap-2">
              <ControlLabel label={t("logo")} info={t("info.logo")} />
              <ImageUpload
                value={values.logoUrl}
                presets
                disabled={!canUseLogo}
                previewBackground={values.background}
                hint={t("logoHint")}
                onChange={(url) => set("logoUrl", url)}
              />
              {!canUseLogo && hasLogo ? (
                <Button
                  size="sm"
                  variant="ghost"
                  leadingIcon="trash"
                  className="self-start"
                  onClick={() => set("logoUrl", "")}
                >
                  {t("removeLogo")}
                </Button>
              ) : null}
            </div>

            {canUseLogo ? (
              <div className="flex min-w-0 flex-col gap-2">
                <span className="text-[13px] font-medium text-fg-subtle">{t("quickLogos")}</span>
                <ul className="m-0 flex min-w-0 list-none flex-wrap gap-2 p-0">
                  {QUICK_LOGOS[kind].map((id) => {
                    const url = qrLogoPresetUrl(id);
                    const active = values.logoUrl === url;
                    const preset = getQrLogoPreset(id);
                    const name = preset ? (locale === "tr" ? preset.tr : preset.en) : id;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          aria-pressed={active}
                          aria-label={t("quickLogoAria", { name })}
                          title={name}
                          onClick={() => set("logoUrl", active ? "" : url)}
                          className={cn(
                            "flex size-11 items-center justify-center rounded-md border p-1.5 transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                            active
                              ? "border-accent shadow-[0_0_0_3px_var(--ring)]"
                              : "border-border hover:border-border-hover",
                          )}
                          style={{ background: values.background }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" loading="lazy" className="size-full object-contain" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <Slider
              label={t("logoSize")}
              info={t("info.logoSize")}
              readout={t("logoSizeReadout", { percent: Math.round(values.logoScale * 100) })}
              value={values.logoScale}
              min={0.1}
              max={0.3}
              step={0.01}
              disabled={!hasLogo}
              hint={hasLogo && !logoLarge ? t("logoErrorAuto") : !hasLogo ? t("logoSizeNoLogo") : undefined}
              onChange={(value) => set("logoScale", value)}
            />

            {logoLarge ? (
              <Callout
                tone="warn"
                title={t("logoLargeTitle")}
                actions={
                  <Button size="sm" onClick={() => set("logoScale", 0.22)}>
                    {t("logoUseRecommended")}
                  </Button>
                }
              >
                {t("logoLargeBody")}
              </Callout>
            ) : null}
          </StepCard>

          {/* 4 · Frame */}
          <StepCard id="qr-frame" step={4} title={t("stepFrame")} description={t("stepFrameDesc")}>
            <div className="flex min-w-0 flex-col gap-2">
              <ControlLabel id={frameLabelId} label={t("frameStyle")} info={t("info.frame")} />
              <OptionGroup<QrFrame>
                labelledBy={frameLabelId}
                layout="tile"
                value={frame}
                className="grid-cols-2 sm:grid-cols-4"
                onChange={(id) => {
                  set("frame", id);
                  if (id !== "none" && frameText.trim() === "") {
                    set("frameText", t(`frameSuggest.${FRAME_SUGGESTIONS[kind][0] ?? "scanMe"}`));
                  }
                }}
                options={QR_FRAMES.map((option) => ({
                  id: option,
                  title: t(`frame.${option}`),
                  visual: (
                    <span className="flex h-24 w-full items-center justify-center rounded-sm bg-surface p-2">
                      {frameThumbs[option] ? (
                        <SvgMarkup
                          svg={frameThumbs[option] ?? ""}
                          className="h-full [&>svg]:h-full [&>svg]:w-auto"
                        />
                      ) : null}
                    </span>
                  ),
                }))}
              />
            </div>

            {frame !== "none" ? (
              <>
                <div className="flex min-w-0 flex-col gap-2">
                  <Field
                    label={t("frameText")}
                    info={t("info.frameText")}
                    hint={t("frameTextHint", { count: frameText.length, max: QR_FRAME_TEXT_MAX })}
                    error={fieldError(errors.frameText?.message)}
                  >
                    <Input
                      maxLength={QR_FRAME_TEXT_MAX}
                      placeholder={t("frameTextPlaceholder")}
                      aria-invalid={errors.frameText ? true : undefined}
                      {...register("frameText")}
                    />
                  </Field>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-[13px] text-fg-subtle">{t("frameSuggestions")}</span>
                    {FRAME_SUGGESTIONS[kind].map((key) => {
                      const text = t(`frameSuggest.${key}`);
                      return (
                        <Chip key={key} size="sm" active={frameText === text} onClick={() => set("frameText", text)}>
                          {text}
                        </Chip>
                      );
                    })}
                  </div>
                </div>

                <SwitchRow
                  label={t("frameColourCustom")}
                  info={t("info.frameColour")}
                  hint={t("frameColourHint")}
                  checked={values.useFrameColor ?? false}
                  onCheckedChange={(checked) => {
                    set("useFrameColor", checked);
                    if (checked && !dirtyFields.frameColor) {
                      set("frameColor", values.foreground);
                    }
                  }}
                />
                {values.useFrameColor ? (
                  <ColorControl
                    label={t("frameColour")}
                    info={t("info.frameColour")}
                    pickerAria={t("colourPicker", { label: t("frameColour") })}
                    error={fieldError(errors.frameColor?.message)}
                    value={values.frameColor ?? values.foreground}
                    onPick={(value) => set("frameColor", value)}
                    inputProps={register("frameColor")}
                  />
                ) : null}

                {frameRatio != null && frameRatio < MIN_SCAN_CONTRAST ? (
                  <Callout tone="warn" title={t("frameContrastTitle")}>
                    {t("frameContrastBody")}
                  </Callout>
                ) : null}
              </>
            ) : null}

            <Field
              label={t("caption")}
              info={t("info.caption")}
              hint={t("captionHint", { count: values.caption.length })}
              optional={tc("optional")}
            >
              <Input placeholder={t("captionPlaceholder")} maxLength={60} {...register("caption")} />
            </Field>
          </StepCard>

          {/* 5 · Download */}
          <StepCard id="qr-export" step={5} title={t("stepExport")} description={t("stepExportDesc")}>
            {mode === "create" || !qrId ? (
              <Callout tone="neutral" icon="download" title={t("exportLockedTitle")}>
                {t("exportLockedBody")}
              </Callout>
            ) : (
              <>
                <div className="flex min-w-0 flex-col gap-2">
                  <ControlLabel id={formatLabelId} label={t("fileFormat")} info={t("info.fileFormat")} />
                  <OptionGroup<QrDownloadFormat>
                    labelledBy={formatLabelId}
                    value={downloadFormat}
                    onChange={setDownloadFormat}
                    className="sm:grid-cols-3"
                    options={[
                      { id: "png", icon: "image", title: t("format.png"), description: t("format.pngLong") },
                      { id: "svg", icon: "file-code", title: t("format.svg"), description: t("format.svgLong") },
                      { id: "pdf", icon: "file-lines", title: t("format.pdf"), description: t("format.pdfLong") },
                    ]}
                  />
                </div>

                {downloadFormat === "svg" ? (
                  <p className="m-0 text-[13px] leading-5 text-fg-subtle">{t("svgVector")}</p>
                ) : (
                  <div className="flex min-w-0 flex-col gap-2">
                    <ControlLabel label={t("pngSize")} info={t("info.pngSize")} />
                    <Segmented
                      label={t("pngSize")}
                      value={String(downloadSize)}
                      onChange={(id) => setDownloadSize(Number(id))}
                      className="self-start"
                      items={DOWNLOAD_SIZES.map((size) => ({ id: String(size), label: `${size} px` }))}
                    />
                    <span className="text-[13px] leading-5 text-fg-subtle">
                      {downloadFormat === "pdf"
                        ? t("pdfPrintSize", { cm: printCm })
                        : downloadSize <= 512
                          ? t("sizeHintSmall")
                          : downloadSize <= 1024
                            ? t("sizeHintMedium")
                            : t("sizeHintLarge")}
                    </span>
                  </div>
                )}

                {isDirty ? (
                  <Callout tone="info" title={t("unsavedDownloadTitle")}>
                    {t("unsavedDownloadBody")}
                  </Callout>
                ) : null}

                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Button
                    leadingIcon="download"
                    loading={downloading != null || isSubmitting}
                    onClick={() => void runDownload()}
                  >
                    {isDirty
                      ? t("saveAndDownload", { format: downloadFormat.toUpperCase() })
                      : t("downloadFormat", { format: downloadFormat.toUpperCase() })}
                  </Button>
                </div>
              </>
            )}

            <Disclosure variant="plain" title={t("exportAdvanced")} description={t("exportAdvancedDesc")}>
              <Slider
                label={t("exportSize")}
                info={t("info.exportSize")}
                readout={t("exportSizeReadout", { size: values.size })}
                value={values.size}
                min={128}
                max={2048}
                step={64}
                onChange={(value) => set("size", value)}
              />
            </Disclosure>
          </StepCard>

          {mode === "edit" && qrId ? (
            <SectionCard tone="danger" title={t("deleteTitle")} description={t("deleteHint")} divided={false}>
              <Button
                variant="danger"
                leadingIcon="trash"
                className="self-start"
                onClick={() => setConfirmDelete(true)}
              >
                {t("deleteCode")}
              </Button>
            </SectionCard>
          ) : null}
        </div>

        {/* Desktop: the preview stays in view while every section scrolls past. */}
        <aside className="hidden xl:sticky xl:top-20 xl:block">
          <Card
            title={t("livePreview")}
            actions={qualityBadge}
            footer={
              qrId && mode === "edit" ? (
                <>
                  <span className="text-[13px]">{t("previewFooter")}</span>
                  <QrDownloadMenu
                    qrId={qrId}
                    name={values.name}
                    size={downloadSize}
                    beforeDownload={saveBeforeDownload}
                  />
                </>
              ) : undefined
            }
          >
            <div className="flex justify-center rounded-md border border-border-subtle bg-surface p-6">
              {previewStage(true)}
            </div>

            {quality.kind !== "good" && quality.kind !== "invalid" ? (
              <p
                className={cn(
                  "m-0 flex items-start gap-2 text-[13px] leading-5",
                  quality.tone === "danger" ? "text-danger" : "text-warn-ink",
                )}
              >
                <Icon name="warning" className="mt-0.5 text-xs" />
                {quality.kind === "fail"
                  ? t("qualityFailAdvice")
                  : quality.kind === "low"
                    ? t("qualityLowAdvice")
                    : t("qualityInvertedAdvice")}
              </p>
            ) : null}

            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[13px] font-medium text-fg-subtle">{t("opensLabel")}</span>
              <div className="flex min-w-0 items-center gap-2 rounded-default border border-border bg-surface-subtle px-3 py-2">
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13px] text-ink",
                    ((isLink && target) || kind === "url") && "font-mono",
                  )}
                  title={opensText}
                >
                  {opensText}
                </span>
                {(isLink && target) || kind === "url" ? (
                  <CopyButton value={isLink ? payload : opensText} iconOnly label={t("copyEncoded")} />
                ) : null}
              </div>
              {isLink && target ? (
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] leading-5 text-fg-muted">
                  <Icon name="arrow-right" className="shrink-0 text-[10px] text-fg-subtle" />
                  <span className="min-w-0 truncate" title={target.destination}>
                    {target.destination}
                  </span>
                </span>
              ) : null}
              <span className="flex items-start gap-1.5 text-[13px] leading-5 text-fg-subtle">
                <Icon name={isLink ? "pen" : "lock"} className="mt-1 text-[10px]" />
                {isLink ? t("previewDynamicHint") : t("previewStaticHint")}
              </span>
            </div>
          </Card>
        </aside>
      </div>

      <SaveBar
        dirty={isDirty || mode === "create"}
        saving={isSubmitting}
        message={mode === "create" ? t("readyToCreate") : tc("unsavedChanges")}
        actions={
          <>
            {mode === "edit" ? (
              <Button size="sm" variant="ghost" onClick={() => reset(defaultValues)} disabled={isSubmitting}>
                {t("discard")}
              </Button>
            ) : (
              <Button size="sm" variant="ghost" href="/qr">
                {tc("cancel")}
              </Button>
            )}
            <Button size="sm" type="submit" variant="primary" loading={isSubmitting}>
              {mode === "create" ? t("createCode") : t("saveChanges")}
            </Button>
          </>
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc", { name: values.name || t("untitled") })}
        confirmLabel={t("deleteCode")}
        loading={deleting}
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
      >
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-sm text-fg-muted">
          <li>{isLink ? t("deleteBullet1") : t("deleteBulletStatic")}</li>
          <li>{t("deleteBullet2")}</li>
          <li>{t("deleteBullet3")}</li>
        </ul>
      </ConfirmDialog>

      <ConfirmDialog
        open={templateToDelete != null}
        title={t("deleteTemplateTitle")}
        description={t("deleteTemplateDesc", { name: templateToDelete?.name ?? "" })}
        confirmLabel={t("deleteTemplateConfirm")}
        loading={templateBusy}
        onConfirm={deleteTemplate}
        onClose={() => setTemplateToDelete(null)}
      />

      <Modal
        open={saveTemplateOpen}
        icon="palette"
        title={t("saveTemplateTitle")}
        description={t("saveTemplateDesc")}
        onClose={closeTemplateModal}
        footer={
          <>
            <Button disabled={templateBusy} onClick={closeTemplateModal}>
              {tc("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={templateBusy}
              disabled={templateName.trim().length === 0}
              onClick={saveTemplate}
            >
              {t("saveTemplateConfirm")}
            </Button>
          </>
        }
      >
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 items-center gap-3 rounded-md border border-border-subtle bg-surface-subtle p-3">
            <QrGlyph
              foreground={values.foreground}
              background={values.background}
              corner={style.cornerColor}
              dotStyle={values.dotStyle}
              className="size-10 shrink-0 rounded-sm"
            />
            <span className="text-[13px] leading-5 text-fg-muted">{t("saveTemplateIncludes")}</span>
          </div>
          <Field label={t("templateName")} info={t("info.templateName")} error={templateError ?? undefined}>
            <Input
              value={templateName}
              maxLength={120}
              placeholder={t("templateNamePlaceholder")}
              onChange={(event) => setTemplateName(event.target.value)}
              onKeyDown={(event) => {
                // The modal renders inside the designer's <form>; Enter must not
                // submit (and create) the QR code itself.
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveTemplate();
                }
              }}
            />
          </Field>
        </div>
      </Modal>
    </form>
  );
}
