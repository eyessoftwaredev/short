"use client";

import { Icon } from "@/components/kit/icon";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { openPortalAction } from "./actions";

type ManageBillingButtonProps = {
  label?: string;
  variant?: "default" | "primary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  withIcon?: boolean;
};

/**
 * Shared by the past-due banner, the payment-method card and the plan picker so the
 * "fix your billing" action is identical wherever it appears.
 */
export function ManageBillingButton({
  label,
  variant = "default",
  size = "sm",
  className,
  disabled = false,
  withIcon = true,
}: ManageBillingButtonProps) {
  const t = useTranslations("billing");
  const actionMessage = useActionMessage();
  const resolvedLabel = label ?? t("manageBilling");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const result = await openPortalAction();
      if (!result.ok) {
        setError(actionMessage(result.error));
        setPending(false);
        return;
      }
      // Leaves `pending` set on purpose — the tab is navigating to Stripe.
      window.location.href = result.data.url;
    } catch {
      setError(actionMessage("portal_failed"));
      setPending(false);
    }
  }

  return (
    <span className="flex min-w-0 flex-col items-start gap-1.5">
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={pending || disabled}
        onClick={() => {
          void open();
        }}
      >
        {withIcon ? <Icon name="credit-card" className="text-sm" aria-hidden="true" /> : null}
        {pending ? t("openingStripe") : resolvedLabel}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
