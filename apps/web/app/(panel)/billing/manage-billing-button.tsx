"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, toast } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { openPortalAction } from "./actions";

type ManageBillingButtonProps = {
  label?: string;
  variant?: "default" | "secondary" | "primary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  withIcon?: boolean;
  block?: boolean;
};

/**
 * Opens the Stripe Customer Portal. Shared by the header, the past-due and
 * cancellation notices and the plan picker so "fix your billing" behaves the
 * same wherever it appears.
 */
export function ManageBillingButton({
  label,
  variant = "default",
  size = "sm",
  className,
  disabled = false,
  withIcon = true,
  block = false,
}: ManageBillingButtonProps) {
  const t = useTranslations("billing");
  const actionMessage = useActionMessage();
  const resolvedLabel = label ?? t("manageBilling");
  const [pending, setPending] = useState(false);

  async function open(): Promise<void> {
    setPending(true);
    try {
      const result = await openPortalAction();
      if (!result.ok) {
        toast.error(t("portalFailed"), actionMessage(result.error));
        setPending(false);
        return;
      }
      // Leaves `pending` set on purpose — the tab is navigating to Stripe.
      window.location.href = result.data.url;
    } catch {
      toast.error(t("portalFailed"), actionMessage("portal_failed"));
      setPending(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      block={block}
      className={className}
      leadingIcon={withIcon ? "credit-card" : undefined}
      loading={pending}
      disabled={disabled}
      onClick={() => {
        void open();
      }}
    >
      {pending ? t("openingStripe") : resolvedLabel}
    </Button>
  );
}
