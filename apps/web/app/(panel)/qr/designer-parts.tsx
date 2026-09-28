"use client";

import type { QrDotStyle } from "@short/core";
import { useTranslations } from "next-intl";
import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/kit/icon";
import { Card, Field, InfoTip, Input, Switch } from "@/components/ui";
import { cn } from "@/lib/cx";

/* ── Section chrome ──────────────────────────────────────────────────────── */

/** One numbered designer section: 1 Content, 2 Style, … */
export function StepCard({
  id,
  step,
  title,
  description,
  actions,
  children,
}: {
  id?: string;
  step: number;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card
      id={id}
      className="scroll-mt-24 gap-5"
      title={
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className="numeric flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-surface text-xs font-semibold text-accent-on-surface"
            aria-hidden="true"
          >
            {step}
          </span>
          <span className="min-w-0">{title}</span>
        </span>
      }
      description={description ? <span className="block sm:pl-8.5">{description}</span> : undefined}
      actions={actions}
    >
      {children}
    </Card>
  );
}

/** A label for controls that are not a single input (option groups, swatches), with its tooltip. */
export function ControlLabel({ label, info, id }: { label: string; info: string; id?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-sm leading-5 font-medium text-ink">
      <span id={id} className="min-w-0">
        {label}
      </span>
      <InfoTip inline label={label}>
        {info}
      </InfoTip>
    </span>
  );
}

