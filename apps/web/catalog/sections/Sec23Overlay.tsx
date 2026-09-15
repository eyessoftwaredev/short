"use client";

import { useState } from "react";
import copyData from "@/data/copy.json";
import { useCatalog } from "../CatalogProvider";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-23");

type AccordionId = "billing" | "security" | "api";

export function Sec23Overlay() {
  const { setConfirmModalOpen } = useCatalog();
  const [overlayMenuOpen, setOverlayMenuOpen] = useState(false);
  const [overlayPopoverOpen, setOverlayPopoverOpen] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState<Record<AccordionId, boolean>>({
    billing: true,
    security: false,
    api: false,
  });
  const [demoPage, setDemoPage] = useState(2);

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
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ position: "relative", alignSelf: "flex-start" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOverlayMenuOpen((o) => !o);
              }}
              className="kit-btn"
            >
              İşlemler{" "}
              <span style={{ fontSize: 10, color: "var(--fg-subtle)" }}>
                {overlayMenuOpen ? "▴" : "▾"}
              </span>
            </button>
            {overlayMenuOpen ? (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  zIndex: 20,
                  minWidth: 180,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  boxShadow: "var(--shadow-pop)",
                }}
              >
                {copyData.overlayMenuItems.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setOverlayMenuOpen(false);
                      if (i === 3) setConfirmModalOpen(true);
                    }}
                    style={{
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      color: "var(--ink)",
                      fontSize: 13,
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ position: "relative", alignSelf: "flex-start" }}>
            <button
              type="button"
              onMouseEnter={() => setOverlayPopoverOpen(true)}
              onMouseLeave={() => setOverlayPopoverOpen(false)}
              className="kit-btn kit-btn--sm"
              style={{ cursor: "default" }}
            >
              Yardım
            </button>
            {overlayPopoverOpen ? (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  zIndex: 20,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "12px 14px",
                  width: 220,
                  boxShadow: "var(--shadow-pop)",
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "var(--fg-muted)",
                }}
              >
                Bu panel workspace ayarlarını yönetir. Değişiklikler anında uygulanır.
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {copyData.accordionItems.map((ac) => {
            const open = accordionOpen[ac.id as AccordionId];
            return (
              <div
                key={ac.id}
                style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setAccordionOpen((prev) => ({
                      ...prev,
                      [ac.id]: !prev[ac.id as AccordionId],
                    }))
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    width: "100%",
                    border: "none",
                    background: "var(--surface-subtle)",
                    color: "var(--ink)",
                    fontSize: 14,
                    fontWeight: 500,
                    padding: "12px 14px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {ac.title}
                  <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{open ? "▴" : "▾"}</span>
                </button>
                {open ? (
                  <div
                    style={{
                      padding: "12px 14px 14px",
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "var(--fg-muted)",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    {ac.body}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--fg-subtle)",
              alignSelf: "flex-start",
            }}
          >
            Numaralı sayfalama
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              className="kit-btn kit-btn--sm"
              onClick={() => setDemoPage((p) => Math.max(1, p - 1))}
            >
              Önceki
            </button>
            {[1, 2, 3, 4, 5].map((n) => {
              const on = n === demoPage;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDemoPage(n)}
                  style={{
                    border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
                    background: on ? "var(--accent)" : "var(--bg)",
                    color: on ? "var(--on-accent)" : "var(--fg-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    minWidth: 36,
                    height: 36,
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  {n}
                </button>
              );
            })}
            <button
              type="button"
              className="kit-btn kit-btn--sm"
              onClick={() => setDemoPage((p) => Math.min(5, p + 1))}
            >
              Sonraki
            </button>
          </div>
          <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>Sayfa {demoPage} / 5</span>
        </div>
      </div>
    </SectionFrame>
  );
}
