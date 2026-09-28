"use client";

import { Button, Dropdown } from "@/components/ui";
import { useTranslations } from "next-intl";

type ExportButtonsProps = {
  /** Export endpoint with the current range and filters, e.g. `/api/analytics/export?range=7d`. */
  href: string;
};

export function ExportButtons({ href }: ExportButtonsProps) {
  const t = useTranslations("stats");
  const join = href.includes("?") ? "&" : "?";
  return (
    <Dropdown
      align="end"
      label={t("export")}
      trigger={
        <Button size="sm" type="button" leadingIcon="download" trailingIcon="chevron-down">
          {t("export")}
        </Button>
      }
      items={[
        {
          id: "csv",
          label: t("exportCsv"),
          description: t("exportCsvDesc"),
          href: `${href}${join}format=csv`,
        },
        {
          id: "json",
          label: t("exportJson"),
          description: t("exportJsonDesc"),
          href: `${href}${join}format=json`,
        },
      ]}
    />
  );
}
