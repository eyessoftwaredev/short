"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

/** Anything not listed here renders as `warn`, which reads as "needs attention". */
const TONES: Record<string, "accent" | "danger" | "muted" | "warn"> = {
  active: "accent",
  verified: "accent",
  published: "accent",
  paid: "accent",
  pending: "warn",
  provisioning: "warn",
  trialing: "warn",
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
  return <Badge tone={TONES[key] ?? "warn"}>{label}</Badge>;
}
