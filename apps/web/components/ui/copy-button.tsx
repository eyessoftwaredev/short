"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
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
  label = "Copy",
  copiedLabel = "Copied",
  iconOnly = false,
  size = "sm",
  className,
}: CopyButtonProps) {
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
        aria-label={iconOnly ? (copied ? copiedLabel : label) : undefined}
        title={iconOnly ? label : undefined}
        className={cn(iconOnly ? undefined : "gap-1.5", className)}
        onClick={() => {
          void handleCopy();
        }}
      >
        {copied ? (
          <Check className="size-3.5 text-accent-on-surface" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
        {iconOnly ? null : copied ? copiedLabel : label}
      </Button>
      {/*
        The swap to a tick is the only confirmation a sighted user gets; this
        gives a screen-reader user the same acknowledgement.
      */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </>
  );
}
