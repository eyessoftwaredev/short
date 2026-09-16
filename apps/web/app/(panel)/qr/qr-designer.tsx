"use client";

import { Icon } from "@/components/kit/icon";

import { QR_DOT_STYLES, QR_ERROR_LEVELS } from "@short/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type ReactNode } from "react";
import { useActionMessage } from "@/lib/action-message";
import { useForm } from "react-hook-form";
import {
  Badge,
  Button,
  Card,
  Chip,
  CopyButton,
  Field,
  Input,
  Modal,
  SaveBar,
  Select,
  Switch,
} from "@/components/ui";
import { buildQrSvg } from "@/lib/qr-svg";
import { cn } from "@/lib/cx";
import { qrFormSchema, toQrStyle, type QrFormValues } from "@/lib/qr-form";
import { createQrCodeAction, deleteQrCodeAction, updateQrCodeAction } from "./actions";
import { QR_PALETTES, scanQuality, type ScanQualityKind } from "./qr-presets";

export type QrLinkOption = { id: string; label: string; url: string };

type QrDesignerProps = {
  mode: "create" | "edit";
  qrId?: string;
  defaultValues: QrFormValues;
  links: QrLinkOption[];
  /** `qrLogo` is a paid feature; the UI explains it instead of failing on submit. */
  canUseLogo: boolean;
};

const EXPORT_SIZES = [512, 1024, 2048] as const;

/**
 * A new code has no id yet, but the `?qr=<uuid>` marker changes the module count. This
 * stand-in keeps the preview the same density as the saved code will be.
 */
const PLACEHOLDER_QR_ID = "00000000-0000-0000-0000-000000000000";

const DOT_STYLE_KEYS = {
  square: "dotStyle.square",
  rounded: "dotStyle.rounded",
  dots: "dotStyle.dots",
} as const;

const ERROR_LEVEL_KEYS = {
  L: "errorLevel.L",
  M: "errorLevel.M",
  Q: "errorLevel.Q",
  H: "errorLevel.H",
} as const;

const PALETTE_KEYS = {
  classic: "palette.classic",
  teal: "palette.teal",
  navy: "palette.navy",
  plum: "palette.plum",
  forest: "palette.forest",
  inverted: "palette.inverted",
} as const;

const QUALITY_LABEL_KEYS: Record<ScanQualityKind, "quality.invalid" | "quality.fail" | "quality.low" | "quality.inverted" | "quality.good"> = {
  invalid: "quality.invalid",
  fail: "quality.fail",
  low: "quality.low",
  inverted: "quality.inverted",
  good: "quality.good",
};

function qrFieldError(
  message: string | undefined,
  t: (key: string) => string,
  te: (key: string) => string,
): string | undefined {
  if (!message) {
    return undefined;
  }
  if (message === "nameRequired") {
    return t("nameRequired");
  }
  if (message === "linkRequired") {
    return t("linkRequired");
  }
  if (message === "hexColor") {
    return t("hexColor");
  }
  return te("validation");
}

function qualityAdvice(
  kind: ScanQualityKind,
  t: (key: string) => string,
): string | null {
  if (kind === "fail") {
    return t("qualityFailAdvice");
  }
  if (kind === "low") {
    return t("qualityLowAdvice");
  }
  if (kind === "inverted") {
    return t("qualityInvertedAdvice");
  }
  return null;
}

