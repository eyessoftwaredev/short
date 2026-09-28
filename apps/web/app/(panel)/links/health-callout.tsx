"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Callout, toast } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { recheckLinkHealthAction } from "./health-actions";

type HealthCalloutProps = {
  linkId: string;
  statusCode: number | null;
  /** ISO timestamp of the first failed check in the current streak. */
  brokenSince: string | null;
  /** Adds an "Edit destination" button (the stats page; the editor already is one). */
  editHref?: string;
};

/**
 * "This link's destination looks broken" with a Recheck button. The monitor checks every
 * few hours; Recheck asks right now, so a fixed page clears the warning immediately.
 */
export function HealthCallout({ linkId, statusCode, brokenSince, editHref }: HealthCalloutProps) {
  const t = useTranslations("links.detail");
  const locale = useLocale();
  const router = useRouter();
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [recovered, setRecovered] = useState(false);
  const [lastReason, setLastReason] = useState<{ code: number | null; reason: string | null } | null>(null);

  if (recovered) {
    return null;
  }

  const code = lastReason ? lastReason.code : statusCode;
  const reason = lastReason?.reason ?? null;
  const cause =
    code != null
      ? t("brokenCode", { code })
      : reason === "dns"
        ? t("brokenDns")
        : reason === "timeout"
          ? t("brokenTimeout")
          : t("brokenNoAnswer");

  function recheck(): void {
    startTransition(async () => {
      try {
        const result = await recheckLinkHealthAction(linkId);
        if (!result.ok) {
          toast.error(result.error === "rate_limited" ? t("recheckTooSoon") : actionMessage(result.error));
          return;
        }
        if (result.data.status === "broken") {
          setLastReason({ code: result.data.statusCode, reason: result.data.reason });
          toast.warn(t("stillBroken"));
          return;
        }
        if (result.data.status === "ok") {
          setRecovered(true);
          toast.success(t("healthRecovered"));
        } else {
          // One failed probe is not enough to call it broken again; say so plainly.
          toast.info(t("healthInconclusive"));
        }
        router.refresh();
      } catch {
        toast.error(actionMessage("generic"));
      }
    });
  }

  return (
    <Callout
      tone="danger"
      icon="pulse"
      title={t("brokenTitle")}
      actions={
        <>
          {editHref ? (
            <Button size="sm" variant="ghost" leadingIcon="pen" href={editHref}>
              {t("fixDestination")}
            </Button>
          ) : null}
          <Button size="sm" leadingIcon="rotate-right" loading={pending} onClick={recheck}>
            {t("recheck")}
          </Button>
        </>
      }
    >
      {cause}{" "}
      {brokenSince ? t("brokenSince", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(brokenSince)) }) : null}{" "}
      {t("brokenAdvice")}
    </Callout>
  );
}
