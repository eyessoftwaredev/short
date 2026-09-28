"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/kit/icon";
import { Button, Field, Input } from "@/components/ui";
import { checkHandleAction } from "./actions";
import type { HandleStatus } from "./handle";

export type HandleFieldStatus = HandleStatus | "checking" | "error";

type HandleFieldProps = {
  value: string;
  onChange: (value: string) => void;
  /** Selected custom domain id, "" for the platform domain. */
  domainId: string;
  /** Hostname shown before the handle, e.g. `short.ky`. */
  hostname: string;
  /** Page being edited, so its own handle is not reported as taken. */
  pageId?: string;
  /** Saved handle + domain of that page: unchanged means "current", no lookup. */
  savedHandle?: string;
  savedDomainId?: string;
  /** Validation/server error from the surrounding form, shown in place of the live status. */
  error?: string;
  onStatusChange?: (status: HandleFieldStatus) => void;
  autoFocus?: boolean;
  id?: string;
};

const TURKISH: Record<string, string> = { ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g", ç: "c", Ç: "c", ö: "o", Ö: "o", ü: "u", Ü: "u" };

/**
 * Keeps what people type inside the allowed alphabet as they type it: "My Shop" becomes
 * "my-shop" instead of failing validation on save.
 */
export function normalizeHandleInput(raw: string): string {
  return raw
    .replace(/[ıİşŞğĞçÇöÖüÜ]/g, (char) => TURKISH[char] ?? char)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+/, "")
    .slice(0, 128);
}

/**
 * The page address input: `short.ky/` prefix, live "available / taken" check against the
 * server while typing (debounced), and a one-click alternative when the handle is taken.
 */
export function HandleField({
  value,
  onChange,
  domainId,
  hostname,
  pageId,
  savedHandle,
  savedDomainId,
  error,
  onStatusChange,
  autoFocus,
  id,
}: HandleFieldProps) {
  const t = useTranslations("bio.handleField");
  const tb = useTranslations("bio");
  const [status, setStatus] = useState<HandleFieldStatus>("checking");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const request = useRef(0);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    onStatusChangeRef.current?.(status);
  }, [status]);

  useEffect(() => {
    const ticket = ++request.current;
    const handle = value.trim();
    if (handle === "") {
      setStatus("empty");
      setSuggestion(null);
      return undefined;
    }
    if (savedHandle !== undefined && handle === savedHandle && domainId === (savedDomainId ?? "")) {
      setStatus("current");
      setSuggestion(null);
      return undefined;
    }
    setStatus("checking");
    const timer = window.setTimeout(() => {
      void checkHandleAction(handle, domainId, pageId).then((result) => {
        if (ticket !== request.current) {
          return;
        }
        if (!result.ok) {
          setStatus("error");
          setSuggestion(null);
          return;
        }
        setStatus(result.data.status);
        setSuggestion(result.data.suggestion);
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [value, domainId, pageId, savedHandle, savedDomainId]);

  const address = `${hostname}/${value.trim() || t("placeholder")}`;
  const bad =
    status === "taken" ||
    status === "reserved" ||
    status === "invalid" ||
    status === "too_short" ||
    status === "premium";

  const suggestionButton = suggestion ? (
    <Button
      size="sm"
      variant="ghost"
      className="-my-1 h-6 px-1.5 text-accent-ink"
      onClick={() => onChange(suggestion)}
    >
      {t("useSuggestion", { handle: suggestion })}
    </Button>
  ) : null;

  let message: ReactNode = null;
  if (status === "checking") {
    message = t("checking");
  } else if (status === "available") {
    message = (
      <span className="inline-flex items-center gap-1.5 text-success-ink">
        <Icon name="circle-check" className="text-xs" />
        {t("available", { address })}
      </span>
    );
  } else if (status === "current") {
    message = t("current", { address });
  } else if (status === "empty") {
    message = t("empty");
  } else if (status === "error") {
    message = t("checkFailed");
  }

  let problem: ReactNode = null;
  if (status === "taken") {
    problem = (
      <span className="inline-flex flex-wrap items-center gap-x-1">
        {t("taken", { address })} {suggestionButton}
      </span>
    );
  } else if (status === "reserved") {
    problem = (
      <span className="inline-flex flex-wrap items-center gap-x-1">
        {t("reserved")} {suggestionButton}
      </span>
    );
  } else if (status === "invalid") {
    problem = t("invalid");
  } else if (status === "too_short") {
    problem = t("tooShort");
  } else if (status === "premium") {
    problem = (
      <span className="inline-flex flex-wrap items-center gap-x-1">
        {t("premium")}{" "}
        <Link href="/billing" className="font-medium">
          {t("seePlans")}
        </Link>
        {suggestionButton}
      </span>
    );
  }

  return (
    <Field
      label={tb("handle")}
      info={tb("handleInfo")}
      required
      error={error ?? problem ?? undefined}
      hint={message}
    >
      <Input
        id={id}
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        inputMode="url"
        maxLength={128}
        placeholder={t("placeholder")}
        aria-invalid={Boolean(error) || bad || undefined}
        prefix={<span className="font-mono text-[13px]">{hostname}/</span>}
        suffix={
          status === "checking" ? (
            <Icon name="spinner" className="text-xs" />
          ) : status === "available" || status === "current" ? (
            <Icon name="circle-check" className="text-xs text-success" />
          ) : bad ? (
            <Icon name="circle-xmark" className="text-xs text-danger" />
          ) : null
        }
        className="font-mono"
        onChange={(event) => onChange(normalizeHandleInput(event.target.value))}
      />
    </Field>
  );
}