function ControlGroup({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-default border border-border bg-bg p-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold">{title}</h3>
          {description ? (
            <p className="m-0 mt-0.5 text-xs leading-relaxed text-fg-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Slider({
  label,
  readout,
  value,
  min,
  max,
  step,
  disabled = false,
  onChange,
}: {
  label: string;
  readout: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <label htmlFor={id} className="min-w-0 truncate text-sm font-medium">
          {label}
        </label>
        <span className="shrink-0 font-mono text-xs text-fg-muted tabular-nums">{readout}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        className="h-6 w-full cursor-pointer rounded-none border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function ColorControl({
  label,
  pickerAria,
  error,
  value,
  onPick,
  inputProps,
}: {
  label: string;
  pickerAria: string;
  error?: string;
  value: string;
  onPick: (value: string) => void;
  inputProps: Record<string, unknown>;
}) {
  return (
    <Field label={label} error={error}>
      <div className="flex min-w-0 items-center gap-2">
        <input
          type="color"
          aria-label={pickerAria}
          className="size-9 shrink-0 cursor-pointer rounded-default border border-border bg-bg p-1"
          value={value}
          onChange={(event) => onPick(event.target.value)}
        />
        <Input className="font-mono" spellCheck={false} {...inputProps} />
      </div>
    </Field>
  );
}

export function QrDesigner({ mode, qrId, defaultValues, links, canUseLogo }: QrDesignerProps) {
  const router = useRouter();
  const t = useTranslations("qr");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pngSize, setPngSize] = useState<number>(1024);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<QrFormValues>({
    resolver: zodResolver(qrFormSchema),
    defaultValues,
  });

  const values = watch();
  const target = links.find((link) => link.id === values.linkId) ?? links[0];
  const payload = `${target?.url ?? "https://example.com"}?qr=${qrId ?? PLACEHOLDER_QR_ID}`;
  const quality = scanQuality(values.foreground, values.background);
  const qualityLabel = t(QUALITY_LABEL_KEYS[quality.kind]);
  const advice = qualityAdvice(quality.kind, t);
  const hasLogo = values.logoUrl !== "";

  // Preview renders at a fixed 320px regardless of the export size setting.
  const svg = useMemo(() => {
    try {
      return buildQrSvg(payload, toQrStyle(values), {
        logoHref: values.logoUrl === "" ? null : values.logoUrl,
        size: 320,
      });
    } catch {
      return null;
    }
  }, [payload, values]);

  const onSubmit = handleSubmit(async (formValues) => {
    setFormError(null);
    const result =
      mode === "create"
        ? await createQrCodeAction(formValues)
        : await updateQrCodeAction(qrId ?? "", formValues);

    if (!result.ok) {
      setFormError(actionMessage(result.error));
      return;
    }

    if (mode === "create") {
      router.push(`/qr/${result.data.id}`);
      return;
    }
    reset(formValues);
    router.refresh();
  });

  async function remove(): Promise<void> {
    if (!qrId) {
      return;
    }
    setDeleting(true);
    const result = await deleteQrCodeAction(qrId);
    if (!result.ok) {
      setFormError(actionMessage(result.error));
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }
    router.push("/qr");
  }

  const exportBase = qrId ? `/api/qr/${qrId}` : null;
  const exportTileClass =
    "flex min-w-0 flex-col gap-1 rounded-default border border-border bg-bg p-3.5 no-underline transition duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift hover:no-underline";

  return (
    <form
      className="flex min-w-0 flex-col gap-6"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      {formError ? (
        <div
          role="alert"
          className="flex min-w-0 items-start gap-3 rounded-default border border-danger bg-danger-surface px-4 py-3"
        >
          <Icon name="warning" className="mt-0.5 text-sm shrink-0 text-danger" aria-hidden="true" />
          <p className="m-0 min-w-0 text-sm text-fg-muted">{formError}</p>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-12">
        {/* The code itself is the subject of this screen, so it leads and stays in view. */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7 lg:sticky lg:top-6 lg:self-start">
          <div className="flex min-w-0 flex-col items-center gap-5 rounded-default border border-border bg-surface-subtle p-6 sm:p-8">
            <div className="flex w-full min-w-0 items-center justify-between gap-3">
              <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
                {t("livePreview")}
              </span>
              <Badge tone={quality.tone}>{qualityLabel}</Badge>
            </div>

            {svg ? (
              <div
                role="img"
                aria-label={t("previewAria", { name: values.name || t("thisCode") })}
                className="w-full max-w-md overflow-hidden rounded-default border border-border bg-bg shadow-lift [&>svg]:h-auto [&>svg]:w-full"
                // Built locally by buildQrSvg; the only user text (caption, logo URL) is XML-escaped.
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-default border border-dashed border-danger bg-danger-surface px-6 py-16 text-center">
                <Icon name="warning" className="text-lg text-danger" aria-hidden="true" />
                <p className="m-0 text-sm font-medium text-ink">{t("payloadTooLong")}</p>
                <p className="m-0 text-sm text-fg-muted">{t("payloadTooLongHint")}</p>
              </div>
            )}

            {advice ? (
              <p
                className={cn(
                  "m-0 flex w-full min-w-0 items-start gap-2 text-xs leading-relaxed",
                  quality.tone === "danger" ? "text-danger" : "text-warn-ink",
                )}
              >
                <Icon name="circle-info" className="mt-0.5 text-xs shrink-0" aria-hidden="true" />
                {advice}
              </p>
            ) : null}

            <div className="flex w-full min-w-0 items-center gap-2 rounded-default border border-border bg-bg px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-fg-muted">
                {payload}
              </code>
              <CopyButton value={payload} iconOnly label={t("copyEncoded")} />
            </div>

            <p className="m-0 text-center text-xs text-fg-subtle">{t("encodesHint")}</p>
          </div>

          <Card staticHover className="gap-4">
            <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
              {t("export")}
            </span>

            {exportBase ? (
              <>
                <div className="grid min-w-0 gap-2 *:min-w-0 sm:grid-cols-3">
                  <a href={`${exportBase}?format=png&size=${pngSize}`} className={exportTileClass}>
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <Icon name="image" className="text-sm" aria-hidden="true" />
                      PNG
                    </span>
                    <span className="text-xs text-fg-muted tabular-nums">
                      {t("pngRaster", { size: pngSize })}
                    </span>
                  </a>
                  <a href={`${exportBase}?format=svg`} className={exportTileClass}>
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <Icon name="file-code" className="text-sm" aria-hidden="true" />
                      SVG
                    </span>
                    <span className="text-xs text-fg-muted">{t("svgVector")}</span>
                  </a>
                  <a
                    href={`${exportBase}?format=pdf&size=${values.size}`}
                    className={exportTileClass}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <Icon name="file-lines" className="text-sm" aria-hidden="true" />
                      PDF
                    </span>
                    <span className="text-xs text-fg-muted tabular-nums">
                      {t("pdfPrint", { size: values.size })}
                    </span>
                  </a>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="shrink-0 text-xs text-fg-subtle">{t("pngSize")}</span>
                  {EXPORT_SIZES.map((size) => (
                    <Chip
                      key={size}
                      active={pngSize === size}
                      aria-pressed={pngSize === size}
                      className="tabular-nums"
                      onClick={() => setPngSize(size)}
                    >
                      {size}px
                    </Chip>
                  ))}
                </div>

                <p className="m-0 text-xs text-fg-subtle">{t("exportHint")}</p>
              </>
            ) : (
              <p className="m-0 rounded-default border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
                {t("exportLocked")}
              </p>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
          <ControlGroup title={t("target")} description={t("targetDesc")}>
            <Field label={t("name")} error={qrFieldError(errors.name?.message, t, te)}>
              <Input placeholder={t("namePlaceholder")} {...register("name")} />
            </Field>

            <Field
              label={t("shortLink")}
              error={qrFieldError(errors.linkId?.message, t, te)}
              hint={t("shortLinkHint")}
            >
              <Select {...register("linkId")}>
                {links.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("caption")} hint={t("captionHint", { count: values.caption.length })}>
              <Input placeholder={t("captionPlaceholder")} maxLength={60} {...register("caption")} />
            </Field>
          </ControlGroup>

          <ControlGroup
            title={t("colour")}
            description={t("colourDesc")}
            action={<Badge tone={quality.tone}>{qualityLabel}</Badge>}
          >
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-sm font-medium">{t("presets")}</span>
              <div className="flex min-w-0 flex-wrap gap-2">
                {QR_PALETTES.map((palette) => {
                  const active =
                    values.foreground.toLowerCase() === palette.foreground &&
                    values.background.toLowerCase() === palette.background;
                  return (
                    <Chip
                      key={palette.id}
                      active={active}
                      aria-pressed={active}
                      onClick={() => {
                        setValue("foreground", palette.foreground, { shouldDirty: true });
                        setValue("background", palette.background, { shouldDirty: true });
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="size-3.5 shrink-0 rounded-full border border-border-strong"
                        style={{ background: palette.foreground }}
                      />
                      {t(PALETTE_KEYS[palette.id])}
                    </Chip>
                  );
                })}
              </div>
            </div>

            <div className="grid min-w-0 gap-4 *:min-w-0 sm:grid-cols-2">
              <ColorControl
                label={t("foreground")}
                pickerAria={t("colourPicker", { label: t("foreground") })}
                error={qrFieldError(errors.foreground?.message, t, te)}
                value={values.foreground}
                onPick={(value) => setValue("foreground", value, { shouldDirty: true })}
                inputProps={register("foreground")}
              />
              <ColorControl
                label={t("background")}
                pickerAria={t("colourPicker", { label: t("background") })}
                error={qrFieldError(errors.background?.message, t, te)}
                value={values.background}
                onPick={(value) => setValue("background", value, { shouldDirty: true })}
                inputProps={register("background")}
              />
            </div>

            <div className="flex min-w-0 items-center justify-between gap-4 rounded-default border border-border bg-surface-subtle px-4 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t("tintFinders")}</span>
                <span className="block text-xs text-fg-muted">{t("tintFindersHint")}</span>
              </span>
              <Switch
                checked={values.useCustomCorners}
                aria-label={t("tintFindersAria")}
                onCheckedChange={(checked) =>
                  setValue("useCustomCorners", checked, { shouldDirty: true })
                }
              />
            </div>

            {values.useCustomCorners ? (
              <ColorControl
                label={t("cornerColour")}
                pickerAria={t("colourPicker", { label: t("cornerColour") })}
                error={qrFieldError(errors.cornerColor?.message, t, te)}
                value={values.cornerColor}
                onPick={(value) => setValue("cornerColor", value, { shouldDirty: true })}
                inputProps={register("cornerColor")}
              />
            ) : null}
          </ControlGroup>

          <ControlGroup title={t("shapeTitle")} description={t("shapeDesc")}>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-sm font-medium">{t("moduleShape")}</span>
              <div className="flex min-w-0 flex-wrap gap-2">
                {QR_DOT_STYLES.map((style) => (
                  <Chip
                    key={style}
                    active={values.dotStyle === style}
                    aria-pressed={values.dotStyle === style}
                    onClick={() => setValue("dotStyle", style, { shouldDirty: true })}
                  >
                    {t(DOT_STYLE_KEYS[style])}
                  </Chip>
                ))}
              </div>
            </div>

            <Field
              label={t("errorCorrection")}
              hint={hasLogo ? t("errorLocked") : t("errorHint")}
            >
              <Select {...register("errorCorrection")} disabled={hasLogo}>
                {QR_ERROR_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {t(ERROR_LEVEL_KEYS[level])}
                  </option>
                ))}
              </Select>
            </Field>

            <Slider
              label={t("quietZone")}
              readout={t("quietZoneReadout", { count: values.margin })}
              value={values.margin}
              min={0}
              max={8}
              step={1}
              onChange={(value) => setValue("margin", value, { shouldDirty: true })}
            />

            <Slider
              label={t("exportSize")}
              readout={t("exportSizeReadout", { size: values.size })}
              value={values.size}
              min={128}
              max={2048}
              step={64}
              onChange={(value) => setValue("size", value, { shouldDirty: true })}
            />
          </ControlGroup>

          <ControlGroup
            title={t("logo")}
            description={t("logoDesc")}
            action={canUseLogo ? null : <Badge tone="warn">{t("paidPlans")}</Badge>}
          >
            {canUseLogo ? null : (
              <p className="m-0 rounded-default border border-border bg-surface-subtle px-4 py-3 text-sm text-fg-muted">
                {t("logoPaid")}
              </p>
            )}

            <Field
              label={t("logoUrl")}
              error={qrFieldError(errors.logoUrl?.message, t, te)}
              hint={t("logoUrlHint")}
            >
              <Input
                type="url"
                inputMode="url"
                placeholder="https://cdn.acme.com/mark.png"
                disabled={!canUseLogo}
                {...register("logoUrl")}
              />
            </Field>

            <Slider
              label={t("logoSize")}
              readout={t("logoSizeReadout", { percent: Math.round(values.logoScale * 100) })}
              value={values.logoScale}
              min={0.1}
              max={0.3}
              step={0.01}
              disabled={!canUseLogo || !hasLogo}
              onChange={(value) => setValue("logoScale", value, { shouldDirty: true })}
            />

            {hasLogo ? <p className="m-0 text-xs text-fg-subtle">{t("logoKeepSmall")}</p> : null}
          </ControlGroup>

          {mode === "edit" && qrId ? (
            <section className="flex min-w-0 flex-col gap-3 rounded-default border border-danger bg-danger-surface p-5">
              <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon name="warning" className="text-sm text-danger" aria-hidden="true" />
                {t("deleteTitle")}
              </h3>
              <p className="m-0 text-sm leading-relaxed text-fg-muted">{t("deleteHint")}</p>
              <Button
                size="sm"
                disabled={deleting}
                className="self-start border-danger text-danger hover:bg-danger-surface hover:text-danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Icon name="trash" className="text-sm" aria-hidden="true" />
                {t("deleteCode")}
              </Button>
            </section>
          ) : null}
        </div>
      </div>

      <SaveBar
        dirty={isDirty || mode === "create"}
        saving={isSubmitting}
        message={mode === "create" ? t("readyToCreate") : tc("unsavedChanges")}
        onReset={() => reset(defaultValues)}
        actions={
          <>
            {mode === "edit" ? (
              <Button size="sm" onClick={() => reset(defaultValues)} disabled={isSubmitting}>
                {t("discard")}
              </Button>
            ) : null}
            <Button size="sm" type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? t("saving") : mode === "create" ? t("createCode") : t("saveChanges")}
            </Button>
          </>
        }
      />

      <Modal
        open={confirmDelete}
        title={t("deleteConfirmTitle")}
        description={values.name || t("untitled")}
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <Button disabled={deleting} onClick={() => setConfirmDelete(false)}>
              {tc("cancel")}
            </Button>
            <Button
              disabled={deleting}
              className="border-danger text-danger hover:bg-danger-surface hover:text-danger"
              onClick={() => {
                void remove();
              }}
            >
              {deleting ? t("deleting") : t("deleteCode")}
            </Button>
          </>
        }
      >
        <div className="flex min-w-0 items-start gap-3 rounded-default border border-danger bg-danger-surface px-3.5 py-3">
          <Icon name="warning" className="mt-0.5 text-sm shrink-0 text-danger" aria-hidden="true" />
          <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 p-0 text-sm text-fg-muted">
            <li>{t("deleteBullet1")}</li>
            <li>{t("deleteBullet2")}</li>
            <li>{t("deleteBullet3")}</li>
          </ul>
        </div>
      </Modal>
    </form>
  );
}
