"use client";

import { Icon } from "@/components/kit/icon";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { LandingShortenResult } from "@/lib/landing-shorten";

type ShortenFormProps = {
  placeholder: string;
  submit: string;
  copy: string;
  copied: string;
  another: string;
  claim: string;
  claimHref: string;
  invalid: string;
  rateLimited: string;
  quota: string;
  failed: string;
};

export function ShortenForm({
  placeholder,
  submit,
  copy,
  copied,
  another,
  claim,
  claimHref,
  invalid,
  rateLimited,
  quota,
  failed,
}: ShortenFormProps) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [shortHref, setShortHref] = useState<string | null>(null);
  const [owned, setOwned] = useState(false);
  const [copiedNow, setCopiedNow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messageFor = (code: string): string => {
    if (code === "invalid") {
      return invalid;
    }
    if (code === "rate_limited") {
      return rateLimited;
    }
    if (code === "quota") {
      return quota;
    }
    return failed;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/landing/shorten", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const result = (await response.json()) as LandingShortenResult;
      if (!result.ok) {
        setShortHref(null);
        setError(messageFor(result.error));
        return;
      }
      setShortHref(result.shortUrl);
      setOwned(result.owned);
      setValue("");
    } catch {
      setShortHref(null);
      setError(failed);
    } finally {
      setPending(false);
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (!shortHref) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shortHref);
      setCopiedNow(true);
      window.setTimeout(() => setCopiedNow(false), 1400);
    } catch {
      setCopiedNow(false);
    }
  };

  if (shortHref) {
    return (
      <div className="landing-shorten landing-shorten--result">
        <Icon name="check" className="shrink-0 text-sm text-accent" aria-hidden="true" />
        <a className="min-w-0 truncate font-mono text-sm" href={shortHref} target="_blank" rel="noreferrer">
          {shortHref.replace(/^https?:\/\//, "")}
        </a>
        <button type="button" className="kit-btn kit-btn--ghost kit-btn--sm" onClick={() => void handleCopy()}>
          {copiedNow ? copied : copy}
        </button>
        <button
          type="button"
          className="kit-btn kit-btn--ghost kit-btn--sm"
          onClick={() => {
            setShortHref(null);
            setOwned(false);
            setCopiedNow(false);
          }}
        >
          {another}
        </button>
        {owned ? null : (
          <Link className="kit-btn kit-btn--primary kit-btn--sm hidden sm:inline-flex" href={claimHref}>
            {claim}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-xl min-w-0 flex-col items-center gap-2">
      <form
        className="landing-shorten"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <Icon name="link" className="text-sm shrink-0 text-fg-subtle" aria-hidden="true" />
        <input
          type="url"
          name="url"
          value={value}
          placeholder={placeholder}
          autoComplete="url"
          disabled={pending}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
        <button type="submit" className="kit-btn kit-btn--primary" disabled={pending}>
          {submit}
          <Icon name="arrow-right" className="text-sm" aria-hidden="true" />
        </button>
      </form>
      {error ? (
        <p className="m-0 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
