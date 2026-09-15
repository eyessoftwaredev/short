import copyData from "@/data/copy.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-14");

const shimmerBg =
  "linear-gradient(90deg,var(--skeleton-from) 0%,var(--skeleton-to) 50%,var(--skeleton-from) 100%)";

export function Sec14Loading() {
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
            Skeleton
          </div>
          {copyData.skeletons.map((sk, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-sm)",
                  background: shimmerBg,
                  backgroundSize: "320px 100%",
                  animation: "om-shimmer 1.4s linear infinite",
                }}
              />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    height: 10,
                    width: sk.w1,
                    borderRadius: "var(--radius-3xs)",
                    background: shimmerBg,
                    backgroundSize: "320px 100%",
                    animation: "om-shimmer 1.4s linear infinite",
                  }}
                />
                <div
                  style={{
                    height: 8,
                    width: sk.w2,
                    borderRadius: "var(--radius-3xs)",
                    background: shimmerBg,
                    backgroundSize: "320px 100%",
                    animation: "om-shimmer 1.4s linear infinite",
                  }}
                />
              </div>
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
            Gösterge & buton
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "2px solid var(--border)",
                borderTopColor: "var(--accent)",
                display: "block",
                animation: "om-spin .8s linear infinite",
              }}
            />
            <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>Veriler yükleniyor…</span>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                border: "1px solid var(--accent)",
                background: "var(--accent)",
                color: "var(--on-accent)",
                fontSize: 14,
                fontWeight: 500,
                padding: "10px 18px",
                borderRadius: "var(--radius)",
                cursor: "wait",
                opacity: 0.85,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "2px solid var(--on-accent-ring)",
                  borderTopColor: "transparent",
                  display: "block",
                  animation: "om-spin .8s linear infinite",
                }}
              />
              Kaydediliyor…
            </button>
            <button type="button" className="kit-btn" disabled>
              Devre dışı
            </button>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              borderTop: "1px solid var(--border)",
              paddingTop: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--fg-muted)" }}>İçe aktarma</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>180 / 412</span>
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
                  width: "44%",
                  background: "var(--accent)",
                  borderRadius: "var(--radius-2xs)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
