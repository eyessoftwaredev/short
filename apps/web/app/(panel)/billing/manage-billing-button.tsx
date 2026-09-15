"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui";
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
  label = "Manage billing",
  variant = "default",
  size = "sm",
  className,
  disabled = false,
  withIcon = true,
}: ManageBillingButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const result = await openPortalAction();
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      // Leaves `pending` set on purpose — the tab is navigating to Stripe.
      window.location.href = result.data.url;
    } catch {
      setError("Could not open the billing portal. Try again.");
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
        {withIcon ? <CreditCard className="size-4" aria-hidden="true" /> : null}
        {pending ? "Opening Stripe…" : label}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
