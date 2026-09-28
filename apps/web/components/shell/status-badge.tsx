"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

/** Anything not listed here renders as `warn`, which reads as "needs attention". */
const TONES: Record<string, "success" | "danger" | "muted" | "warn" | "info"> = {
  active: "success",
  verified: "success",
  published: "success",
  paid: "success",
  pending: "warn",
  provisioning: "warn",
  trialing: "info",
  past_due: "danger",
  suspended: "danger",
  error: "danger",
  failed: "danger",
  canceled: "muted",
  archived: "muted",
  draft: "muted",
  expired: "muted",
  paused: "muted",
  disabled: "muted",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("common");
  const key = status.toLowerCase();
  const label = key === "past_due" ? t("pastDue") : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge tone={TONES[key] ?? "warn"} dot>
      {label}
    </Badge>
  );
}
