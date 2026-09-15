import { Grid } from "@/components/kit";
import chartsData from "@/data/charts.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-04");

export function Sec04Card() {
  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={4}>
        {chartsData.statCards.map((s) => (
          <div
            key={s.label}
            className="kit-card"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 10,
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
              {s.label}
            </div>
            <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 13, color: s.deltaColor }}>{s.delta}</div>
          </div>
        ))}
      </Grid>

      <Grid columns={2}>
        <div
          className="kit-card"
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
              width: 36,
              height: 36,
              borderRadius: "var(--radius)",
              background: "var(--accent-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              color: "var(--accent-ink)",
            }}
          >
            <i className="fa-solid fa-chart-line" />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Kullanım analitiği</h3>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
            Cihaz, ülke ve kaynak kırılımında gerçek zamanlı kullanım verisi.
          </p>
          <a href="#" style={{ fontSize: 14, fontWeight: 500 }}>
            Detaylar →
          </a>
        </div>

        <div
          className="kit-card"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--accent-ink)" }}>
                Atlas CRM
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--fg-subtle)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Ürün · Q3 lansmanı
              </div>
            </div>
            <span
              style={{
                flex: "none",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--accent-ink)",
                background: "var(--accent-surface)",
                padding: "4px 8px",
                borderRadius: "var(--radius-xs)",
              }}
            >
              Aktif
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderTop: "1px solid var(--border)",
              paddingTop: 14,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>12.480 oturum</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="kit-btn kit-btn--sm">
                Kopyala
              </button>
              <button type="button" className="kit-btn kit-btn--sm">
                Paylaş
              </button>
            </div>
          </div>
        </div>

        <div
          className="kit-card"
          style={{
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Pro</h3>
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--on-accent)",
                background: "var(--accent)",
                padding: "4px 8px",
                borderRadius: "var(--radius-xs)",
              }}
            >
              Önerilen
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em" }}>₺390</span>
            <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>/ay</span>
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 14,
              color: "var(--fg-muted)",
            }}
          >
            <li>50.000 kayıt / ay</li>
            <li>Özel çalışma alanı</li>
            <li>Özel roller</li>
          </ul>
          <button type="button" className="kit-btn kit-btn--primary">
            Pro&apos;ya geç
          </button>
        </div>
      </Grid>
    </SectionFrame>
  );
}
