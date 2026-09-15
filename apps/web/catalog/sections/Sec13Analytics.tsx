"use client";

import { useMemo, useState } from "react";
import chartsData from "@/data/charts.json";
import peopleData from "@/data/people.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-13");

export function Sec13Analytics() {
  const [chartHover, setChartHover] = useState("Cum · 3.480 oturum");
  const nf = (n: number) => n.toLocaleString("tr-TR");

  const chartBars = useMemo(
    () =>
      chartsData.chart.map((c) => ({
        height: `${Math.round(c.v / 38)}%`,
        fill: chartHover.startsWith(c.d) ? "var(--accent)" : "var(--accent-surface-hover)",
        onEnter: () => setChartHover(`${c.d} · ${nf(c.v)} oturum`),
      })),
    [chartHover],
  );

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>36.148</span>
              <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>oturum · son 14 gün</span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--accent-ink)",
                background: "var(--accent-surface)",
                padding: "4px 8px",
                borderRadius: "var(--radius-xs)",
              }}
            >
              ↑ %18
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
            {chartBars.map((b, i) => (
              <div
                key={i}
                onMouseEnter={b.onEnter}
                style={{
                  flex: 1,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    background: b.fill,
                    height: b.height,
                    borderRadius: "var(--radius-3xs) var(--radius-3xs) 0 0",
                    transition: "background .18s ease, height .3s cubic-bezier(.3,.8,.3,1)",
                  }}
                />
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-subtle)",
            }}
          >
            <span>31 Ağu</span>
            <span style={{ color: "var(--ink)" }}>{chartHover}</span>
            <span>13 Eyl</span>
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--fg-subtle)",
            }}
          >
            Kaynak kırılımı
          </div>
          {chartsData.breakdownShare.map((d) => (
            <div key={d.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 13,
                }}
              >
                <span>{d.name}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>{d.value}</span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: "var(--radius-3xs)",
                  background: "var(--surface)",
                  overflow: "hidden",
                }}
              >
                <div style={{ height: "100%", width: d.share, background: d.fill }} />
              </div>
            </div>
          ))}
          <div
            style={{
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex" }}>
              {peopleData.avatars.map((av) => (
                <span
                  key={av.initials}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: av.bg,
                    color: av.color,
                    border: "2px solid var(--bg)",
                    marginLeft: -8,
                    fontSize: 11,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {av.initials}
                </span>
              ))}
            </div>
            <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>5 kişi bu panoya erişiyor</span>
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--fg-subtle)",
            }}
          >
            Etkinlik akışı
          </div>
          {peopleData.activity.map((a) => (
            <div key={`${a.who}-${a.when}`} style={{ display: "flex", gap: 12 }}>
              <span
                style={{
                  flex: "none",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: a.dot,
                  marginTop: 6,
                }}
              />
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 13, lineHeight: 1.5 }}>
                  <strong style={{ fontWeight: 500 }}>{a.who}</strong> {a.what}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-disabled)" }}>
                  {a.when}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}
