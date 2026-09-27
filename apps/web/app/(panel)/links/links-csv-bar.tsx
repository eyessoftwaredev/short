"use client";

import { Icon } from "@/components/kit/icon";
import { Button } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { exportLinksCsvAction, importLinksCsvAction } from "./csv-actions";

/** Mirrors the server cap so an oversized file fails fast without an upload. */
const MAX_IMPORT_BYTES = 1_000_000;

type Feedback = { tone: "ok" | "error"; message: string; details?: string[] };

export function LinksCsvBar() {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) {
            return;
          }
          setFeedback(null);
          if (file.size > MAX_IMPORT_BYTES) {
            setFeedback({ tone: "error", message: actionMessage("validation") });
            return;
          }
          startTransition(async () => {
            try {
              const text = await file.text();
              const result = await importLinksCsvAction(text);
              if (!result.ok) {
                setFeedback({ tone: "error", message: actionMessage(result.error) });
                return;
              }
              const { created, skipped, errors } = result.data;
              // Partial imports are normal (bad rows, taken slugs); say what happened.
              setFeedback({
                tone: created === 0 && (skipped > 0 || errors.length > 0) ? "error" : "ok",
                message: `${t("importCsv")}: ${t("count", { count: created })} ✓${
                  skipped > 0 ? ` · ${skipped} ✗` : ""
                }`,
                details: errors,
              });
              router.refresh();
            } catch (error) {
              console.error("CSV import failed", error);
              setFeedback({ tone: "error", message: actionMessage("generic") });
            }
          });
        }}
      />
      <Button
        size="sm"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="cloud-up" className="text-sm" />
        {pending ? tc("working") : t("importCsv")}
      </Button>
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          setFeedback(null);
          startTransition(async () => {
            try {
              const result = await exportLinksCsvAction();
              if (!result.ok) {
                setFeedback({ tone: "error", message: actionMessage(result.error) });
                return;
              }
              // BOM so Excel opens UTF-8 titles correctly.
              const blob = new Blob(["﻿", result.data], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "links.csv";
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();
              // Revoking synchronously can cancel the download in some browsers.
              setTimeout(() => URL.revokeObjectURL(url), 0);
            } catch (error) {
              console.error("CSV export failed", error);
              setFeedback({ tone: "error", message: actionMessage("generic") });
            }
          });
        }}
      >
        <Icon name="export" className="text-sm" />
        {t("exportCsv")}
      </Button>
      {feedback ? (
        <div
          role={feedback.tone === "error" ? "alert" : "status"}
          className={
            feedback.tone === "error"
              ? "max-w-md basis-full text-sm text-danger"
              : "max-w-md basis-full text-sm text-fg-muted"
          }
        >
          <span className="flex items-center gap-2">
            {feedback.message}
            <button
              type="button"
              className="text-fg-subtle hover:text-ink"
              aria-label={tc("dismiss")}
              onClick={() => setFeedback(null)}
            >
              ×
            </button>
          </span>
          {feedback.details && feedback.details.length > 0 ? (
            <ul className="m-0 mt-1 list-none p-0 font-mono text-xs text-fg-muted">
              {feedback.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
