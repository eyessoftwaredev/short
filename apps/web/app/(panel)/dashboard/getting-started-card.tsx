"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/kit/icon";
import { usePanelSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { writeClientCookie } from "@/lib/client-cookie";
import { cn } from "@/lib/cx";
import {
  GETTING_STARTED_COOKIE_MAX_AGE,
  gettingStartedCookieName,
} from "./getting-started-cookie";
import type { GettingStartedStep, GettingStartedStepId } from "./getting-started";

const STEP_ICONS: Record<GettingStartedStepId, IconName> = {
  link: "link",
  qr: "qrcode",
  bio: "address-card",
  domain: "globe",
  team: "user-plus",
  api: "key",
};

export function GettingStartedCard({ steps }: { steps: GettingStartedStep[] }) {
  const t = useTranslations("gettingStarted");
  const session = usePanelSession();
  const [hidden, setHidden] = useState(false);
  const headingId = useId();

  if (hidden) {
    return null;
  }

  const done = steps.filter((step) => step.done).length;

  const dismiss = (): void => {
    try {
      writeClientCookie(
        gettingStartedCookieName(session.workspace.id),
        session.user.id,
        GETTING_STARTED_COOKIE_MAX_AGE,
      );
    } catch {
      /* cookies blocked — the card still hides for this visit */
    }
    setHidden(true);
  };

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 rounded-lg border border-accent-border bg-bg p-5 shadow-card"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id={headingId} className="m-0 text-[15px] leading-6 font-semibold tracking-[-0.01em] text-ink">
              {t("title")}
            </h2>
            <span className="numeric text-xs text-fg-subtle">
              {t("progress", { done, total: steps.length })}
            </span>
          </div>
          <Progress value={done} max={steps.length} size="sm" className="max-w-xs" />
        </div>
        <Button variant="ghost" icon size="sm" aria-label={t("dismiss")} title={t("dismiss")} onClick={dismiss}>
          <Icon name="xmark" className="text-sm" />
        </Button>
      </div>

      <ol className="m-0 flex list-none flex-col divide-y divide-border-subtle p-0">
        {steps.map((step) => (
          <li key={step.id} className="flex min-w-0 items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            {step.done ? (
              <Icon name="circle-check" className="shrink-0 text-base text-success" />
            ) : (
              <span
                className="flex size-4 shrink-0 items-center justify-center rounded-pill border-2 border-border-strong"
                aria-hidden="true"
              />
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span
                className={cn(
                  "truncate text-sm font-medium",
                  step.done && "text-fg-subtle line-through",
                )}
              >
                {t(`${step.id}.title`)}
                {step.done ? <span className="sr-only"> — {t("done")}</span> : null}
              </span>
              {step.done ? null : (
                <span className="hidden truncate text-xs text-fg-muted sm:block">
                  {t(`${step.id}.body`)}
                </span>
              )}
            </span>
            {step.done ? null : (
              <Button size="sm" href={step.href} leadingIcon={STEP_ICONS[step.id]}>
                {t(`${step.id}.cta`)}
              </Button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
