"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Icon } from "@/components/kit/icon";
import { cn } from "@/lib/cx";

export type StepItem = {
  id: string;
  label: ReactNode;
  /** One short line under the label (vertical layout, or wide screens). */
  description?: ReactNode;
  /** Forces the done state regardless of position, e.g. an optional step that was completed. */
  done?: boolean;
};

type StepsProps = {
  steps: readonly StepItem[];
  /** Current step — its `id` or zero-based index. Earlier steps render as done. */
  current: string | number;
  /**
   * Makes finished steps clickable (go back and edit). Future steps never are:
   * a guided flow must not let people skip required input.
   */
  onStepClick?: (id: string, index: number) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
};

/**
 * Progress through a guided create flow: 1 Destination → 2 Customize → 3 Share.
 * Shows where you are, what is done and what comes next.
 */
export function Steps({
  steps,
  current,
  onStepClick,
  orientation = "horizontal",
  className,
}: StepsProps) {
  const t = useTranslations("common");
  const currentIndex =
    typeof current === "number" ? current : Math.max(0, steps.findIndex((step) => step.id === current));
  const vertical = orientation === "vertical";

  return (
    <nav aria-label={t("progress")} className={cn("min-w-0", className)}>
      <p className="sr-only">{t("stepOf", { current: currentIndex + 1, total: steps.length })}</p>
      <ol
        className={cn(
          "m-0 flex min-w-0 list-none p-0",
          vertical ? "flex-col gap-0" : "flex-row items-start gap-2 sm:gap-3",
        )}
      >
        {steps.map((step, index) => {
          const done = step.done ?? index < currentIndex;
          const active = index === currentIndex;
          const clickable = onStepClick != null && done && !active;
          const marker = (
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-150",
                done && "border-accent bg-accent text-on-accent",
                active && !done && "border-accent bg-accent-surface text-accent-on-surface ring-4 ring-accent-surface",
                !done && !active && "border-border-strong bg-bg text-fg-subtle",
              )}
              aria-hidden="true"
            >
              {done ? <Icon name="check" className="text-[11px]" /> : index + 1}
            </span>
          );
          const text = (
            <span className={cn("flex min-w-0 flex-col", !vertical && "hidden sm:flex")}>
              <span
                className={cn(
                  "truncate text-sm leading-5 font-medium",
                  active ? "text-ink" : done ? "text-ink" : "text-fg-subtle",
                )}
              >
                {step.label}
                {done ? <span className="sr-only"> ({t("completed")})</span> : null}
              </span>
              {step.description ? (
                <span className="truncate text-[13px] leading-5 text-fg-subtle">{step.description}</span>
              ) : null}
            </span>
          );
          const inner = (
            <>
              {marker}
              {text}
            </>
          );

          return (
            <li
              key={step.id}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex min-w-0",
                vertical ? "relative gap-3 pb-6 last:pb-0" : "flex-1 items-center gap-2 sm:gap-3",
              )}
            >
              {vertical && index < steps.length - 1 ? (
                <span
                  className={cn(
                    "absolute top-8 bottom-1 left-3.5 w-px -translate-x-1/2",
                    done ? "bg-accent" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              ) : null}
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(step.id, index)}
                  className="flex min-w-0 items-center gap-3 rounded-default text-left hover:opacity-80"
                >
                  {inner}
                </button>
              ) : (
                <span className={cn("flex min-w-0 gap-3", vertical ? "items-start" : "items-center")}>
                  {inner}
                </span>
              )}
              {!vertical && index < steps.length - 1 ? (
                <span
                  className={cn("h-px min-w-4 flex-1", done ? "bg-accent" : "bg-border")}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      {/* Small screens hide inline labels, so name the current step once. */}
      {!vertical ? (
        <p className="m-0 mt-2 text-sm font-medium text-ink sm:hidden">
          {steps[currentIndex]?.label}
        </p>
      ) : null}
    </nav>
  );
}
