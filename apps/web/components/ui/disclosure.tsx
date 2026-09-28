"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/kit/icon";
import { cn } from "@/lib/cx";

type DisclosureProps = {
  /** Header text. Defaults to "Advanced settings" / "Gelişmiş ayarlar". */
  title?: ReactNode;
  /** One line under the title saying what is inside. */
  description?: ReactNode;
  /** Small marker on the right, e.g. a Badge counting active options. */
  badge?: ReactNode;
  defaultOpen?: boolean;
  /** Controlled mode. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * `card` (default) draws its own bordered box — use it between cards.
   * `plain` is borderless — use it inside a card or SectionCard.
   */
  variant?: "card" | "plain";
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/**
 * Collapsible section that keeps rarely-used options out of the way — the
 * "Gelişmiş ayarlar" pattern on create/edit forms.
 *
 * The content stays mounted while collapsed (only hidden), so fields inside it
 * keep their values and still submit with a native `<form>`.
 *
 *   <Disclosure description="UTM tags, expiry, password, targeting">
 *     <Field label="Expires at" info="…"><DateTimePicker … /></Field>
 *   </Disclosure>
 */
export function Disclosure({
  title,
  description,
  badge,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  variant = "card",
  children,
  className,
  contentClassName,
}: DisclosureProps) {
  const t = useTranslations("common");
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolled;
  const contentId = useId();

  const toggle = (): void => {
    const next = !open;
    if (controlledOpen == null) {
      setUncontrolled(next);
    }
    onOpenChange?.(next);
  };

  return (
    <div
      className={cn(
        "min-w-0",
        variant === "card" && "rounded-lg border border-border bg-bg shadow-card",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        className={cn(
          "flex w-full min-w-0 items-center gap-3 text-left transition-colors duration-150",
          variant === "card"
            ? "rounded-lg px-5 py-4 hover:bg-surface-subtle"
            : "rounded-default py-2 hover:text-ink",
          variant === "card" && open && "rounded-b-none",
        )}
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-sm bg-surface text-fg-muted transition-transform duration-200",
            open && "rotate-90",
          )}
          aria-hidden="true"
        >
          <Icon name="chevron-right" className="text-[10px]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm leading-5 font-semibold text-ink">{title ?? t("advancedSettings")}</span>
          {description ? (
            <span className="text-[13px] leading-5 text-fg-muted">{description}</span>
          ) : null}
        </span>
        {badge ? <span className="shrink-0">{badge}</span> : null}
      </button>
      <div
        id={contentId}
        hidden={!open}
        className={cn(
          "min-w-0",
          variant === "card" ? "border-t border-border-subtle px-5 py-5" : "pt-3 pl-9",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
