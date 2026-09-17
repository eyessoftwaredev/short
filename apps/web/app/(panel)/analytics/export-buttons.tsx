"use client";

import { Icon } from "@/components/kit/icon";
import { Button, Dropdown } from "@/components/ui";
import { useTranslations } from "next-intl";

type ExportButtonsProps = {
  href: string;
};

export function ExportButtons({ href }: ExportButtonsProps) {
  const t = useTranslations("stats");
  return (
    <Dropdown
      align="end"
      label={t("export")}
      trigger={
        <Button size="sm" type="button">
          <Icon name="export" className="text-xs" />
          {t("export")}
          <Icon name="chevron-down" className="text-xs text-fg-subtle" />
        </Button>
      }
      items={[
        { id: "csv", label: t("exportCsv"), href: `${href}&format=csv` },
        { id: "json", label: t("exportJson"), href: `${href}&format=json` },
      ]}
    />
  );
}
