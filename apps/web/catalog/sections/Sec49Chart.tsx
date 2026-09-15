"use client";

import {
  ChartTooltip,
  Grid,
  SparkTooltip,
  chartAxisStyle,
  chartColors,
  chartGridProps,
  createChartTooltip,
  formatCompact,
} from "@/components/kit";
import chartsData from "@/data/charts.json";
import copyData from "@/data/copy.json";
import { cx } from "@/lib/cx";
import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-49");

type StatRange = "14g" | "30g" | "90g";

type SparkHover = {
  label: string;
  value: number;
  x: number;
  y: number;
  visible: boolean;
};

type HeatHover = {
  day: string;
  intensity: number;
  x: number;
  y: number;
  visible: boolean;
};

type BulletHover = {
  label: string;
  val: string;
  range: string;
  mark: string;
  x: number;
  y: number;
  visible: boolean;
};

const PLOT_HEIGHT = 140;
const PLOT_HEIGHT_TALL = 180;

const funnelCounts = [12400, 3100, 1800, 640];

const compactTooltip = createChartTooltip({
  valueFormatter: (value) => formatCompact(value),
});

const percentTooltip = createChartTooltip({
  valueFormatter: (value) => `%${value}`,
});

const shareTooltip = createChartTooltip({
  valueFormatter: (value, name) => (name === "share" ? `%${Math.round(value)}` : String(value)),
});

const composedTooltip = createChartTooltip({
  valueFormatter: (value, name) => (name === "growth" ? `%${value}` : formatCompact(value)),
});

const funnelTooltip = createChartTooltip({
  valueFormatter: (value, name) => (name === "value" ? formatCompact(value) : String(value)),
});

