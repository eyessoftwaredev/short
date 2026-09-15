import chartsData from "@/data/charts.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-19");

export function Sec19Quota() {
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
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
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
            Kilitli alan
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-muted)" }}>Parola koruması</label>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  flexShrink: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background: "var(--warn-surface)",
                  border: "1px solid var(--warn-border)",
                  color: "var(--warn-ink)",
                  padding: "3px 7px",
                  borderRadius: "var(--radius-xs)",
                }}
              >
                <i className="fa-solid fa-lock" style={{ fontSize: 9 }} />
                Pro
              </span>
            </div>
            <input
              disabled
              placeholder="••••••••"
              style={{
                border: "1px dashed var(--border-strong)",
                borderRadius: "var(--radius)",
                padding: "10px 12px",
                fontSize: 14,
                background: "var(--surface)",
                color: "var(--fg-disabled)",
                cursor: "not-allowed",
              }}
            />
            <span style={{ fontSize: 12, lineHeight: 1.55, color: "var(--fg-muted)" }}>
              Kaydı açmadan önce parola sorar. <a href="#">Pro&apos;ya geç</a> ve bu alanı kullan.
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              borderTop: "1px solid var(--border)",
              paddingTop: 18,
            }}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-muted)" }}>A/B testi</span>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: "var(--fg-subtle)" }}>
                Trafiği iki hedef arasında ağırlıklı böl.
              </span>
            </span>
            <button
              type="button"
              disabled
              style={{
                flex: "none",
                border: "none",
                width: 44,
                height: 26,
                borderRadius: "var(--radius-pill)",
                padding: 3,
                display: "flex",
                justifyContent: "flex-start",
                background: "var(--border)",
                cursor: "not-allowed",
                opacity: 0.7,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "var(--radius-pill)",
                  background: "var(--bg)",
                  display: "block",
                }}
              />
            </button>
          </div>
        </div>

        <div
          style={{
            overflow: "hidden",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--fg-subtle)",
              padding: "24px 24px 0",
            }}
          >
            Kilitli kart
          </div>
          <div style={{ position: "relative", flex: 1, display: "flex" }}>
            <div
              style={{
                flex: 1,
                padding: "20px 24px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                filter: "blur(3px)",
                opacity: 0.4,
                userSelect: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>%4,8</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent-ink)" }}>
                  ↑ 0,6 puan
                </span>
              </div>
              <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>Dönüşüm oranı</span>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 56, marginTop: "auto" }}>
                {chartsData.lockedBars.map((h, i) => (
                  <span
                    key={i}
                    style={{
                      flex: 1,
                      height: h,
                      background: "var(--accent-surface)",
                      borderRadius: "var(--radius-3xs) var(--radius-3xs) 0 0",
                      display: "block",
                    }}
                  />
                ))}
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                textAlign: "center",
                padding: 24,
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "var(--radius)",
                  background: "var(--warn-surface)",
                  border: "1px solid var(--warn-border)",
                  color: "var(--warn-ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="fa-solid fa-lock" style={{ fontSize: 14 }} />
              </span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Dönüşüm takibi Pro&apos;da</span>
              <span
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "var(--fg-muted)",
                  maxWidth: "30ch",
                }}
              >
                Hangi kampanyanın satışa dönüştüğünü gör. Mevcut verin korunur, açtığın anda dolar.
              </span>
              <button type="button" className="kit-btn kit-btn--primary kit-btn--sm" style={{ marginTop: 2 }}>
                Planı yükselt
              </button>
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
            gap: 20,
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
            Kota
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--fg-muted)",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Kayıt kotası
              </span>
              <span style={{ flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: 13 }}>48 / 50</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: "var(--radius-2xs)",
                background: "var(--surface)",
                overflow: "hidden",
              }}
            >
              <div style={{ height: "100%", width: "96%", background: "var(--warn)", borderRadius: "var(--radius-2xs)" }} />
            </div>
            <span style={{ fontSize: 12, color: "var(--warn-ink)" }}>2 kayıt kaldı.</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              border: "1px solid var(--danger-border)",
              background: "var(--danger-surface)",
              borderRadius: "var(--radius)",
              padding: "14px 16px",
            }}
          >
            <span
              style={{
                flex: "none",
                width: 22,
                height: 22,
                borderRadius: "var(--radius-sm)",
                background: "var(--danger)",
                color: "var(--on-accent)",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fa-solid fa-circle-exclamation" />
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--danger)" }}>
                Bio sayfa sınırına ulaştın
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.55, color: "var(--fg-muted)" }}>
                Planın 1 bio sayfa içeriyor. Yeni bir tane açmak için mevcut olanı sil veya planı yükselt.
              </span>
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                <button type="button" className="kit-btn kit-btn--primary kit-btn--sm">
                  Planı yükselt
                </button>
                <button type="button" className="kit-btn kit-btn--sm">
                  Sayfalarımı gör
                </button>
              </span>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderTop: "1px solid var(--border)",
              paddingTop: 18,
              fontSize: 13,
              color: "var(--fg-muted)",
            }}
          >
            <i className="fa-solid fa-clock-rotate-left" style={{ color: "var(--fg-subtle)" }} />
            Analitik geçmişi planında 30 gün
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
