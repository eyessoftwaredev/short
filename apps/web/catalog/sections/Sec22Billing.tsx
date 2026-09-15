"use client";

import { useState } from "react";
import billingData from "@/data/billing.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-22");

export function Sec22Billing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
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
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            background: "var(--accent-tint)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent-ink)",
            }}
          >
            Mevcut plan
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 600 }}>Pro</span>
            <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>₺890 / ay</span>
          </div>
          <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>Sonraki fatura: 13 Eki 2026</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <button type="button" className="kit-btn kit-btn--primary kit-btn--sm">
              Planı yönet
            </button>
            <button type="button" className="kit-btn kit-btn--sm">
              Faturayı indir
            </button>
          </div>
        </div>

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
            Ödeme yöntemi
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "14px 16px",
            }}
          >
            <i className="fa-solid fa-credit-card" style={{ color: "var(--fg-muted)" }} />
            <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 14 }}>•••• 4242</span>
            <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>12/28</span>
            <button type="button" className="kit-btn kit-btn--xs">
              Değiştir
            </button>
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            gridColumn: "1 / -1",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
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
              Faturalar
            </div>
            <div
              style={{
                display: "inline-flex",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: 3,
              }}
            >
              {billingData.billingCycles.map((id) => {
                const on = id === billingCycle;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBillingCycle(id as "monthly" | "yearly")}
                    style={{
                      border: "none",
                      background: on ? "var(--bg)" : "transparent",
                      color: on ? "var(--ink)" : "var(--fg-muted)",
                      fontSize: 13,
                      fontWeight: 500,
                      padding: "6px 12px",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                    }}
                  >
                    {id === "monthly" ? "Aylık" : "Yıllık"}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 520 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 100px 80px",
                  background: "var(--surface)",
                  borderBottom: "1px solid var(--border)",
                  padding: "11px 16px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--fg-muted)",
                }}
              >
                <span>Tarih</span>
                <span>Tutar</span>
                <span>Durum</span>
                <span />
              </div>
              {billingData.invoices.map((inv) => (
                <div
                  key={inv.date}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 100px 80px",
                    alignItems: "center",
                    padding: "13px 16px",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{inv.date}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{inv.amount}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      padding: "4px 8px",
                      borderRadius: "var(--radius-xs)",
                      background: inv.statusBg,
                      color: inv.statusColor,
                      justifySelf: "start",
                    }}
                  >
                    {inv.status}
                  </span>
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--accent-ink)",
                      fontSize: 12,
                      cursor: "pointer",
                      justifySelf: "end",
                    }}
                  >
                    PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
