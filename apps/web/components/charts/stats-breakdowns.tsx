"use client";

import type { BreakdownRow } from "@short/analytics";
import { Globe, Laptop, Shield, Share2 } from "lucide-react";
import { useState } from "react";
import { BreakdownList, Grid, TabPanel, Tabs, type TabItem } from "@/components/ui";
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

const TABS: readonly TabItem<GroupId>[] = [
  { id: "geography", label: "Geography" },
  { id: "device", label: "Device" },
  { id: "source", label: "Source" },
];

function toRows(
  rows: BreakdownRow[],
  format: (key: string) => string = titleCase,
): Array<{ key: string; label: string; value: number }> {
  return rows.map((row) => ({ key: row.key, label: format(row.key), value: row.clicks }));
}

function toCountryRows(rows: BreakdownRow[]) {
  return rows.map((row) => ({
    key: row.key,
    label: countryName(row.key),
    value: row.clicks,
    badge: row.key === "unknown" ? "??" : row.key.toUpperCase(),
  }));
}

export function StatsBreakdowns({ data }: { data: BreakdownSet }) {
  const [group, setGroup] = useState<GroupId>("geography");

  return (
    <div className="flex flex-col gap-4">
      <Tabs items={TABS} value={group} onChange={setGroup} variant="pill" className="self-start" />

      <TabPanel active={group === "geography"}>
        <Grid columns={3}>
          <BreakdownList
            title="Country"
            rows={toCountryRows(data.country)}
            meta={
              <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                <Globe className="size-3.5 text-accent-ink" />
                {data.country.length} countries
              </span>
            }
          />
          <BreakdownList title="Region" rows={toRows(data.region)} />
          <BreakdownList title="City" rows={toRows(data.city)} />
        </Grid>
      </TabPanel>

      <TabPanel active={group === "device"}>
        <Grid columns={2}>
          <BreakdownList
            title="Device"
            rows={toRows(data.device)}
            footer={
              <>
                <Shield className="size-4 text-accent-ink" />
                Bot traffic is filtered out automatically
              </>
            }
          />
          <BreakdownList
            title="Operating system"
            rows={toRows(data.os)}
            meta={
              <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                <Laptop className="size-3.5 text-accent-ink" />
                {data.os.length} platforms
              </span>
            }
          />
          <BreakdownList title="Browser" rows={toRows(data.browser)} />
          <BreakdownList title="Language" rows={toRows(data.language, (key) => key.toUpperCase())} />
        </Grid>
      </TabPanel>

      <TabPanel active={group === "source"}>
        <Grid columns={2}>
          <BreakdownList
            title="Referrer"
            rows={toRows(data.referrer, (key) => (key === "unknown" ? "Direct" : key))}
            footer={
              <>
                <Share2 className="size-4 text-accent-ink" />
                Visits with no referrer header are counted as direct
              </>
            }
          />
          <BreakdownList title="UTM source" rows={toRows(data.utmSource, (key) => key)} />
          <BreakdownList title="UTM medium" rows={toRows(data.utmMedium, (key) => key)} />
          <BreakdownList title="UTM campaign" rows={toRows(data.utmCampaign, (key) => key)} />
        </Grid>
      </TabPanel>
    </div>
  );
}
