"use client";

import { useCallback, useState } from "react";
import copyData from "@/data/copy.json";
import { useCatalog } from "../CatalogProvider";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-10");

export function Sec10Badge() {
  const { setFormModalOpen, pushToast } = useCatalog();
  const [quotaUsed, setQuotaUsed] = useState(18400);
  const [tipOpen, setTipOpen] = useState(false);

  const nf = (n: number) => n.toLocaleString("tr-TR");
  const quotaWidth = `${Math.min(100, Math.round(quotaUsed / 500))}%`;

  const onUseQuota = useCallback(() => {
    const next = Math.min(50000, quotaUsed + 1000);
    setQuotaUsed(next);
    if (next >= 46000) pushToast("warn");
  }, [quotaUsed, pushToast]);

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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-subtle)",
              }}
            >
              Badge
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {copyData.badges.map((b) => (
                <span
                  key={b.label}
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    padding: "5px 9px",
                    borderRadius: "var(--radius-xs)",
                    background: b.bg,
                    color: b.color,
                  }}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              borderTop: "1px solid var(--border)",
              paddingTop: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>Aylık kayıt kotası</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {nf(quotaUsed)} / 50.000
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: "var(--radius-2xs)",
                background: "var(--surface)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: quotaWidth,
                  background: "var(--accent)",
                  borderRadius: "var(--radius-2xs)",
                  transition: "width .4s cubic-bezier(.3,.8,.3,1)",
                }}
              />
            </div>
            <button type="button" className="kit-btn kit-btn--sm" onClick={onUseQuota} style={{ alignSelf: "flex-start" }}>
              +1.000 kayıt kullan
            </button>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              borderTop: "1px solid var(--border)",
              paddingTop: 18,
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
              Tooltip — üzerine gel
            </div>
            <div style={{ position: "relative", display: "inline-flex", alignSelf: "flex-start" }}>
              <button
                type="button"
                onMouseEnter={() => setTipOpen(true)}
                onMouseLeave={() => setTipOpen(false)}
                className="kit-btn kit-btn--sm"
                style={{ cursor: "default" }}
              >
                Dönüşüm oranı nedir?
              </button>
              {tipOpen ? (
                <span
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    left: 0,
                    zIndex: 20,
                    background: "var(--inverse)",
                    color: "var(--on-inverse)",
                    fontSize: 12,
                    lineHeight: 1.5,
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    width: 220,
                  }}
                >
                  Benzersiz ziyaretçinin toplam gösterime oranı. Son 30 gün üzerinden hesaplanır.
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "48px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--fg-subtle)",
            }}
          >
            <i className="fa-solid fa-folder" />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Henüz proje yok</h3>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--fg-muted)",
              maxWidth: "34ch",
            }}
          >
            İlk projeni oluştur; metrikler birkaç saniye içinde burada görünmeye başlar.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
            <button type="button" className="kit-btn kit-btn--primary" onClick={() => setFormModalOpen(true)}>
              Proje oluştur
            </button>
            <button type="button" className="kit-btn">
              CSV içe aktar
            </button>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
