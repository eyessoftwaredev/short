"use client";

import { Icon } from "@/components/kit/icon";

import type { BreakdownRow } from "@short/analytics";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { BreakdownList, Grid, TabPanel, Tabs, type TabItem } from "@/components/ui";
import { browserIcon, countryBadge, deviceIcon, osIcon } from "@/lib/stats-icons";
import { countryName, titleCase } from "@/lib/stats";

export type BreakdownSet = {
  country: BreakdownRow[];
  region: BreakdownRow[];
  city: BreakdownRow[];
  device: BreakdownRow[];
  os: BreakdownRow[];
  browser: BreakdownRow[];
  language: BreakdownRow[];
  referrer: BreakdownRow[];
  utmSource: BreakdownRow[];
  utmMedium: BreakdownRow[];
  utmCampaign: BreakdownRow[];
};

type GroupId = "geography" | "device" | "source";

function toRows(
  rows: BreakdownRow[],
  format: (key: string) => string,
): Array<{ key: string; label: string; value: number }> {
  return rows.map((row) => ({ key: row.key, label: format(row.key), value: row.clicks }));
}

export function StatsBreakdowns({ data }: { data: BreakdownSet }) {
  const t = useTranslations("stats");
  const locale = useLocale();
  const unknown = t("unknown");
  const [group, setGroup] = useState<GroupId>("geography");

  const tabs: readonly TabItem<GroupId>[] = [
    { id: "geography", label: t("geography") },
    { id: "device", label: t("device") },
    { id: "source", label: t("source") },
  ];

  const countryRows = data.country.map((row) => ({
    key: row.key,
    label: countryName(row.key, locale, unknown),
    value: row.clicks,
    badge: countryBadge(row.key),
  }));

  const deviceRows = data.device.map((row) => ({
    key: row.key,
    label: titleCase(row.key, unknown),
    value: row.clicks,
    badge: deviceIcon(row.key),
  }));

  const osRows = data.os.map((row) => ({
    key: row.key,
    label: titleCase(row.key, unknown),
    value: row.clicks,
    badge: osIcon(row.key),
  }));

  const browserRows = data.browser.map((row) => ({
    key: row.key,
    label: titleCase(row.key, unknown),
    value: row.clicks,
    badge: browserIcon(row.key),
  }));

  return (
    <div className="flex flex-col gap-4">
      <Tabs items={tabs} value={group} onChange={setGroup} variant="pill" className="self-start" />

      <TabPanel active={group === "geography"}>
        <Grid columns={3}>
          <BreakdownList
            title={t("countries")}
            rows={countryRows}
            meta={
              <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                <Icon name="globe" className="text-xs text-accent-ink" />
                {t("countriesCount", { count: data.country.length })}
              </span>
            }
          />
          <BreakdownList title={t("region")} rows={toRows(data.region, (key) => titleCase(key, unknown))} />
          <BreakdownList title={t("city")} rows={toRows(data.city, (key) => titleCase(key, unknown))} />
        </Grid>
      </TabPanel>

      <TabPanel active={group === "device"}>
        <Grid columns={2}>
          <BreakdownList
            title={t("device")}
            rows={deviceRows}
            footer={
              <>
                <Icon name="shield" className="text-sm text-accent-ink" />
                {t("botsFiltered")}
              </>
            }
          />
          <BreakdownList
            title={t("os")}
            rows={osRows}
            meta={
              <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                <Icon name="laptop" className="text-xs text-accent-ink" />
                {t("platformsCount", { count: data.os.length })}
              </span>
            }
          />
          <BreakdownList title={t("browser")} rows={browserRows} />
          <BreakdownList title={t("language")} rows={toRows(data.language, (key) => key.toUpperCase())} />
        </Grid>
      </TabPanel>

      <TabPanel active={group === "source"}>
        <Grid columns={2}>
          <BreakdownList
            title={t("referrer")}
            rows={toRows(data.referrer, (key) => (key === "unknown" ? t("direct") : key))}
            footer={
              <>
                <Icon name="share-nodes" className="text-sm text-accent-ink" />
                {t("referrerDirectHint")}
              </>
            }
          />
          <BreakdownList title={t("utmSource")} rows={toRows(data.utmSource, (key) => key)} />
          <BreakdownList title={t("utmMedium")} rows={toRows(data.utmMedium, (key) => key)} />
          <BreakdownList title={t("utmCampaign")} rows={toRows(data.utmCampaign, (key) => key)} />
        </Grid>
      </TabPanel>
    </div>
  );
}
