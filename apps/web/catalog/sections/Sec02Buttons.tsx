"use client";

import { useCallback, useState } from "react";
import copyData from "@/data/copy.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-02");

export function Sec02Buttons() {
  const [copyDemo, setCopyDemo] = useState(false);
  const [loading, setLoading] = useState(false);

  const onCopyDemo = useCallback(() => {
    setCopyDemo(true);
    window.setTimeout(() => setCopyDemo(false), 1400);
  }, []);

  const onLoadDemo = useCallback(() => {
    if (loading) return;
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1600);
  }, [loading]);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--fg-subtle)",
            }}
          >
            Varyantlar
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <button type="button" className="kit-btn kit-btn--primary">
              Kaydet
            </button>
            <button type="button" className="kit-btn">
              İçe aktar
            </button>
            <button type="button" className="kit-btn kit-btn--soft">
              Dışa aktar
            </button>
            <button type="button" className="kit-btn kit-btn--ghost">
              Vazgeç
            </button>
            <button type="button" className="kit-btn kit-btn--danger">
              Sil
            </button>
            <button type="button" className="kit-btn" disabled>
              Devre dışı
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderTop: "1px solid var(--border)",
            paddingTop: 24,
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
            Boyutlar
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <button type="button" className="kit-btn kit-btn--primary kit-btn--sm">
              Küçük · 32px
            </button>
            <button type="button" className="kit-btn kit-btn--primary">
              Orta · 40px
            </button>
            <button type="button" className="kit-btn kit-btn--primary kit-btn--lg">
              Büyük · 52px
            </button>
            <button type="button" className="kit-btn kit-btn--icon" aria-label="More">
              <i className="fa-solid fa-ellipsis" />
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderTop: "1px solid var(--border)",
            paddingTop: 24,
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
            İkonlu butonlar
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <button type="button" className="kit-btn kit-btn--primary">
              <i className="fa-solid fa-plus" style={{ fontSize: 12 }} />
              Yeni proje
            </button>
            <button type="button" className="kit-btn">
              <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 12, color: "var(--fg-muted)" }} />
              CSV içe aktar
            </button>
            <button type="button" className="kit-btn kit-btn--soft">
              <i className="fa-solid fa-file-export" style={{ fontSize: 12 }} />
              Dışa aktar
            </button>
            <button type="button" className="kit-btn">
              Rapor indir
              <i className="fa-solid fa-arrow-down" style={{ fontSize: 11, color: "var(--fg-muted)" }} />
            </button>
            <button type="button" className="kit-btn kit-btn--danger">
              <i className="fa-solid fa-trash" style={{ fontSize: 12 }} />
              Sil
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex" }}>
              <button type="button" className="kit-btn kit-btn--primary" style={{ borderRadius: "var(--radius) 0 0 var(--radius)" }}>
                <i className="fa-solid fa-plus" style={{ fontSize: 12 }} />
                Oluştur
              </button>
              <button
                type="button"
                className="kit-btn kit-btn--primary"
                style={{ borderRadius: "0 var(--radius) var(--radius) 0", width: 38, padding: 0 }}
              >
                <i className="fa-solid fa-chevron-down" />
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {copyData.iconButtons.map((ib) => (
                <button
                  key={ib.icon}
                  type="button"
                  style={{
                    border: "1px solid var(--border-strong)",
                    background: "var(--bg)",
                    color: ib.color,
                    width: 38,
                    height: 38,
                    borderRadius: "var(--radius)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                  }}
                >
                  <i className={ib.icon} />
                </button>
              ))}
            </div>
            <button type="button" className="kit-btn kit-btn--ghost" style={{ color: "var(--accent-ink)" }}>
              Tümünü gör
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 11 }} />
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderTop: "1px solid var(--border)",
            paddingTop: 24,
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
            Durumlar — tıklayıp dene
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={onCopyDemo}
              className="kit-btn"
              style={{ minWidth: 160 }}
            >
              {copyDemo ? "Kopyalandı ✓" : "Kopyala"}
            </button>
            <button
              type="button"
              onClick={onLoadDemo}
              className="kit-btn kit-btn--primary"
              style={{ minWidth: 160 }}
              disabled={loading}
            >
              {loading ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
