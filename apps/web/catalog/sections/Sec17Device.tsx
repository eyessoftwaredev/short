import analyticsData from "@/data/analytics.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-17");

export function Sec17Device() {
  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-subtle)",
              }}
            >
              Cihaz
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-disabled)" }}>
              36.148
            </span>
          </div>
          {analyticsData.deviceStats.map((d) => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  flex: "none",
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className={d.icon} style={{ fontSize: 14 }} />
              </span>
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    fontSize: 13,
                  }}
                >
                  <span>{d.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>{d.pct}</span>
                </span>
                <span
                  style={{
                    height: 6,
                    borderRadius: "var(--radius-3xs)",
                    background: "var(--surface)",
                    overflow: "hidden",
                    display: "block",
                  }}
                >
                  <span
                    style={{
                      height: "100%",
                      width: d.pct,
                      background: "var(--accent)",
                      display: "block",
                      transition: "width .4s cubic-bezier(.3,.8,.3,1)",
                    }}
                  />
                </span>
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
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
            Platform
          </div>
          {analyticsData.osStats.map((o) => (
            <div
              key={o.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <i className={o.icon} style={{ flex: "none", width: 18, textAlign: "center", fontSize: 15, color: o.color }} />
              <span style={{ flex: 1, fontSize: 13 }}>{o.name}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink)" }}>{o.pct}</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: o.trendColor,
                  width: 44,
                  textAlign: "right",
                }}
              >
                {o.trend}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
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
            Tarayıcı
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {analyticsData.browserStats.map((b) => (
              <span
                key={b.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "8px 12px",
                  fontSize: 13,
                }}
              >
                <i className={b.icon} style={{ fontSize: 14, color: "var(--fg-muted)" }} />
                {b.name}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent-ink)" }}>
                  {b.pct}
                </span>
              </span>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "var(--fg-muted)",
            }}
          >
            <i className="fa-solid fa-shield-halved" style={{ color: "var(--accent-ink)" }} />
            Bot trafiği otomatik ayıklanır
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-subtle)",
              }}
            >
              Ülke
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-muted)" }}>
              <i className="fa-solid fa-earth-europe" style={{ color: "var(--accent-ink)" }} />
              38 ülke
            </span>
          </div>
          {analyticsData.countryStats.map((c) => (
            <div key={c.code} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  flex: "none",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-2xs)",
                  padding: "3px 6px",
                  width: 36,
                  textAlign: "center",
                }}
              >
                {c.code}
              </span>
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    fontSize: 13,
                  }}
                >
                  <span>{c.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>{c.clicks}</span>
                </span>
                <span
                  style={{
                    height: 6,
                    borderRadius: "var(--radius-3xs)",
                    background: "var(--surface)",
                    overflow: "hidden",
                    display: "block",
                  }}
                >
                  <span
                    style={{
                      height: "100%",
                      width: c.pct,
                      background: c.fill,
                      display: "block",
                      transition: "width .4s cubic-bezier(.3,.8,.3,1)",
                    }}
                  />
                </span>
              </span>
            </div>
          ))}
          <button type="button" className="kit-btn kit-btn--sm" style={{ alignSelf: "flex-start" }}>
            <i className="fa-solid fa-arrow-down" style={{ fontSize: 11 }} />
            Tüm ülkeleri indir
          </button>
        </div>
      </div>
    </SectionFrame>
  );
}
