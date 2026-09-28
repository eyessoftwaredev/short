"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/kit/icon";

type PublicMobileNavProps = {
  links: ReadonlyArray<{ href: string; label: string }>;
  /** Locale switcher and account buttons, rendered under the links. */
  footer?: ReactNode;
};

/**
 * Phone-width navigation. A disclosure rather than a drawer: four links do not
 * need a panel that slides, and it closes itself when a link is followed or
 * focus leaves it.
 */
export function PublicMobileNav({ links, footer }: PublicMobileNavProps) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const onPointer = (event: PointerEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t("close") : t("openMenu")}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-default text-fg-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <Icon name={open ? "xmark" : "bars"} className="text-sm" />
      </button>
      {open ? (
        <div
          id={panelId}
          className="animate-pop-in absolute inset-x-0 top-full border-b border-border bg-elevated px-4 pt-2 pb-4 shadow-pop"
        >
          <nav className="flex flex-col" aria-label={t("mainNav")}>
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-default px-2 py-2.5 text-[15px] font-medium text-ink no-underline hover:bg-surface hover:text-ink hover:no-underline"
              >
                {link.label}
              </a>
            ))}
          </nav>
          {footer ? (
            <div className="mt-3 flex flex-col gap-3 border-t border-border-subtle pt-3">{footer}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
