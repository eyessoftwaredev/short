"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/kit/icon";
import { Button } from "@/components/ui";
import type { LandingShortenError, LandingShortenResult } from "@/lib/landing-shorten";
import { cn } from "@/lib/cx";

export type ShortenFormLabels = {
  label: string;
  placeholder: string;
  submit: string;
  hint: string;
  empty: string;
  resultTitle: string;
  copy: string;
  copied: string;
  open: string;
  another: string;
  claimTitle: string;
  claimBody: string;
  claimCta: string;
  ownedBody: string;
  ownedCta: string;
  errors: Record<LandingShortenError, string>;
};

type ShortenFormProps = {
  labels: ShortenFormLabels;
  /** Sign-up page on the panel host. */
  claimHref: string;
  /** Links list on the panel host, for a signed-in visitor whose link was saved. */
  linksHref: string;
};

/**
 * The hero's instant shortener. Anonymous links land on the platform domain;
 * a signed-in visitor's link goes to their personal workspace (see
 * `lib/landing-shorten.ts`). Deliberately a plain text field, not `type="url"`:
 * people paste `acme.com/launch` without a scheme and the server adds it.
 */
export function ShortenForm({ labels, claimHref, linksHref }: ShortenFormProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ shortUrl: string; owned: boolean; destination: string } | null>(
    null,
  );
  const [copiedNow, setCopiedNow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyboard and screen-reader users land on the thing they most likely want next.
  useEffect(() => {
    if (result) {
      resultRef.current?.querySelector<HTMLButtonElement>("[data-copy]")?.focus();
    }
  }, [result]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (pending) {
      return;
    }
    const url = value.trim();
    if (url === "") {
      setError(labels.empty);
      inputRef.current?.focus();
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/landing/shorten", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json().catch(() => null)) as LandingShortenResult | null;
      if (!payload) {
        setError(labels.errors.failed);
        return;
      }
      if (!payload.ok) {
        setError(labels.errors[payload.error] ?? labels.errors.failed);
        inputRef.current?.focus();
        return;
      }
      setResult({ shortUrl: payload.shortUrl, owned: payload.owned, destination: url });
      setValue("");
    } catch {
      setError(labels.errors.failed);
    } finally {
      setPending(false);
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (!result) {
      return;
    }
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopiedNow(true);
      window.setTimeout(() => setCopiedNow(false), 1600);
    } catch {
      setCopiedNow(false);
    }
  };

  const reset = (): void => {
    setResult(null);
    setCopiedNow(false);
    setError(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (result) {
    const display = result.shortUrl.replace(/^https?:\/\//, "");
    return (
      <div
        ref={resultRef}
        className="animate-pop-in flex w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-bg text-left shadow-pop"
        aria-live="polite"
      >
        <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
          <p className="m-0 flex items-center gap-2 text-[13px] font-medium text-success">
            <Icon name="circle-check" className="text-sm" />
            {labels.resultTitle}
          </p>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate font-mono text-lg font-medium text-ink sm:text-xl"
            >
              {display}
            </a>
            <div className="flex shrink-0 gap-2">
              <Button
                data-copy
                variant="primary"
                leadingIcon={copiedNow ? "check" : "copy"}
                onClick={() => {
                  void handleCopy();
                }}
                aria-live="polite"
              >
                {copiedNow ? labels.copied : labels.copy}
              </Button>
              <Button
                icon
                href={result.shortUrl}
                external
                aria-label={labels.open}
                title={labels.open}
                leadingIcon="external-link"
              />
            </div>
          </div>
          <p className="m-0 flex min-w-0 items-center gap-1.5 text-[13px] text-fg-subtle">
            <Icon name="arrow-right" className="text-xs" />
            <span className="min-w-0 truncate">{result.destination}</span>
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-3 border-t border-border-subtle bg-surface-subtle px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          {result.owned ? (
            <p className="m-0 text-[13px] text-fg-muted">{labels.ownedBody}</p>
          ) : (
            <p className="m-0 min-w-0 text-[13px] leading-relaxed text-fg-muted">
              <span className="font-medium text-ink">{labels.claimTitle}</span> {labels.claimBody}
            </p>
          )}
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" variant="ghost" leadingIcon="rotate-right" onClick={reset}>
              {labels.another}
            </Button>
            {result.owned ? (
              <Button size="sm" href={linksHref} trailingIcon="arrow-right">
                {labels.ownedCta}
              </Button>
            ) : (
              <Button size="sm" href={claimHref} trailingIcon="arrow-right">
                {labels.claimCta}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex w-full max-w-2xl min-w-0 flex-col gap-2"
      aria-busy={pending}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {labels.label}
      </label>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2 rounded-xl border bg-bg p-2 shadow-pop transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--ring)] sm:flex-row sm:items-center",
          error ? "border-danger" : "border-border-strong",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5 pl-2.5">
          <Icon name="link" className="text-sm text-fg-subtle" />
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            inputMode="url"
            name="url"
            value={value}
            placeholder={labels.placeholder}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={2048}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : hintId}
            suppressHydrationWarning
            className="h-11 min-h-0 flex-1 border-0 bg-transparent px-0 text-[15px] shadow-none hover:border-0 focus:shadow-none"
            onChange={(event) => {
              setValue(event.target.value);
              if (error) {
                setError(null);
              }
            }}
          />
        </span>
        <Button type="submit" variant="primary" size="lg" loading={pending} trailingIcon="arrow-right">
          {labels.submit}
        </Button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="m-0 flex items-center gap-1.5 px-1 text-left text-[13px] text-danger">
          <Icon name="circle-xmark" className="text-xs" />
          {error}
        </p>
      ) : (
        <p id={hintId} className="m-0 px-1 text-[13px] text-fg-subtle">
          {labels.hint}
        </p>
      )}
    </form>
  );
}
