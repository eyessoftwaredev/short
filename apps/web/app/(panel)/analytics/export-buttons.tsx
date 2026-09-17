"use client";

import { Button } from "@/components/ui";
import { useTranslations } from "next-intl";

type ExportButtonsProps = {
  href: string;
};

export function ExportButtons({ href }: ExportButtonsProps) {
  const t = useTranslations("stats");
  return (
    <span className="flex gap-2">
      <Button size="sm" href={`${href}&format=csv`}>
        {t("exportCsv")}
      </Button>
      <Button size="sm" href={`${href}&format=json`}>
        {t("exportJson")}
      </Button>
    </span>
  );
}
