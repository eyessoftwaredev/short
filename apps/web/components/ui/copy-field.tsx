"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/kit/icon";
import { cn } from "@/lib/cx";
import { InfoTip } from "./info-tip";

type CopyFieldProps = {
  /** The exact text that is copied. */
  value: string;
  /** Visible label above the field. */
  label?: ReactNode;
  info?: ReactNode;
  hint?: ReactNode;
  /** Monospace value — right for URLs, keys and IDs. On by default. */
  mono?: boolean;
  /**
   * Masks the value until revealed, for API keys and secrets. Copy still
   * copies the real value.
   */
  secret?: boolean;
  /** Adds an "open" button, e.g. for a short link. */
  href?: string;
  size?: "sm" | "md";
  copyLabel?: string;
  copiedLabel?: string;
  className?: string;
};

/**
 * Read-only value with a copy button fused to it: short links, API keys,
 * DNS records, webhook secrets.
 *
 *   <CopyField label="Short link" value="https://short.ky/launch" href="https://short.ky/launch" />
 */
export function CopyField({
  value,
  label,
  info,
  hint,
  mono = true,
  secret = false,
  href,
  size = "md",
  copyLabel,
  copiedLabel,
  className,
}: CopyFieldProps) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);
  const id = useId();
  const resolvedCopy = copyLabel ?? t("copy");
  const resolvedCopied = copiedLabel ?? t("copied");

  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const shown = revealed ? value : "•".repeat(Math.min(Math.max(value.length, 12), 32));
  const segment =
    "flex shrink-0 items-center justify-center border-l border-border text-fg-muted transition-colors duration-150 hover:bg-surface hover:text-ink";
  const height = size === "sm" ? "h-8" : "h-9.5";
  const square = size === "sm" ? "w-8" : "w-9.5";

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? (
        <span className="flex items-center gap-1.5 text-sm leading-5 font-medium text-ink">
          <label htmlFor={id}>{label}</label>
          {info ? <InfoTip label={typeof label === "string" ? label : "Info"}>{info}</InfoTip> : null}
        </span>
      ) : null}
      <div
        className={cn(
          "flex min-w-0 items-stretch overflow-hidden rounded-default border border-border-strong bg-surface-subtle shadow-xs",
          height,
        )}
      >
        <input
          id={id}
          readOnly
          value={shown}
          onFocus={(event) => event.currentTarget.select()}
          className={cn(
            "min-h-0 min-w-0 flex-1 truncate rounded-none border-0 bg-transparent px-3 py-0 shadow-none focus:shadow-none",
            size === "sm" ? "text-[13px]" : "text-sm",
            mono && "font-mono",
          )}
          aria-label={typeof label === "string" ? label : resolvedCopy}
        />
        {secret ? (
          <button
            type="button"
            className={cn(segment, square)}
            aria-label={revealed ? t("hide") : t("show")}
            title={revealed ? t("hide") : t("show")}
            onClick={() => setRevealed((prev) => !prev)}
          >
            <Icon name={revealed ? "eye-slash" : "eye"} className="text-xs" />
          </button>
        ) : null}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(segment, square, "no-underline hover:no-underline")}
            aria-label={t("openInNewTab")}
            title={t("openInNewTab")}
          >
            <Icon name="external-link" className="text-xs" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void copy();
          }}
          className={cn(
            segment,
            "gap-1.5 bg-bg px-3 text-[13px] font-medium",
            copied && "text-success-ink hover:text-success-ink",
          )}
        >
          <Icon name={copied ? "check" : "copy"} className="text-xs" />
          <span className="hidden sm:inline">{copied ? resolvedCopied : resolvedCopy}</span>
          <span className="sr-only sm:hidden">{copied ? resolvedCopied : resolvedCopy}</span>
        </button>
      </div>
      {hint ? <span className="text-[13px] leading-5 text-fg-subtle">{hint}</span> : null}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? resolvedCopied : ""}
      </span>
    </div>
  );
}
