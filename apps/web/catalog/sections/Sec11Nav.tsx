"use client";

import { useState } from "react";
import copyData from "@/data/copy.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-11");

export function Sec11Nav() {
  const [nav, setNav] = useState("Projeler");
  const [segment, setSegment] = useState(copyData.segments[0] ?? "Tablo");
  const [step, setStep] = useState(1);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            fontSize: 13,
          }}
        >
          <a href="#" style={{ color: "var(--fg-muted)" }}>
            Çalışma alanı
          </a>
          <span style={{ color: "var(--fg-faint)" }}>/</span>
          <a href="#" style={{ color: "var(--fg-muted)" }}>
            Projeler
          </a>
          <span style={{ color: "var(--fg-faint)" }}>/</span>
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>Atlas CRM</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {copyData.sideNav.map((n) => {
              const on = n.label === nav;
              return (
                <button
                  key={n.label}
                  type="button"
                  onClick={() => setNav(n.label)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: on ? "var(--accent-surface)" : "transparent",
                    color: on ? "var(--accent-hover)" : "var(--fg-muted)",
                    fontSize: 14,
                    fontWeight: on ? 500 : 400,
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      width: 14,
                      textAlign: "center",
                      color: on ? "var(--accent-hover)" : "var(--fg-disabled)",
                    }}
                  >
                    <i className={n.icon} />
                  </span>
                  <span style={{ flex: 1 }}>{n.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-disabled)" }}>
                    {n.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
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
                Segment kontrolü
              </div>
              <div
                style={{
                  display: "inline-flex",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 3,
                  alignSelf: "flex-start",
                }}
              >
                {copyData.segments.map((label) => {
                  const on = label === segment;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setSegment(label)}
                      style={{
                        border: "none",
                        background: on ? "var(--bg)" : "transparent",
                        color: on ? "var(--ink)" : "var(--fg-muted)",
                        fontSize: 13,
                        fontWeight: 500,
                        padding: "7px 14px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Görünüm: {segment}</div>
            </div>

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
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--fg-subtle)",
                }}
              >
                Adımlar
              </div>
              <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
                {copyData.steps.map((label, i) => {
                  const done = i < step;
                  const current = i === step;
                  return (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 16 }}>
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          border: `1px solid ${done || current ? "var(--accent)" : "var(--border)"}`,
                          background: done ? "var(--accent)" : current ? "var(--bg)" : "var(--surface)",
                          color: done ? "var(--on-accent)" : current ? "var(--accent-hover)" : "var(--fg-disabled)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {done ? "✓" : String(i + 1)}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: done || current ? "var(--ink)" : "var(--fg-disabled)",
                          fontWeight: current ? 500 : 400,
                        }}
                      >
                        {label}
                      </span>
                      {i < copyData.steps.length - 1 ? (
                        <span style={{ width: 24, height: 1, background: "var(--border)", display: "block" }} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="kit-btn kit-btn--sm"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  Geri
                </button>
                <button
                  type="button"
                  className="kit-btn kit-btn--primary kit-btn--sm"
                  onClick={() => setStep((s) => Math.min(2, s + 1))}
                >
                  İleri
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
