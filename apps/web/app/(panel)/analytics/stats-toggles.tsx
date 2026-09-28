"use client";

import { Chip, InfoTip } from "@/components/ui";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TYPES = ["", "click", "qr_scan", "bio_view"] as const;

type StatsType = (typeof TYPES)[number];

/** Link stats pass the link-level types only: bio page views never belong to a link. */
export function StatsToggles({ types = TYPES }: { types?: readonly StatsType[] }) {
  const t = useTranslations("stats");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const includeBots = params.get("includeBots") === "1";
  const type = params.get("type") ?? "";

  function setParam(key: string, value: string | null): void {
    const next = new URLSearchParams(params.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {types.map((value) => (
        <Chip key={value || "all"} active={type === value} onClick={() => setParam("type", value || null)}>
          {value === "" ? t("allEvents") : t(`type.${value}`)}
        </Chip>
      ))}
      <Chip active={includeBots} onClick={() => setParam("includeBots", includeBots ? null : "1")}>
        {t("includeBots")}
      </Chip>
      <InfoTip inline label={t("filtersInfoLabel")}>
        {t("filtersInfo")}
      </InfoTip>
    </div>
  );
}
