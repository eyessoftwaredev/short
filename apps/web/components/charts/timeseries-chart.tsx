"use client";

import type { TimeseriesPoint } from "@short/analytics";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  chartAxisStyle,
  chartColors,
  chartGridProps,
  chartMargin,
  chartTooltipCursor,
  formatCompact,
  singlePointDot,
  valueDomain,
} from "@/components/kit/chart-theme";
import { createChartTooltip } from "@/components/kit/chart-tooltip";

type TimeseriesChartProps = {
  data: TimeseriesPoint[];
  granularity: "hour" | "day";
  height?: number;
  /** Hide the unique-visitor series when the second line adds noise, e.g. small cards. */
  showVisitors?: boolean;
  /** Series names in the tooltip. Default to the localized "Clicks" / "Visitors". */
  clicksLabel?: string;
  visitorsLabel?: string;
};

export function TimeseriesChart({
  data,
  granularity,
  height = 260,
  showVisitors = true,
  clicksLabel,
  visitorsLabel,
}: TimeseriesChartProps) {
  const t = useTranslations("stats");
  const locale = useLocale();
  // Two charts on one page must not share gradient ids, or the second paints with the first's.
  // React ids contain `:` or `«»`, which are awkward inside `url(#…)`; keep the safe part.
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clicksFill = `clicks-${gradientId}`;
  const visitorsFill = `visitors-${gradientId}`;

  // ClickHouse returns naive UTC strings; without the `Z` the browser reads them as local time.
  const points = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        at: new Date(point.bucket.replace(" ", "T") + "Z").getTime(),
      })),
    [data],
  );
  const peak = useMemo(() => points.reduce((max, point) => Math.max(max, point.clicks), 0), [points]);

  const formats = useMemo(
    () => ({
      hour: new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
      day: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }),
      fullHour: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      fullDay: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      number: new Intl.NumberFormat(locale),
    }),
    [locale],
  );

  const tickFormat = granularity === "hour" ? formats.hour : formats.day;
  const labelFormat = granularity === "hour" ? formats.fullHour : formats.fullDay;
  const TooltipContent = useMemo(
    () =>
      createChartTooltip({
        formatLabel: (label) => labelFormat.format(new Date(Number(label))),
        valueFormatter: (value) => formats.number.format(value),
      }),
    [labelFormat, formats],
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={chartMargin}>
        <defs>
          <linearGradient id={clicksFill} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.c1} stopOpacity={0.28} />
            <stop offset="100%" stopColor={chartColors.c1} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={visitorsFill} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.c2} stopOpacity={0.2} />
            <stop offset="100%" stopColor={chartColors.c2} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...chartGridProps} />
        <XAxis
          dataKey="at"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tick={chartAxisStyle}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tickFormatter={(value: number) => tickFormat.format(new Date(value))}
        />
        <YAxis
          tick={chartAxisStyle}
          tickLine={false}
          axisLine={false}
          width={48}
          allowDecimals={false}
          domain={valueDomain(peak)}
          tickFormatter={formatCompact}
        />
        <Tooltip cursor={chartTooltipCursor} content={TooltipContent} />
        <Area
          type="monotone"
          dataKey="clicks"
          name={clicksLabel ?? t("clicks")}
          stroke={chartColors.c1}
          strokeWidth={2}
          fill={`url(#${clicksFill})`}
          dot={singlePointDot(points.length, chartColors.c1)}
          activeDot={{ r: 4, strokeWidth: 0, fill: chartColors.c1 }}
        />
        {showVisitors ? (
          <Area
            type="monotone"
            dataKey="visitors"
            name={visitorsLabel ?? t("visitors")}
            stroke={chartColors.c2}
            strokeWidth={2}
            fill={`url(#${visitorsFill})`}
            dot={singlePointDot(points.length, chartColors.c2)}
            activeDot={{ r: 4, strokeWidth: 0, fill: chartColors.c2 }}
          />
        ) : null}
      </AreaChart>
    </ResponsiveContainer>
  );
}
