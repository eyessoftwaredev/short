"use client";

import { useState } from "react";
import copyData from "@/data/copy.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-25");

export function Sec25Mobile() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("home");

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
            position: "relative",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            maxWidth: 360,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="kit-btn kit-btn--icon kit-btn--sm"
              aria-label="Menü"
            >
              <i className="fa-solid fa-bars" />
            </button>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Acme</span>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--inverse)",
                color: "var(--on-inverse)",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              MK
            </span>
          </div>
          <div
            style={{
              padding: "20px 16px",
              minHeight: 120,
              fontSize: 14,
              color: "var(--fg-muted)",
            }}
          >
            Ana içerik alanı — mobil görünümde sheet nav ve alt tab bar birlikte kullanılır.
          </div>
          <div
            style={{
              display: "flex",
              borderTop: "1px solid var(--border)",
              background: "var(--surface-subtle)",
              padding: "6px 4px",
            }}
          >
            {copyData.mobileTabs.map((mt) => (
              <button
                key={mt.id}
                type="button"
                onClick={() => setMobileTab(mt.id)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  border: "none",
                  background: "transparent",
                  color: mt.id === mobileTab ? "var(--accent-ink)" : "var(--fg-disabled)",
                  fontSize: 10,
                  fontWeight: 500,
                  padding: "8px 4px",
                  cursor: "pointer",
                }}
              >
                <i className={mt.icon} style={{ fontSize: 14 }} />
                {mt.label}
              </button>
            ))}
          </div>

          {mobileNavOpen ? (
            <>
              <div
                role="presentation"
                onClick={() => setMobileNavOpen(false)}
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 40,
                  background: "var(--overlay)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  zIndex: 50,
                  width: 260,
                  background: "var(--bg)",
                  borderRight: "1px solid var(--border)",
                  padding: "16px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  boxShadow: "var(--shadow-pop)",
                }}
              >
                {copyData.mobileNavItems.map((mn) => (
                  <button
                    key={mn.id}
                    type="button"
                    onClick={() => {
                      setMobileTab(mn.id);
                      setMobileNavOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: mn.id === mobileTab ? "var(--accent-surface)" : "transparent",
                      color: mn.id === mobileTab ? "var(--accent-hover)" : "var(--fg-muted)",
                      fontSize: 14,
                      fontWeight: 500,
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                    }}
                  >
                    <i className={mn.icon} style={{ width: 14, textAlign: "center", fontSize: 12 }} />
                    {mn.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 24,
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
            Notlar
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--fg-muted)",
            }}
          >
            <li>Sheet nav sol kenardan açılır; örtüye tıklamak kapatır.</li>
            <li>Alt tab bar en fazla 4–5 birincil rota için.</li>
            <li>
              Aktif tab{" "}
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>--accent-ink</code> renginde.
            </li>
          </ul>
        </div>
      </div>
    </SectionFrame>
  );
}
