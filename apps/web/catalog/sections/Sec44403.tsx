import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-44");

export function Sec44403() {
  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-forbidden">
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-subtle)" }}>403</span>
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Bu sayfayı göremezsin</h3>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--fg-muted)",
            maxWidth: "40ch",
          }}
        >
          Billing v2 yalnızca Admin rolüne açık. Erişim için çalışma alanı yöneticisine yaz.
        </p>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          <button
            type="button"
            style={{
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "var(--on-accent)",
              fontSize: 14,
              fontWeight: 500,
              padding: "10px 18px",
              borderRadius: "var(--radius)",
              cursor: "pointer",
            }}
          >
            Panele dön
          </button>
          <button
            type="button"
            style={{
              border: "1px solid var(--border-strong)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontSize: 14,
              fontWeight: 500,
              padding: "10px 18px",
              borderRadius: "var(--radius)",
              cursor: "pointer",
            }}
          >
            İzin iste
          </button>
        </div>
      </div>
    </SectionFrame>
  );
}
