"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";
import { DOMAIN_STATE_KEYS, DOMAIN_STATE_TONE, type DomainState } from "./types";

/** Pending DNS · Verifying SSL · Live · Error — the same four words everywhere. */
export function DomainStatusBadge({ state, size }: { state: DomainState; size?: "sm" | "md" }) {
  const t = useTranslations("domains");
  return (
    <Badge tone={DOMAIN_STATE_TONE[state]} dot size={size}>
      {t(DOMAIN_STATE_KEYS[state].label)}
    </Badge>
  );
}
