"use client";

import { Icon } from "@/components/kit/icon";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cx";

type CopyButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  /** Icon-only rendering for table rows. */
  iconOnly?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function CopyButton({
  value,
  label,
  copiedLabel,
  iconOnly = false,
  size = "sm",
  className,
}: CopyButtonProps) {
  const t = useTranslations("common");
  const resolvedLabel = label ?? t("copy");
  const resolvedCopied = copiedLabel ?? t("copied");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size={size}
        icon={iconOnly}
        aria-label={iconOnly ? (copied ? resolvedCopied : resolvedLabel) : undefined}
        title={iconOnly ? resolvedLabel : undefined}
        className={cn(iconOnly ? undefined : "gap-1.5", className)}
        onClick={() => {
          void handleCopy();
        }}
      >
        {copied ? (
          <Icon name="check" className="text-xs text-accent-on-surface" aria-hidden="true" />
        ) : (
          <Icon name="copy" className="text-xs" aria-hidden="true" />
        )}
        {iconOnly ? null : copied ? resolvedCopied : resolvedLabel}
      </Button>
      {/*
        The swap to a tick is the only confirmation a sighted user gets; this
        gives a screen-reader user the same acknowledgement.
      */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? resolvedCopied : ""}
      </span>
    </>
  );
}
