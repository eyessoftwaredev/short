"use client";

import { Grid } from "@/components/kit";
import copyData from "@/data/copy.json";
import { useState } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-24");

export function Sec24System() {
  const [bannerVisible, setBannerVisible] = useState(true);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      {bannerVisible ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            border: "1px solid var(--warn-border)",
            background: "var(--warn-surface)",
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              color: "var(--warn-ink)",
            }}
          >
            <i className="fa-solid fa-triangle-exclamation" />
            Planın 13 Eki&apos;de yenilenecek. Ödeme yöntemini kontrol et.
          </span>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" className="kit-btn kit-btn--sm">
              Ödeme yöntemi
            </button>
            <button
              type="button"
              onClick={() => setBannerVisible(false)}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--fg-subtle)",
                fontSize: 14,
                cursor: "pointer",
                padding: 4,
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </span>
        </div>
      ) : null}

      <Grid columns={2}>
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
            Bildirimler
          </div>
          {copyData.notifications.map((n) => (
            <div
              key={n.title}
              style={{
                display: "flex",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <span
                style={{
                  flex: "none",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: n.dot,
                  marginTop: 6,
                }}
              />
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{n.title}</span>
                <span style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5 }}>{n.body}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-disabled)" }}>
                  {n.when}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "32px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 48,
                fontWeight: 600,
                color: "var(--fg-faint)",
                lineHeight: 1,
              }}
            >
              404
            </span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Sayfa bulunamadı</span>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55 }}>
              Aradığın adres taşınmış veya silinmiş olabilir.
            </span>
            <button type="button" className="kit-btn kit-btn--primary kit-btn--sm" style={{ marginTop: 4 }}>
              Ana sayfaya dön
            </button>
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "32px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              textAlign: "center",
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius)",
                background: "var(--danger-surface)",
                color: "var(--danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fa-solid fa-server" />
            </span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Bir şeyler ters gitti</span>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55 }}>
              Sunucu geçici olarak yanıt vermiyor. Birkaç dakika sonra tekrar dene.
            </span>
            <button type="button" className="kit-btn kit-btn--sm" style={{ marginTop: 4 }}>
              Yeniden dene
            </button>
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "32px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              textAlign: "center",
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius)",
                background: "var(--warn-surface)",
                color: "var(--warn-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fa-solid fa-screwdriver-wrench" />
            </span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Bakım modu</span>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55 }}>
              Planlı bakım sürüyor. Tahmini bitiş: 14:30 UTC.
            </span>
          </div>
        </div>
      </Grid>
    </SectionFrame>
  );
}
