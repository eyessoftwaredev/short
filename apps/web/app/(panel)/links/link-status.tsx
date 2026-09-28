"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";
import type { LinkStatus } from "./link-state";

const TONES = {
  active: "success",
  scheduled: "info",
  expired: "muted",
  limit: "warn",
  archived: "muted",
  disabled: "danger",
} as const;

export function LinkStatusBadge({ status, size = "md" }: { status: LinkStatus; size?: "sm" | "md" }) {
  const t = useTranslations("links.state");
  return (
    <Badge tone={TONES[status]} dot size={size} title={t(`${status}Hint`)}>
      {t(status)}
    </Badge>
  );
}

/** Shown next to the status when the health monitor saw the destination fail twice. */
export function BrokenBadge({ statusCode, size = "md" }: { statusCode: number | null; size?: "sm" | "md" }) {
  const t = useTranslations("links.state");
  return (
    <Badge
      tone="danger"
      size={size}
      title={statusCode ? t("brokenHintCode", { code: statusCode }) : t("brokenHint")}
    >
      <span aria-hidden="true">⚠</span> {t("broken")}
    </Badge>
  );
}
