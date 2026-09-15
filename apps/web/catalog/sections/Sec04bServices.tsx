import peopleData from "@/data/people.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-04b");

export function Sec04bServices() {
  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div className="kit-orbit">
          <div className="kit-orbit__body">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
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
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--accent-ink)",
                  background: "var(--accent-surface)",
                  padding: "4px 9px",
                  borderRadius: "var(--radius-xs)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    display: "block",
                    animation: "om-pulse 1.8s ease-in-out infinite",
                  }}
                />
                Canlı
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>
              Kampanya takibi
            </h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
              Özel roller, kaynak kırılımı ve dönüşüm etiketleriyle her kampanyanın getirisini tek
              ekranda gör.
            </p>
            <div
              style={{
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 500,
                color: "var(--accent-ink)",
              }}
            >
              Hizmeti incele
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 12 }} />
            </div>
          </div>
        </div>

        <div className="kit-orbit">
          <div className="kit-orbit__body">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius)",
                background: "var(--surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 15,
                color: "var(--ink)",
              }}
            >
              <i className="fa-solid fa-globe" />
            </div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>
              Markalı portal
            </h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
              portal.markaniz.com üzerinden yayınla. Otomatik SSL, özel alan, tek CNAME ile kurulum.
            </p>
            <div
              style={{
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 500,
                color: "var(--accent-ink)",
              }}
            >
              Kuruluma bak
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 12 }} />
            </div>
          </div>
        </div>

        <div className="kit-orbit">
          <div className="kit-orbit__body">
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)" }}>
                01
              </span>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>
                Rapor dışa aktarma
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
              Her proje için PDF veya CSV üret; dışarı çıktıktan sonra bile şablonu değiştir.
            </p>
            <div
              style={{
                height: 76,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                background:
                  "repeating-linear-gradient(135deg, var(--surface-subtle) 0 8px, var(--bg) 8px 16px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-disabled)",
              }}
            >
              rapor önizleme
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div className="kit-orbit kit-orbit--inverse">
          <div className="kit-orbit__body">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius)",
                background: "var(--on-inverse-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 15,
                color: "var(--accent-bright)",
              }}
            >
              <i className="fa-solid fa-code" />
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "var(--on-inverse)",
              }}
            >
              Geliştirici API
            </h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--on-inverse-dim)" }}>
              Tek uç noktayla toplu kayıt üret, webhook ile olayları anlık al.
            </p>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--accent-bright)",
                background: "var(--on-inverse-soft)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 12px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              POST /v1/projects
            </div>
          </div>
        </div>

        <div className="kit-orbit">
          <div
            className="kit-orbit__body"
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}
          >
            <div
              style={{
                flex: "none",
                width: 44,
                height: 44,
                borderRadius: "var(--radius)",
                background: "var(--accent-surface)",
                color: "var(--accent-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 16,
              }}
            >
              <i className="fa-solid fa-layer-group" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>
                Toplu içe aktarma
              </h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
                CSV yükle, kayıtları tek seferde oluştur. Çakışan isimler otomatik raporlanır.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["csv", "10.000 satır"].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      color: "var(--fg-muted)",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      padding: "4px 8px",
                      borderRadius: "var(--radius-xs)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="kit-orbit">
          <div className="kit-orbit__body">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>
                Ekip erişimi
              </h3>
              <div style={{ display: "flex" }}>
                {peopleData.avatars.map((av) => (
                  <span
                    key={av.initials}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: av.bg,
                      color: av.color,
                      border: "2px solid var(--bg)",
                      marginLeft: -8,
                      fontSize: 10,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {av.initials}
                  </span>
                ))}
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
              Rol bazlı izinler, denetim kaydı ve SSO ile ajans–müşteri iş akışını ayır.
            </p>
            <div style={{ marginTop: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="kit-btn kit-btn--primary kit-btn--sm">
                Ekip kur
              </button>
              <button type="button" className="kit-btn kit-btn--sm">
                İzinler
              </button>
            </div>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
