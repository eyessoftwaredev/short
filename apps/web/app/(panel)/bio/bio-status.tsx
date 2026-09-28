"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";
import type { BioStatus } from "./status";

const TONES: Record<BioStatus, "success" | "info" | "muted" | "warn"> = {
  live: "success",
  scheduled: "info",
  ended: "warn",
  draft: "muted",
};

export function BioStatusBadge({ status, size }: { status: BioStatus; size?: "sm" | "md" }) {
  const t = useTranslations("bio.status");
  return (
    <Badge tone={TONES[status]} dot size={size}>
      {t(status)}
    </Badge>
  );
}
