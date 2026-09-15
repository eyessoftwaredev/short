"use client";

import type { TimeseriesPoint } from "@short/analytics";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  chartAxisStyle,
  chartColors,
  chartGridProps,
  formatCompact,
} from "@/components/kit/chart-theme";
import { createChartTooltip } from "@/components/kit/chart-tooltip";

type TimeseriesChartProps = {
  data: TimeseriesPoint[];
  granularity: "hour" | "day";
  height?: number;
  /** Hide the unique-visitor series when the second line adds noise, e.g. small cards. */
  showVisitors?: boolean;
};

const hourFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });
const fullFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function TimeseriesChart({
  data,
  granularity,
  height = 260,
  showVisitors = true,
}: TimeseriesChartProps) {
  // ClickHouse returns naive UTC strings; without the `Z` the browser reads them as local time.
  const points = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        at: new Date(point.bucket.replace(" ", "T") + "Z").getTime(),
      })),
    [data],
  );

  const tickFormat = granularity === "hour" ? hourFormat : dayFormat;
  const TooltipContent = useMemo(
    () =>
      createChartTooltip({
        formatLabel: (label) => fullFormat.format(new Date(Number(label))),
      }),
    [],
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.c1} stopOpacity={0.28} />
            <stop offset="100%" stopColor={chartColors.c1} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
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
          tickFormatter={formatCompact}
        />
        <Tooltip
          cursor={{ stroke: chartColors.grid, strokeDasharray: "4 4" }}
          content={TooltipContent}
        />
        <Area
          type="monotone"
          dataKey="clicks"
          name="Clicks"
          stroke={chartColors.c1}
          strokeWidth={2}
          fill="url(#clicksFill)"
        />
        {showVisitors ? (
          <Area
            type="monotone"
            dataKey="visitors"
            name="Visitors"
            stroke={chartColors.c2}
            strokeWidth={2}
            fill="url(#visitorsFill)"
          />
        ) : null}
      </AreaChart>
    </ResponsiveContainer>
  );
}
