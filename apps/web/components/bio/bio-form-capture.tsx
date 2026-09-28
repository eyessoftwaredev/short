"use client";

import { useId, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cx";

type BioFormCaptureProps = {
  biopageId: string;
  blockId: string;
  mode: "email" | "whatsapp";
  title: string;
  buttonLabel: string;
  whatsappNumber: string | null;
  successMessage: string;
  endpoint: string;
  interactive: boolean;
  /** The page's button shape and colours, so the submit button matches the link buttons. */
  buttonClass: string;
  buttonStyle?: CSSProperties;
};

type Status = "idle" | "saving" | "done" | "invalid" | "rate_limited" | "closed" | "error";

/**
 * Visitor-facing form on a public bio page. Styled only with the page's own `bio-*`
 * palette: panel primitives follow the visitor's panel theme, not the page's.
 */
const INPUT_CLASSES =
  "h-12 w-full min-w-0 rounded-xl border border-bio-border bg-bio-bg px-4 text-[15px] text-bio-fg shadow-none placeholder:text-bio-fg-muted placeholder:opacity-80 hover:border-bio-border focus:border-bio-accent focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--bio-accent)_25%,transparent)] disabled:cursor-default disabled:border-bio-border disabled:bg-bio-bg disabled:text-bio-fg-muted";

/*
 * Inline glyphs instead of the kit icon set: this is the only client component on a
 * public bio page, and pulling the whole icon map into the visitor's bundle for four
 * symbols is not worth it.
 */
function CheckGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 motion-safe:animate-spin" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function AlertGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 4a1 1 0 0 1 1 1v3.5a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1Zm0 8.5a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.13c-.25.69-1.44 1.32-1.98 1.37-.51.05-1 .24-3.35-.7-2.83-1.12-4.63-4.02-4.77-4.21-.14-.19-1.14-1.52-1.14-2.9 0-1.38.72-2.06.98-2.34.25-.28.55-.35.74-.35l.53.01c.17.01.4-.06.62.48.25.6.84 2.06.91 2.21.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.29.15.46.12.63-.07.17-.19.73-.85.93-1.15.19-.29.39-.24.65-.14.27.1 1.7.8 1.99.95.29.15.49.22.56.34.07.12.07.7-.18 1.38Z" />
    </svg>
  );
}

/**
 * The builder preview renders this inside the editor's own `<form>`, and nested forms are
 * invalid HTML (React reports a hydration error). The inert preview uses a plain `<div>`.
 */
function FormShell({
  interactive,
  className,
  onSubmit,
  children,
}: {
  interactive: boolean;
  className: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return interactive ? (
    <form className={className} onSubmit={onSubmit}>
      {children}
    </form>
  ) : (
    <div className={className}>{children}</div>
  );
}

export function BioFormCapture({
  biopageId,
  blockId,
  mode,
  title,
  buttonLabel,
  whatsappNumber,
  successMessage,
  endpoint,
  interactive,
  buttonClass,
  buttonStyle,
}: BioFormCaptureProps) {
  const t = useTranslations("bio.public");
  const inputId = useId();
  const statusId = useId();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submitClasses = cn(
    "inline-flex h-12 w-full items-center justify-center gap-2 px-5 text-[15px] font-semibold transition-[scale,opacity] duration-150 active:scale-[0.985] disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bio-accent",
    buttonClass,
  );

  const card = "flex w-full flex-col gap-3 rounded-2xl border border-bio-border bg-bio-card p-5 text-left";

  if (mode === "whatsapp") {
    const number = (whatsappNumber ?? "").replace(/[^\d]/g, "");
    const href = number
      ? `https://wa.me/${number}${message.trim() ? `?text=${encodeURIComponent(message.trim())}` : ""}`
      : "#";

    return (
      <FormShell
        interactive={interactive}
        className={card}
        onSubmit={(event) => {
          event.preventDefault();
          if (number) {
            window.open(href, "_blank", "noopener,noreferrer");
          }
        }}
      >
        {title ? <p className="m-0 text-base leading-6 font-semibold text-bio-fg">{title}</p> : null}
        <label htmlFor={inputId} className="sr-only">
          {t("formMessage")}
        </label>
        <textarea
          id={inputId}
          value={message}
          maxLength={300}
          rows={3}
          placeholder={t("formMessagePlaceholder")}
          disabled={!interactive}
          onChange={(event) => setMessage(event.target.value)}
          className={cn(INPUT_CLASSES, "h-auto min-h-24 resize-none py-3 leading-6")}
        />
        <button
          type={interactive ? "submit" : "button"}
          className={submitClasses}
          style={buttonStyle}
          disabled={!interactive || number === ""}
        >
          <WhatsAppGlyph />
          {buttonLabel}
        </button>
      </FormShell>
    );
  }

  if (status === "done") {
    return (
      <div className={cn(card, "items-center py-7 text-center")} role="status">
        <span className="flex size-11 items-center justify-center rounded-full bg-bio-accent text-bio-on-accent">
          <CheckGlyph />
        </span>
        <p className="m-0 text-base leading-6 font-semibold text-bio-fg">
          {successMessage || t("formThanks")}
        </p>
      </div>
    );
  }

  const errorText =
    status === "invalid"
      ? t("formInvalid")
      : status === "rate_limited"
        ? t("formRateLimited")
        : status === "closed"
          ? t("formClosed")
          : status === "error"
            ? t("formError")
            : null;

  return (
    <FormShell
      interactive={interactive}
      className={card}
      onSubmit={(event) => {
        event.preventDefault();
        if (status === "saving") {
          return;
        }
        setStatus("saving");
        void fetch(endpoint, {
          method: "POST",
          // The page is served on the bio hostname and posts to the panel origin;
          // `text/plain` keeps it a CORS-simple request with no preflight.
          headers: { "content-type": "text/plain;charset=UTF-8" },
          body: JSON.stringify({ biopageId, blockId, email: email.trim() }),
        })
          .then((response) => {
            if (response.ok) {
              setStatus("done");
            } else if (response.status === 400) {
              setStatus("invalid");
            } else if (response.status === 429) {
              setStatus("rate_limited");
            } else if (response.status === 404) {
              setStatus("closed");
            } else {
              setStatus("error");
            }
          })
          .catch(() => setStatus("error"));
      }}
    >
      {title ? <p className="m-0 text-base leading-6 font-semibold text-bio-fg">{title}</p> : null}
      <label htmlFor={inputId} className="sr-only">
        {t("formEmail")}
      </label>
      <input
        id={inputId}
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        maxLength={254}
        value={email}
        placeholder={t("formEmailPlaceholder")}
        disabled={!interactive}
        aria-invalid={status === "invalid" || undefined}
        aria-describedby={errorText ? statusId : undefined}
        onChange={(event) => {
          setEmail(event.target.value);
          if (status !== "idle" && status !== "saving") {
            setStatus("idle");
          }
        }}
        className={INPUT_CLASSES}
      />
      <button
        type={interactive ? "submit" : "button"}
        className={submitClasses}
        style={buttonStyle}
        disabled={!interactive || status === "saving"}
        aria-busy={status === "saving" || undefined}
      >
        {status === "saving" ? <SpinnerGlyph /> : null}
        {status === "saving" ? t("formSending") : buttonLabel}
      </button>
      <p id={statusId} role="alert" className={cn("m-0 text-sm leading-5 text-bio-fg", !errorText && "sr-only")}>
        {errorText ? (
          <span className="inline-flex items-start gap-1.5">
            <AlertGlyph />
            {errorText}
          </span>
        ) : null}
      </p>
    </FormShell>
  );
}