/** Label + hint on the left, a Switch on the right, on a quiet strip. */
export function SwitchRow({
  label,
  info,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  info: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const labelId = useId();
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border border-border-subtle bg-surface-subtle px-4 py-3">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-ink">
          <span id={labelId}>{label}</span>
          <InfoTip inline label={label}>
            {info}
          </InfoTip>
        </span>
        {hint ? <span className="text-[13px] leading-5 text-fg-muted">{hint}</span> : null}
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        aria-labelledby={labelId}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

/* ── Inputs ──────────────────────────────────────────────────────────────── */

export function Slider({
  label,
  info,
  readout,
  value,
  min,
  max,
  step,
  disabled = false,
  hint,
  onChange,
}: {
  label: string;
  info?: string;
  readout: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  hint?: ReactNode;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <label htmlFor={id} className="min-w-0 truncate text-sm font-medium text-ink">
            {label}
          </label>
          {info ? (
            <InfoTip inline label={label}>
              {info}
            </InfoTip>
          ) : null}
        </span>
        <span className="numeric shrink-0 rounded-sm bg-surface px-1.5 py-0.5 text-xs font-medium text-fg-muted">
          {readout}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={readout}
        className="h-6 w-full cursor-pointer rounded-none border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {hint ? <span className="text-[13px] leading-5 text-fg-subtle">{hint}</span> : null}
    </div>
  );
}

/**
 * Hex field with a colour swatch. The text input comes first in the DOM so a click on
 * the label focuses it instead of popping the system colour dialog; the swatch is
 * moved in front visually.
 */
export function ColorControl({
  label,
  info,
  pickerAria,
  error,
  value,
  onPick,
  inputProps,
}: {
  label: string;
  info: string;
  pickerAria: string;
  error?: string;
  value: string;
  onPick: (value: string) => void;
  inputProps: Record<string, unknown>;
}) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : /^#[0-9a-fA-F]{3}$/.test(value)
      ? `#${value
          .slice(1)
          .split("")
          .map((part) => part + part)
          .join("")}`
      : "#000000";
  return (
    <Field label={label} info={info} error={error}>
      <span className="flex min-w-0 items-center gap-2">
        <Input
          className="w-full min-w-0 flex-1 font-mono"
          spellCheck={false}
          maxLength={7}
          aria-invalid={error ? true : undefined}
          {...inputProps}
        />
        <input
          type="color"
          aria-label={pickerAria}
          className="order-first size-9.5 shrink-0 cursor-pointer rounded-default border border-border-strong bg-bg p-1 shadow-xs"
          value={valid}
          onChange={(event) => onPick(event.target.value)}
        />
      </span>
    </Field>
  );
}

/* ── Option cards (radio group) ──────────────────────────────────────────── */

export type OptionItem<T extends string> = {
  id: T;
  title: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  /** A picture of the option (swatch, mini preview). Replaces the icon tile. */
  visual?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
};

/**
 * Single choice shown as cards: content type, frame, dot shape, palette, file format.
 * A real radio group: one tab stop, arrow keys move the selection.
 */
export function OptionGroup<T extends string>({
  label,
  labelledBy,
  value,
  onChange,
  options,
  layout = "row",
  className,
}: {
  label?: string;
  labelledBy?: string;
  /** `""` when nothing matches (e.g. custom colours: no palette is selected). */
  value: T | "";
  onChange: (id: T) => void;
  options: readonly OptionItem<T>[];
  /** `row`: icon + text side by side. `tile`: picture on top, title under it. */
  layout?: "row" | "tile";
  className?: string;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const enabled = options.filter((option) => !option.disabled);
  const hasSelection = options.some((option) => option.id === value);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(event.key) || enabled.length === 0) {
      return;
    }
    event.preventDefault();
    const index = enabled.findIndex((option) => option.id === value);
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const next = enabled[(index + (forward ? 1 : -1) + enabled.length) % enabled.length];
    onChange(next.id);
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-option="${CSS.escape(next.id)}"]`)?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      className={cn("grid min-w-0 gap-2", className)}
    >
      {options.map((option, index) => {
        const selected = option.id === value;
        const tabbable = selected || (!hasSelection && index === 0);
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            data-option={option.id}
            tabIndex={tabbable ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative flex min-w-0 rounded-md border text-left transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50",
              layout === "row" ? "items-start gap-3 p-3" : "flex-col items-center gap-2 p-2 pb-2.5 text-center",
              selected
                ? "border-accent bg-accent-tint shadow-[inset_0_0_0_1px_var(--accent)]"
                : "border-border bg-bg hover:border-border-hover hover:bg-surface-subtle",
            )}
          >
            {option.visual ? (
              <span className={cn("flex shrink-0 items-center justify-center", layout === "tile" && "w-full")}>
                {option.visual}
              </span>
            ) : option.icon ? (
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-default",
                  selected ? "bg-accent text-on-accent" : "bg-surface text-fg-muted",
                )}
                aria-hidden="true"
              >
                <Icon name={option.icon} className="text-sm" />
              </span>
            ) : null}
            <span className={cn("flex min-w-0 flex-col gap-0.5", layout === "row" && "flex-1 pr-5")}>
              <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm leading-5 font-medium text-ink">
                {option.title}
                {option.badge}
              </span>
              {option.description ? (
                <span className="text-[13px] leading-5 text-fg-muted">{option.description}</span>
              ) : null}
            </span>
            {selected && layout === "row" ? (
              <span className="absolute top-3 right-3 text-accent" aria-hidden="true">
                <Icon name="circle-check" className="text-sm" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ── Pictures ────────────────────────────────────────────────────────────── */

/** Fixed pseudo-random modules for the 21×21 swatch glyph (finders excluded). */
const GLYPH_MODULES: [number, number][] = [
  [8, 0], [10, 0], [12, 1], [9, 2], [11, 3], [8, 4], [12, 4], [10, 5], [9, 6], [11, 6],
  [0, 8], [2, 8], [4, 8], [6, 9], [1, 10], [3, 10], [5, 11], [0, 12], [2, 12], [6, 12],
  [8, 8], [9, 9], [11, 8], [12, 10], [10, 11], [8, 12], [13, 9], [14, 8], [16, 8], [18, 9],
  [20, 8], [15, 10], [17, 11], [19, 12], [14, 12], [16, 13], [20, 14], [8, 14], [10, 15],
  [12, 14], [9, 17], [11, 18], [13, 16], [8, 20], [12, 20], [15, 15], [17, 16], [19, 17],
  [16, 18], [18, 19], [14, 20], [20, 20], [10, 19], [13, 13], [18, 15],
];

function glyphFinder(x: number, y: number, color: string, background: string, round: boolean) {
  const r = round ? 1.6 : 0;
  return (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} rx={r * 1.2} fill={color} />
      <rect x={x + 1} y={y + 1} width={5} height={5} rx={r * 0.9} fill={background} />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={r * 0.6} fill={color} />
    </g>
  );
}

/**
 * A tiny, fixed QR-like picture drawn in the given colours and module shape. Used for
 * palette, template and module-shape swatches, where a real code would be overkill.
 */
export function QrGlyph({
  foreground,
  background,
  corner,
  dotStyle = "square",
  className,
}: {
  foreground: string;
  background: string;
  corner?: string | null;
  dotStyle?: QrDotStyle;
  className?: string;
}) {
  const round = dotStyle !== "square";
  const finder = corner ?? foreground;
  return (
    <svg viewBox="-1.5 -1.5 24 24" className={cn("block", className)} aria-hidden="true">
      <rect x={-1.5} y={-1.5} width={24} height={24} rx={2.5} fill={background} />
      {glyphFinder(0, 0, finder, background, round)}
      {glyphFinder(14, 0, finder, background, round)}
      {glyphFinder(0, 14, finder, background, round)}
      <g fill={foreground}>
        {GLYPH_MODULES.map(([x, y]) =>
          dotStyle === "dots" ? (
            <circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.46} />
          ) : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} rx={dotStyle === "rounded" ? 0.32 : 0} />
          ),
        )}
      </g>
    </svg>
  );
}

/** Inline SVG markup from buildQrSvg, scaled to its container. */
export function SvgMarkup({ svg, className, label }: { svg: string; className?: string; label?: string }) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block [&>svg]:block [&>svg]:h-auto [&>svg]:w-full", className)}
      // Generated by buildQrSvg: every interpolated value (caption, label, colours, logo
      // URL) is XML-escaped there.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/* ── Link picker ─────────────────────────────────────────────────────────── */

export type QrLinkOption = {
  id: string;
  /** `host/slug`. */
  shortLabel: string;
  title: string | null;
  /** Full short URL, used for the preview payload. */
  url: string;
  /** Where the link currently sends people. */
  destination: string;
};

function fold(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i");
}

/** Searchable list of the workspace's short links; one of them is the code's target. */
export function LinkPicker({
  links,
  value,
  onChange,
  labelledBy,
  error,
}: {
  links: readonly QrLinkOption[];
  value: string;
  onChange: (id: string) => void;
  labelledBy: string;
  error?: string;
}) {
  const t = useTranslations("qr");
  const searchId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const terms = fold(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      return links;
    }
    return links.filter((link) => {
      const haystack = fold(`${link.shortLabel} ${link.title ?? ""} ${link.destination}`);
      return terms.every((term) => haystack.includes(term));
    });
  }, [links, query]);

  const shown = matches.slice(0, 100);
  const selectedVisible = shown.some((link) => link.id === value);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("[role=radio]") ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length];
    next?.focus();
    const id = next?.dataset.link;
    if (id) {
      onChange(id);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {links.length > 5 ? (
        <Input
          id={searchId}
          type="search"
          value={query}
          autoComplete="off"
          aria-label={t("linkSearch")}
          placeholder={t("linkSearch")}
          prefix={<Icon name="search" className="text-xs" />}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
        />
      ) : null}
      <div
        ref={listRef}
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-invalid={error ? true : undefined}
        onKeyDown={onKeyDown}
        className={cn(
          "flex max-h-72 min-w-0 flex-col overflow-y-auto rounded-md border bg-bg",
          error ? "border-danger" : "border-border-strong",
        )}
      >
        {shown.length === 0 ? (
          <p className="m-0 px-4 py-5 text-center text-sm text-fg-muted">
            {t("linkSearchEmpty", { query: query.trim() })}
          </p>
        ) : (
          shown.map((link, index) => {
            const selected = link.id === value;
            return (
              <button
                key={link.id}
                type="button"
                role="radio"
                aria-checked={selected}
                data-link={link.id}
                tabIndex={selected || (!selectedVisible && index === 0) ? 0 : -1}
                onClick={() => onChange(link.id)}
                className={cn(
                  "flex min-w-0 items-center gap-3 border-b border-border-subtle px-3.5 py-2.5 text-left transition-colors duration-100 last:border-b-0 focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
                  selected ? "bg-accent-tint" : "hover:bg-surface-subtle",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-accent bg-accent" : "border-border-strong bg-bg",
                  )}
                  aria-hidden="true"
                >
                  {selected ? <span className="size-1.5 rounded-full bg-on-accent" /> : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-mono text-[13px] leading-5 font-medium text-ink">
                    {link.shortLabel}
                  </span>
                  <span className="truncate text-xs leading-5 text-fg-subtle">
                    {link.title ? `${link.title} · ` : ""}
                    {link.destination}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
      {matches.length > shown.length ? (
        <span className="text-[13px] leading-5 text-fg-subtle">
          {t("linkSearchMore", { count: matches.length - shown.length })}
        </span>
      ) : null}
      {error ? (
        <span role="alert" className="flex items-start gap-1.5 text-[13px] leading-5 text-danger">
          <Icon name="circle-xmark" className="mt-0.5 text-xs" />
          <span className="min-w-0">{error}</span>
        </span>
      ) : null}
    </div>
  );
}
