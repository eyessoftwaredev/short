"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Chip, InfoTip } from "@/components/ui";

/** "Include bots" filter for the bio stats page, kept in `?includeBots=1`. */
export function BotsToggle() {
  const t = useTranslations("stats");
  const tb = useTranslations("bio.statsPage");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const active = params.get("includeBots") === "1";

  return (
    <span className="inline-flex items-center gap-1.5">
      <Chip
        active={active}
        onClick={() => {
          const next = new URLSearchParams(params.toString());
          if (active) {
            next.delete("includeBots");
          } else {
            next.set("includeBots", "1");
          }
          const query = next.toString();
          startTransition(() => {
            router.replace(query === "" ? pathname : `${pathname}?${query}`, { scroll: false });
          });
        }}
      >
        {t("includeBots")}
      </Chip>
      <InfoTip inline label={t("includeBots")}>
        {tb("botsInfo")}
      </InfoTip>
    </span>
  );
}
