"use client";

import { useMemo, useState } from "react";
import analyticsData from "@/data/analytics.json";
import copyData from "@/data/copy.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-18");
const breakdownKeys = Object.keys(analyticsData.breakdowns);

export function Sec18Tabs() {
  const [linkTab, setLinkTab] = useState(copyData.linkTabs[0]?.label ?? "Temel");
  const [breakdownTab, setBreakdownTab] = useState(breakdownKeys[0] ?? "Ülke");

  const activeLink = useMemo(
    () => copyData.linkTabs.find((t) => t.label === linkTab) ?? copyData.linkTabs[0],
    [linkTab],
  );

  const breakdownRows = analyticsData.breakdowns[breakdownTab as keyof typeof analyticsData.breakdowns] ?? [];

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--fg-subtle)",
              padding: "20px 24px 0",
            }}
          >
            Alt çizgili — kayıt düzenleyici
          </div>
          <div
            className="kit-tabs"
            style={{
              display: "flex",
              gap: 2,
              overflowX: "auto",
              overflowY: "hidden",
              padding: "14px 24px 0",
              borderBottom: "1px solid var(--border)",
              scrollbarWidth: "thin",
            }}
          >
            {copyData.linkTabs.map((tb) => {
              const on = tb.label === linkTab;
              return (
                <button
                  key={tb.label}
                  type="button"
                  onClick={() => setLinkTab(tb.label)}
                  style={{
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    border: "none",
                    borderBottom: `2px solid ${on ? "var(--accent)" : "transparent"}`,
                    background: "transparent",
                    color: on ? "var(--ink)" : "var(--fg-muted)",
                    fontSize: 14,
                    fontWeight: on ? 600 : 500,
                    padding: "10px 14px",
                    marginBottom: -1,
                    cursor: "pointer",
                  }}
                >
                  {tb.label}
                </button>
              );
            })}
          </div>
          <div
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "var(--surface-subtle)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600 }}>{activeLink?.title}</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)", maxWidth: "62ch" }}>
              {activeLink?.body}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 18,
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
          Dolgulu — analitik kırılımı
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            overflowY: "hidden",
            padding: 3,
            background: "var(--surface)",
            borderRadius: "var(--radius)",
            scrollbarWidth: "thin",
          }}
        >
          {breakdownKeys.map((label) => {
            const on = label === breakdownTab;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setBreakdownTab(label)}
                style={{
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  border: `1px solid ${on ? "var(--border)" : "transparent"}`,
                  background: on ? "var(--bg)" : "transparent",
                  color: on ? "var(--ink)" : "var(--fg-muted)",
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "7px 13px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {breakdownRows.map((br) => (
            <div key={br.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  flex: "none",
                  width: 78,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--fg-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {br.label}
              </span>
              <span
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: "var(--radius-3xs)",
                  background: "var(--surface)",
                  overflow: "hidden",
                  display: "block",
                }}
              >
                <span
                  style={{
                    height: "100%",
                    width: br.pct,
                    background: "var(--accent)",
                    display: "block",
                    transition: "width .4s cubic-bezier(.3,.8,.3,1)",
                  }}
                />
              </span>
              <span
                style={{
                  flex: "none",
                  width: 52,
                  textAlign: "right",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--ink)",
                }}
              >
                {br.pct}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}
