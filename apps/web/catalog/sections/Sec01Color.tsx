import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-01");

const swatches = [
  { name: "Mürekkep", token: "var(--ink)", bg: "var(--ink)" },
  { name: "Ters yüzey", token: "var(--inverse)", bg: "var(--inverse)" },
  { name: "Aksan", token: "var(--accent)", bg: "var(--accent)" },
  { name: "Aksan yüzey", token: "var(--accent-surface)", bg: "var(--accent-surface)" },
  { name: "Yüzey", token: "var(--surface)", bg: "var(--surface)" },
  { name: "İkincil metin", token: "var(--fg-muted)", bg: "var(--fg-muted)" },
  { name: "Kenar", token: "var(--border)", bg: "var(--bg)", borderBottom: "1px solid var(--border)" },
];

const radiusSteps = [
  { token: "--radius · 8px", desc: "Kart, tablo, modal, buton", cls: "var(--radius)" },
  { token: "--radius-sm · 6px", desc: "Küçük buton, girdi", cls: "var(--radius-sm)" },
  { token: "--radius-xs · 5px", desc: "Badge, chip", cls: "var(--radius-xs)" },
  { token: "--radius-2xs · 4px", desc: "Onay kutusu, mini kare", cls: "var(--radius-2xs)" },
  { token: "--radius-pill", desc: "Yalnızca switch ve avatar", cls: "var(--radius-pill)" },
];

const shadowSteps = [
  { token: "--shadow-lift", desc: "Kart hover", shadow: "var(--shadow-lift)" },
  { token: "--shadow-pop", desc: "Menü, popover", shadow: "var(--shadow-pop)" },
  { token: "--shadow-toast", desc: "Toast", shadow: "var(--shadow-toast)" },
  { token: "--shadow-modal", desc: "Modal", shadow: "var(--shadow-modal)" },
];

export function Sec01Color() {
  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {swatches.map((s) => (
          <div
            key={s.token}
            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}
          >
            <div style={{ height: 72, background: s.bg, borderBottom: s.borderBottom }} />
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)" }}>
                {s.token}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
          borderTop: "1px solid var(--border)",
          paddingTop: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 40, lineHeight: 1.05, letterSpacing: "-0.025em", fontWeight: 600 }}>
            Display 40/600
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)" }}>
            Hero başlıkları
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 22, lineHeight: 1.2, fontWeight: 600 }}>Başlık 22/600</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)" }}>
            Kart & bölüm başlığı
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 15, lineHeight: 1.6, color: "var(--fg-muted)" }}>
            Gövde 15/1.6 — proje, ekip ve analitik metinleri.
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)" }}>Paragraf</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>GET /v1/projects</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-subtle)" }}>
            Mono — URL ve kod için
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
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
          Köşe ölçeği — hangi değer nereye
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
          {radiusSteps.map((r) => (
            <div key={r.token} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
              <div
                style={{
                  width: "100%",
                  height: 52,
                  border: "1px solid var(--border-strong)",
                  borderRadius: r.cls,
                  background: "var(--surface)",
                }}
              />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)" }}>{r.token}</div>
              <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--fg-muted)" }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
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
          Gölge ölçeği — dört basamak, ara değer yok
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 20,
            paddingBottom: 8,
          }}
        >
          {shadowSteps.map((s) => (
            <div key={s.token} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  height: 56,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  background: "var(--bg)",
                  boxShadow: s.shadow,
                }}
              />
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)" }}>{s.token}</div>
              <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--fg-muted)" }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}
