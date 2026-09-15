"use client";

import { QR_DOT_STYLES, QR_ERROR_LEVELS } from "@short/core";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  FileImage,
  FileText,
  FileType,
  Info,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type ReactNode } from "react";
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
import {
  DOT_STYLE_LABELS,
  ERROR_LEVEL_LABELS,
  qrFormSchema,
  toQrStyle,
  type QrFormValues,
} from "@/lib/qr-form";
import { createQrCodeAction, deleteQrCodeAction, updateQrCodeAction } from "./actions";
import { QR_PALETTES, scanQuality } from "./qr-presets";

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
  error,
  value,
  onPick,
  inputProps,
}: {
  label: string;
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
          aria-label={`${label} colour picker`}
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
      setFormError(result.error);
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
      setFormError(result.error);
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
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="m-0 min-w-0 text-sm text-fg-muted">{formError}</p>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-12">
        {/* The code itself is the subject of this screen, so it leads and stays in view. */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7 lg:sticky lg:top-6 lg:self-start">
          <div className="flex min-w-0 flex-col items-center gap-5 rounded-default border border-border bg-surface-subtle p-6 sm:p-8">
            <div className="flex w-full min-w-0 items-center justify-between gap-3">
              <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
                Live preview
              </span>
              <Badge tone={quality.tone}>{quality.label}</Badge>
            </div>

            {svg ? (
              <div
                role="img"
                aria-label={`QR code preview for ${values.name || "this code"}`}
                className="w-full max-w-md overflow-hidden rounded-default border border-border bg-bg shadow-lift [&>svg]:h-auto [&>svg]:w-full"
                // Built locally by buildQrSvg; the only user text (caption, logo URL) is XML-escaped.
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-default border border-dashed border-danger bg-danger-surface px-6 py-16 text-center">
                <TriangleAlert className="size-5 text-danger" aria-hidden="true" />
                <p className="m-0 text-sm font-medium text-ink">Payload is too long</p>
                <p className="m-0 text-sm text-fg-muted">
                  Shorten the caption or pick a link with a shorter slug.
                </p>
              </div>
            )}

            {quality.advice ? (
              <p
                className={cn(
                  "m-0 flex w-full min-w-0 items-start gap-2 text-xs leading-relaxed",
                  quality.tone === "danger" ? "text-danger" : "text-warn-ink",
                )}
              >
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {quality.advice}
              </p>
            ) : null}

            <div className="flex w-full min-w-0 items-center gap-2 rounded-default border border-border bg-bg px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-fg-muted">
                {payload}
              </code>
              <CopyButton value={payload} iconOnly label="Copy encoded URL" />
            </div>

            <p className="m-0 text-center text-xs text-fg-subtle">
              The code encodes the short link, so editing the link&apos;s destination re-targets
              every printed copy.
            </p>
          </div>

          <Card staticHover className="gap-4">
            <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
              Export
            </span>

            {exportBase ? (
              <>
                <div className="grid min-w-0 gap-2 *:min-w-0 sm:grid-cols-3">
                  <a href={`${exportBase}?format=png&size=${pngSize}`} className={exportTileClass}>
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <FileImage className="size-4" aria-hidden="true" />
                      PNG
                    </span>
                    <span className="text-xs text-fg-muted tabular-nums">
                      Raster at {pngSize}px — web, slides, social.
                    </span>
                  </a>
                  <a href={`${exportBase}?format=svg`} className={exportTileClass}>
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <FileType className="size-4" aria-hidden="true" />
                      SVG
                    </span>
                    <span className="text-xs text-fg-muted">
                      Vector — scales to any print size.
                    </span>
                  </a>
                  <a
                    href={`${exportBase}?format=pdf&size=${values.size}`}
                    className={exportTileClass}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <FileText className="size-4" aria-hidden="true" />
                      PDF
                    </span>
                    <span className="text-xs text-fg-muted tabular-nums">
                      Print-ready page at {values.size}px.
                    </span>
                  </a>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="shrink-0 text-xs text-fg-subtle">PNG size</span>
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

                <p className="m-0 text-xs text-fg-subtle">
                  Exports render server-side from the saved style, so the logo is embedded in the
                  file. Unsaved edits are not included.
                </p>
              </>
            ) : (
              <p className="m-0 rounded-default border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
                Create the code to unlock PNG, SVG and PDF exports — they render server-side from
                the saved style.
              </p>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
          <ControlGroup
            title="Target"
            description="What the code points at, and how you will recognise it later."
          >
            <Field label="Name" error={errors.name?.message}>
              <Input placeholder="Spring campaign poster" {...register("name")} />
            </Field>

            <Field
              label="Short link"
              error={errors.linkId?.message}
              hint="Change the link's destination later and every printed code follows."
            >
              <Select {...register("linkId")}>
                {links.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Caption"
              hint={`Printed under the code. ${values.caption.length}/60 characters.`}
            >
              <Input placeholder="Scan for 20% off" maxLength={60} {...register("caption")} />
            </Field>
          </ControlGroup>

          <ControlGroup
            title="Colour"
            description="Scanners read brightness, not hue — keep the modules much darker than the background."
            action={<Badge tone={quality.tone}>{quality.label}</Badge>}
          >
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-sm font-medium">Presets</span>
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
                      {palette.label}
                    </Chip>
                  );
                })}
              </div>
            </div>

            <div className="grid min-w-0 gap-4 *:min-w-0 sm:grid-cols-2">
              <ColorControl
                label="Foreground"
                error={errors.foreground?.message}
                value={values.foreground}
                onPick={(value) => setValue("foreground", value, { shouldDirty: true })}
                inputProps={register("foreground")}
              />
              <ColorControl
                label="Background"
                error={errors.background?.message}
                value={values.background}
                onPick={(value) => setValue("background", value, { shouldDirty: true })}
                inputProps={register("background")}
              />
            </div>

            <div className="flex min-w-0 items-center justify-between gap-4 rounded-default border border-border bg-surface-subtle px-4 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium">Tint the finder squares</span>
                <span className="block text-xs text-fg-muted">
                  Colours the three corner markers separately from the modules.
                </span>
              </span>
              <Switch
                checked={values.useCustomCorners}
                aria-label="Tint the finder squares separately"
                onCheckedChange={(checked) =>
                  setValue("useCustomCorners", checked, { shouldDirty: true })
                }
              />
            </div>

            {values.useCustomCorners ? (
              <ColorControl
                label="Corner colour"
                error={errors.cornerColor?.message}
                value={values.cornerColor}
                onPick={(value) => setValue("cornerColor", value, { shouldDirty: true })}
                inputProps={register("cornerColor")}
              />
            ) : null}
          </ControlGroup>

          <ControlGroup
            title="Shape and resilience"
            description="Module style, quiet zone and how much damage the code can survive."
          >
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-sm font-medium">Module shape</span>
              <div className="flex min-w-0 flex-wrap gap-2">
                {QR_DOT_STYLES.map((style) => (
                  <Chip
                    key={style}
                    active={values.dotStyle === style}
                    aria-pressed={values.dotStyle === style}
                    onClick={() => setValue("dotStyle", style, { shouldDirty: true })}
                  >
                    {DOT_STYLE_LABELS[style]}
                  </Chip>
                ))}
              </div>
            </div>

            <Field
              label="Error correction"
              hint={
                hasLogo
                  ? "Locked to H while a logo covers the centre."
                  : "Higher levels survive scuffs, folds and reprints."
              }
            >
              <Select {...register("errorCorrection")} disabled={hasLogo}>
                {QR_ERROR_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {ERROR_LEVEL_LABELS[level]}
                  </option>
                ))}
              </Select>
            </Field>

            <Slider
              label="Quiet zone"
              readout={`${values.margin} modules`}
              value={values.margin}
              min={0}
              max={8}
              step={1}
              onChange={(value) => setValue("margin", value, { shouldDirty: true })}
            />

            <Slider
              label="Default export size"
              readout={`${values.size} px`}
              value={values.size}
              min={128}
              max={2048}
              step={64}
              onChange={(value) => setValue("size", value, { shouldDirty: true })}
            />
          </ControlGroup>

          <ControlGroup
            title="Logo"
            description="Centred overlay on a padded backing plate."
            action={canUseLogo ? null : <Badge tone="warn">Paid plans</Badge>}
          >
            {canUseLogo ? null : (
              <p className="m-0 rounded-default border border-border bg-surface-subtle px-4 py-3 text-sm text-fg-muted">
                Custom logos are available on paid plans. Every other control stays editable.
              </p>
            )}

            <Field
              label="Logo URL"
              error={errors.logoUrl?.message}
              hint="HTTPS PNG, JPEG, WebP or SVG up to 1 MB."
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
              label="Logo size"
              readout={`${Math.round(values.logoScale * 100)}% of width`}
              value={values.logoScale}
              min={0.1}
              max={0.3}
              step={0.01}
              disabled={!canUseLogo || !hasLogo}
              onChange={(value) => setValue("logoScale", value, { shouldDirty: true })}
            />

            {hasLogo ? (
              <p className="m-0 text-xs text-fg-subtle">
                Keep the logo under a quarter of the width — anything larger eats the data the
                scanner needs.
              </p>
            ) : null}
          </ControlGroup>

          {mode === "edit" && qrId ? (
            <section className="flex min-w-0 flex-col gap-3 rounded-default border border-danger bg-danger-surface p-5">
              <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-ink">
                <TriangleAlert className="size-4 text-danger" aria-hidden="true" />
                Delete this code
              </h3>
              <p className="m-0 text-sm leading-relaxed text-fg-muted">
                Printed copies stop resolving to this record. The short link behind it and all of
                its click history are left untouched.
              </p>
              <Button
                size="sm"
                disabled={deleting}
                className="self-start border-danger text-danger hover:bg-danger-surface hover:text-danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete QR code
              </Button>
            </section>
          ) : null}
        </div>
      </div>

      <SaveBar
        dirty={isDirty || mode === "create"}
        saving={isSubmitting}
        message={mode === "create" ? "Ready to create" : "Unsaved changes"}
        onReset={() => reset(defaultValues)}
        actions={
          <>
            {mode === "edit" ? (
              <Button size="sm" onClick={() => reset(defaultValues)} disabled={isSubmitting}>
                Discard
              </Button>
            ) : null}
            <Button size="sm" type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : mode === "create" ? "Create QR code" : "Save changes"}
            </Button>
          </>
        }
      />

      <Modal
        open={confirmDelete}
        title="Delete this QR code?"
        description={values.name || "Untitled code"}
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <Button disabled={deleting} onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              disabled={deleting}
              className="border-danger text-danger hover:bg-danger-surface hover:text-danger"
              onClick={() => {
                void remove();
              }}
            >
              {deleting ? "Deleting…" : "Delete QR code"}
            </Button>
          </>
        }
      >
        <div className="flex min-w-0 items-start gap-3 rounded-default border border-danger bg-danger-surface px-3.5 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 p-0 text-sm text-fg-muted">
            <li>Anything already printed keeps pointing at the short link, not this design.</li>
            <li>The short link and its click history are not affected.</li>
            <li>This cannot be undone.</li>
          </ul>
        </div>
      </Modal>
    </form>
  );
}