function ChartPlot({ children, height = PLOT_HEIGHT }: { children: ReactElement; height?: number }) {
  return (
    <div className="kit-chart__plot" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function Sec49Chart() {
  const [statRange, setStatRange] = useState<StatRange>("30g");
  const [heatKey, setHeatKey] = useState("");
  const [sparkHover, setSparkHover] = useState<SparkHover>({
    label: "",
    value: 0,
    x: 0,
    y: 0,
    visible: false,
  });
  const [heatHover, setHeatHover] = useState<HeatHover>({
    day: "",
    intensity: 0,
    x: 0,
    y: 0,
    visible: false,
  });
  const [bulletHover, setBulletHover] = useState<BulletHover>({
    label: "",
    val: "",
    range: "",
    mark: "",
    x: 0,
    y: 0,
    visible: false,
  });

  const areaData = useMemo(
    () => chartsData.areaSeries[statRange],
    [statRange],
  );

  const columnData = useMemo(
    () =>
      chartsData.colBars.map((value, index) => ({
        day: chartsData.weekTicks[index] ?? String(index + 1),
        sessions: value * 50,
      })),
    [],
  );

  const groupedData = useMemo(
    () =>
      chartsData.groupBars.map((bar, index) => ({
        day: chartsData.weekTicks[index] ?? String(index + 1),
        Web: bar.a * 40,
        Mobil: bar.b * 40,
      })),
    [],
  );

  const stackedData = useMemo(
    () =>
      chartsData.stackBars.map((bar, index) => ({
        day: chartsData.weekTicks[index] ?? String(index + 1),
        Organik: Math.round(bar.h * (bar.a / 100) * 10),
        Ücretli: Math.round(bar.h * (bar.b / 100) * 10),
      })),
    [],
  );

  const rankData = useMemo(
    () =>
      chartsData.rankBars.map((bar) => ({
        name: bar.name,
        share: bar.w,
        label: bar.val,
      })),
    [],
  );

  const funnelData = useMemo(
    () =>
      chartsData.funnelSteps.map((step, index) => ({
        name: step.label,
        value: funnelCounts[index] ?? 100,
        display: step.val,
      })),
    [],
  );

  const heatHint = heatKey === "" ? "Hücre seç" : `Gün ${Number(heatKey) + 1}`;

  const heatCells = useMemo(
    () =>
      chartsData.heatCells.map((heat, index) => ({
        heat: String(heat),
        label: `Hücre ${index + 1}`,
        onClass: heatKey === String(index) ? "kit-heat__cell--on" : "",
        day: chartsData.heatDays[index % chartsData.heatDays.length] ?? "",
        week: Math.floor(index / chartsData.heatDays.length) + 1,
      })),
    [heatKey],
  );

  const handleSparkEnter = useCallback(
    (event: ReactMouseEvent<HTMLSpanElement>, barIndex: number, kpiLabel: string, bars: number[]) => {
      setSparkHover({
        label: `${kpiLabel} · ${barIndex + 1}`,
        value: bars[barIndex] ?? 0,
        x: event.clientX,
        y: event.clientY,
        visible: true,
      });
    },
    [],
  );

  const handleSparkMove = useCallback((event: ReactMouseEvent<HTMLSpanElement>) => {
    setSparkHover((prev) => (prev.visible ? { ...prev, x: event.clientX, y: event.clientY } : prev));
  }, []);

  const handleSparkLeave = useCallback(() => {
    setSparkHover((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleHeatEnter = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, cell: (typeof heatCells)[number], intensity: number) => {
      setHeatHover({
        day: `${cell.day} · Hafta ${cell.week}`,
        intensity,
        x: event.clientX,
        y: event.clientY,
        visible: true,
      });
    },
    [],
  );

  const handleHeatMove = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    setHeatHover((prev) => (prev.visible ? { ...prev, x: event.clientX, y: event.clientY } : prev));
  }, []);

  const handleHeatLeave = useCallback(() => {
    setHeatHover((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleBulletEnter = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>, bullet: (typeof chartsData.bullets)[number]) => {
      setBulletHover({
        label: bullet.label,
        val: bullet.val,
        range: bullet.range,
        mark: bullet.mark,
        x: event.clientX,
        y: event.clientY,
        visible: true,
      });
    },
    [],
  );

  const handleBulletMove = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    setBulletHover((prev) => (prev.visible ? { ...prev, x: event.clientX, y: event.clientY } : prev));
  }, []);

  const handleBulletLeave = useCallback(() => {
    setBulletHover((prev) => ({ ...prev, visible: false }));
  }, []);

  const pieCenter = chartsData.pieSlices[0];

  return (
    <SectionFrame
      id={meta.id}
      heading={meta.heading}
      blurb={meta.blurb || "İstatistik panelleri. Seriler --chart-1…5; Recharts + hover tooltip."}
    >
      <Grid columns={3}>
        {chartsData.sparkKpis.map((kpi) => (
          <div key={kpi.label} className="kit-chart">
            <span className="kit-card__label">{kpi.label}</span>
            <span className="kit-chart__value">{kpi.value}</span>
            <span className="kit-chart__meta" style={{ color: kpi.deltaColor }}>
              {kpi.delta}
            </span>
            <div className={cx("kit-spark", kpi.sparkClass)}>
              {kpi.bars.map((height, index) => (
                <span
                  key={index}
                  className="kit-spark__bar"
                  style={{ height: `${height}%` }}
                  onMouseEnter={(event) => handleSparkEnter(event, index, kpi.label, kpi.bars)}
                  onMouseMove={handleSparkMove}
                  onMouseLeave={handleSparkLeave}
                />
              ))}
            </div>
          </div>
        ))}
      </Grid>

      <SparkTooltip {...sparkHover} />

      <Grid columns={2}>
        <div className="kit-chart">
          <div className="kit-chart__head">
            <div>
              <h3 className="kit-chart__title">Oturum</h3>
              <div className="kit-chart__value">{chartsData.areaValues[statRange]}</div>
              <div className="kit-chart__meta">{chartsData.areaMeta[statRange]}</div>
            </div>
            <div className="kit-legend">
              {copyData.statRanges.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={cx("kit-chip", statRange === label && "kit-chip--on")}
                  onClick={() => setStatRange(label as StatRange)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ChartPlot>
            <AreaChart data={areaData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.accentSurface} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={chartColors.accentSurface} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="day" tick={chartAxisStyle} axisLine={false} tickLine={false} />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip cursor={{ stroke: chartColors.grid, strokeDasharray: "4 4" }} content={compactTooltip} />
              <Area
                type="monotone"
                dataKey="sessions"
                name="Oturum"
                stroke={chartColors.c1}
                fill="url(#areaFill)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: chartColors.c1, stroke: chartColors.accent }}
              />
            </AreaChart>
          </ChartPlot>
        </div>

        <div className="kit-chart">
          <div className="kit-chart__head">
            <div>
              <h3 className="kit-chart__title">Panel vs API</h3>
              <div className="kit-chart__meta">İki seri çizgi</div>
            </div>
            <div className="kit-legend">
              <span className="kit-legend__item">
                <span className="kit-legend__dot" style={{ background: chartColors.c1 }} />
                Panel
              </span>
              <span className="kit-legend__item">
                <span className="kit-legend__dot" style={{ background: chartColors.c2 }} />
                API
              </span>
            </div>
          </div>
          <ChartPlot>
            <AreaChart data={chartsData.dualLineSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="day" tick={chartAxisStyle} axisLine={false} tickLine={false} />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip cursor={{ stroke: chartColors.grid, strokeDasharray: "4 4" }} content={compactTooltip} />
              <Line
                type="monotone"
                dataKey="panel"
                name="Panel"
                stroke={chartColors.c1}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="api"
                name="API"
                stroke={chartColors.c2}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ChartPlot>
        </div>
      </Grid>

      <Grid columns={3}>
        <div className="kit-chart">
          <h3 className="kit-chart__title">Günlük oturum</h3>
          <ChartPlot>
            <BarChart data={columnData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="day" tick={chartAxisStyle} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{ fill: chartColors.accentSurface, opacity: 0.35 }} content={compactTooltip} />
              <Bar dataKey="sessions" name="Oturum" fill={chartColors.c1} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartPlot>
        </div>

        <div className="kit-chart">
          <div className="kit-chart__head">
            <h3 className="kit-chart__title">Gruplu</h3>
            <div className="kit-legend">
              <span className="kit-legend__item">
                <span className="kit-legend__dot" style={{ background: chartColors.c1 }} />
                Web
              </span>
              <span className="kit-legend__item">
                <span className="kit-legend__dot" style={{ background: chartColors.c2 }} />
                Mobil
              </span>
            </div>
          </div>
          <ChartPlot>
            <BarChart data={groupedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="day" tick={chartAxisStyle} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{ fill: chartColors.accentSurface, opacity: 0.25 }} content={compactTooltip} />
              <Bar dataKey="Web" fill={chartColors.c1} radius={[4, 4, 0, 0]} maxBarSize={14} />
              <Bar dataKey="Mobil" fill={chartColors.c2} radius={[4, 4, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ChartPlot>
        </div>

        <div className="kit-chart">
          <div className="kit-chart__head">
            <h3 className="kit-chart__title">Yığın</h3>
            <div className="kit-legend">
              <span className="kit-legend__item">
                <span className="kit-legend__dot" style={{ background: chartColors.c1 }} />
                Organik
              </span>
              <span className="kit-legend__item">
                <span className="kit-legend__dot" style={{ background: chartColors.c4 }} />
                Ücretli
              </span>
            </div>
          </div>
          <ChartPlot>
            <BarChart data={stackedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="day" tick={chartAxisStyle} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{ fill: chartColors.accentSurface, opacity: 0.25 }} content={compactTooltip} />
              <Bar dataKey="Organik" stackId="stack" fill={chartColors.c1} radius={[0, 0, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Ücretli" stackId="stack" fill={chartColors.c4} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartPlot>
        </div>
      </Grid>

      <Grid columns={3}>
        <div className="kit-chart">
          <h3 className="kit-chart__title">Kaynak sıralama</h3>
          <ChartPlot height={PLOT_HEIGHT_TALL}>
            <BarChart
              data={rankData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid {...chartGridProps} horizontal={false} />
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="name"
                width={72}
                tick={chartAxisStyle}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: chartColors.accentSurface, opacity: 0.25 }} content={shareTooltip} />
              <Bar dataKey="share" name="Pay" fill={chartColors.c1} radius={[0, 4, 4, 0]} maxBarSize={14} />
            </BarChart>
          </ChartPlot>
        </div>

        <div className="kit-chart">
          <h3 className="kit-chart__title">Pay</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <ChartPlot height={128}>
              <PieChart>
                <Tooltip content={percentTooltip} />
                <Pie
                  data={chartsData.pieSlices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={38}
                  outerRadius={58}
                  paddingAngle={2}
                  stroke="var(--bg)"
                  strokeWidth={2}
                >
                  {chartsData.pieSlices.map((slice) => (
                    <Cell key={slice.name} fill={slice.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartPlot>
            <div className="kit-legend" style={{ flexDirection: "column" }}>
              {chartsData.pieSlices.map((slice) => (
                <span key={slice.name} className="kit-legend__item">
                  <span className="kit-legend__dot" style={{ background: slice.fill }} />
                  {slice.name} %{slice.value}
                </span>
              ))}
            </div>
          </div>
          {pieCenter ? (
            <div className="kit-chart__meta" style={{ marginTop: 8 }}>
              Öne çıkan: {pieCenter.name} %{pieCenter.value}
            </div>
          ) : null}
          <div className="kit-share" style={{ marginTop: 12 }}>
            {chartsData.pieSlices.map((slice) => (
              <span key={slice.name} style={{ width: `${slice.value}%`, background: slice.fill }} />
            ))}
          </div>
        </div>

        <div className="kit-chart">
          <h3 className="kit-chart__title">Huni</h3>
          <ChartPlot height={PLOT_HEIGHT_TALL}>
            <FunnelChart>
              <Tooltip content={funnelTooltip} />
              <Funnel dataKey="value" data={funnelData} isAnimationActive={false}>
                <LabelList
                  position="right"
                  fill="var(--fg-muted)"
                  stroke="none"
                  dataKey="name"
                  style={{ fontSize: 11 }}
                />
                {funnelData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={[chartColors.c1, chartColors.c2, chartColors.c3, chartColors.c4][index] ?? chartColors.c5}
                  />
                ))}
              </Funnel>
            </FunnelChart>
          </ChartPlot>
          <div className="kit-chart__meta" style={{ marginTop: 8 }}>
            {chartsData.funnelSteps.map((step) => `${step.label} ${step.val}`).join(" · ")}
          </div>
        </div>
      </Grid>

      <Grid columns={3}>
        <div className="kit-chart">
          <div className="kit-chart__head">
            <h3 className="kit-chart__title">Composed · gelir + büyüme</h3>
            <div className="kit-legend">
              <span className="kit-legend__item">
                <span className="kit-legend__dot" style={{ background: chartColors.c1 }} />
                Gelir
              </span>
              <span className="kit-legend__item">
                <span className="kit-legend__dot" style={{ background: chartColors.c3 }} />
                Büyüme %
              </span>
            </div>
          </div>
          <ChartPlot>
            <ComposedChart data={chartsData.composedSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="day" tick={chartAxisStyle} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" hide />
              <YAxis yAxisId="right" orientation="right" hide domain={[0, 30]} />
              <Tooltip cursor={{ fill: chartColors.accentSurface, opacity: 0.2 }} content={composedTooltip} />
              <Bar yAxisId="left" dataKey="revenue" name="Gelir" fill={chartColors.c1} radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="growth"
                name="Büyüme"
                stroke={chartColors.c3}
                strokeWidth={2}
                dot={{ r: 3, fill: chartColors.c3 }}
              />
            </ComposedChart>
          </ChartPlot>
        </div>

        <div className="kit-chart">
          <h3 className="kit-chart__title">Scatter · oturum / dönüşüm</h3>
          <ChartPlot>
            <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis
                type="number"
                dataKey="sessions"
                name="Oturum"
                tick={chartAxisStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="conversion"
                name="Dönüşüm"
                tick={chartAxisStyle}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                cursor={{ strokeDasharray: "4 4", stroke: chartColors.grid }}
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    payload={props.payload}
                    label={props.label}
                    formatLabel={() => {
                      const row = props.payload?.[0]?.payload as { label?: string } | undefined;
                      return row?.label ?? "";
                    }}
                    valueFormatter={(value, name) =>
                      name === "Dönüşüm" || name === "conversion" ? `%${value}` : formatCompact(value)
                    }
                  />
                )}
              />
              <Scatter data={chartsData.scatterPoints} fill={chartColors.c2} name="Kanal" />
            </ScatterChart>
          </ChartPlot>
        </div>

        <div className="kit-chart">
          <div className="kit-chart__head">
            <h3 className="kit-chart__title">Radar · kanal</h3>
            <div className="kit-legend">
              <span className="kit-legend__item">
                <span className="kit-legend__dot" style={{ background: chartColors.c1 }} />
                Erişim
              </span>
              <span className="kit-legend__item">
                <span className="kit-legend__dot" style={{ background: chartColors.c2 }} />
                Etkileşim
              </span>
              <span className="kit-legend__item">
                <span className="kit-legend__dot" style={{ background: chartColors.c4 }} />
                Tutma
              </span>
            </div>
          </div>
          <ChartPlot height={PLOT_HEIGHT_TALL}>
            <RadarChart data={chartsData.radarChannels} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke={chartColors.grid} />
              <PolarAngleAxis dataKey="channel" tick={chartAxisStyle} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip content={percentTooltip} />
              <Radar name="Erişim" dataKey="reach" stroke={chartColors.c1} fill={chartColors.c1} fillOpacity={0.2} />
              <Radar
                name="Etkileşim"
                dataKey="engagement"
                stroke={chartColors.c2}
                fill={chartColors.c2}
                fillOpacity={0.15}
              />
              <Radar
                name="Tutma"
                dataKey="retention"
                stroke={chartColors.c4}
                fill={chartColors.c4}
                fillOpacity={0.12}
              />
            </RadarChart>
          </ChartPlot>
        </div>
      </Grid>

      <Grid columns={3}>
        <div className="kit-chart">
          <div className="kit-chart__head">
            <h3 className="kit-chart__title">Aktivite ısısı</h3>
            <span className="kit-chart__meta">{heatHint}</span>
          </div>
          <div className="kit-legend" style={{ marginBottom: -8 }}>
            {chartsData.heatDays.map((day) => (
              <span
                key={day}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--fg-disabled)",
                }}
              >
                {day}
              </span>
            ))}
          </div>
          <div className="kit-heat">
            {heatCells.map((cell, index) => (
              <button
                key={index}
                type="button"
                className={cx("kit-heat__cell", cell.onClass)}
                style={{ "--heat": cell.heat } as CSSProperties}
                aria-label={cell.label}
                onClick={() => setHeatKey(String(index))}
                onMouseEnter={(event) => handleHeatEnter(event, cell, Number(cell.heat))}
                onMouseMove={handleHeatMove}
                onMouseLeave={handleHeatLeave}
              />
            ))}
          </div>
        </div>

        <div className="kit-chart">
          <h3 className="kit-chart__title">Kota vs hedef</h3>
          <div className="kit-bullet">
            {chartsData.bullets.map((bullet) => (
              <div key={bullet.label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  <span>{bullet.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>{bullet.val}</span>
                </div>
                <div
                  className="kit-bullet__track"
                  onMouseEnter={(event) => handleBulletEnter(event, bullet)}
                  onMouseMove={handleBulletMove}
                  onMouseLeave={handleBulletLeave}
                >
                  <span className="kit-bullet__range" style={{ width: bullet.range }} />
                  <span className="kit-bullet__value" style={{ width: bullet.value }} />
                  <span className="kit-bullet__mark" style={{ left: bullet.mark }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="kit-chart">
          <h3 className="kit-chart__title">Radial · kota</h3>
          <ChartPlot height={PLOT_HEIGHT_TALL}>
            <RadialBarChart
              innerRadius="24%"
              outerRadius="92%"
              data={chartsData.radialQuota}
              startAngle={180}
              endAngle={0}
              cx="50%"
              cy="72%"
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip content={percentTooltip} />
              <RadialBar dataKey="value" name="Kota" cornerRadius={4} background={{ fill: chartColors.track }}>
                {chartsData.radialQuota.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
                <LabelList
                  position="insideStart"
                  dataKey="name"
                  fill="var(--ink)"
                  style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                />
              </RadialBar>
            </RadialBarChart>
          </ChartPlot>
        </div>
      </Grid>

      {heatHover.visible ? (
        <div
          className="kit-chart-tooltip kit-chart-tooltip--spark"
          style={{ left: heatHover.x, top: heatHover.y, position: "fixed", pointerEvents: "none", zIndex: 70 }}
        >
          <div className="kit-chart-tooltip__label">{heatHover.day}</div>
          <div className="kit-chart-tooltip__rows">
            <div className="kit-chart-tooltip__row">
              <span className="kit-chart-tooltip__dot" style={{ background: chartColors.c1 }} />
              <span className="kit-chart-tooltip__name">Yoğunluk</span>
              <span className="kit-chart-tooltip__value">{Math.round(heatHover.intensity * 100)}%</span>
            </div>
          </div>
        </div>
      ) : null}

      {bulletHover.visible ? (
        <div
          className="kit-chart-tooltip kit-chart-tooltip--spark"
          style={{ left: bulletHover.x, top: bulletHover.y, position: "fixed", pointerEvents: "none", zIndex: 70 }}
        >
          <div className="kit-chart-tooltip__label">{bulletHover.label}</div>
          <div className="kit-chart-tooltip__rows">
            <div className="kit-chart-tooltip__row">
              <span className="kit-chart-tooltip__dot" style={{ background: chartColors.c1 }} />
              <span className="kit-chart-tooltip__name">Mevcut</span>
              <span className="kit-chart-tooltip__value">{bulletHover.val}</span>
            </div>
            <div className="kit-chart-tooltip__row">
              <span className="kit-chart-tooltip__dot" style={{ background: chartColors.c4 }} />
              <span className="kit-chart-tooltip__name">Kota</span>
              <span className="kit-chart-tooltip__value">{bulletHover.range}</span>
            </div>
            <div className="kit-chart-tooltip__row">
              <span className="kit-chart-tooltip__dot" style={{ background: chartColors.c3 }} />
              <span className="kit-chart-tooltip__name">Hedef</span>
              <span className="kit-chart-tooltip__value">{bulletHover.mark}</span>
            </div>
          </div>
        </div>
      ) : null}
    </SectionFrame>
  );
}
