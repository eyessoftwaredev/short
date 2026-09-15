import chartsData from "@/data/charts.json";
import projectsData from "@/data/projects.json";
import { AdminShell, Grid, Hero, Section, Sidebar, Topbar } from "@/components/kit";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-30");

export function Sec30Dashboard() {
  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-frame">
        <AdminShell
          style={{ minHeight: 560 }}
          sidebar={
            <Sidebar
              collapsed
              brand={<span className="kit-sidebar__logo" />}
              groups={[
                {
                  label: "",
                  items: [
                    { id: "folder", label: "", icon: <i className="fa-solid fa-folder" />, active: true },
                    { id: "chart", label: "", icon: <i className="fa-solid fa-chart-line" /> },
                    { id: "gear", label: "", icon: <i className="fa-solid fa-gear" /> },
                  ],
                },
              ]}
            />
          }
          topbar={
            <Topbar
              current="Dashboard"
              actions={
                <button type="button" className="kit-btn kit-btn--primary">
                  Yeni proje
                </button>
              }
            />
          }
        >
          <main className="kit-page" style={{ padding: 16, gap: 16 }}>
            <Hero
              variant="compact"
              title={<span style={{ fontSize: 20 }}>Genel bakış</span>}
              description={<span style={{ fontSize: 13 }}>Son 30 gün performans özeti.</span>}
            />
            <Grid columns={4}>
              {chartsData.layoutKpiCards.map((card) => (
                <article key={card.label} className="kit-card" style={{ padding: 14 }}>
                  <span className="kit-card__label">{card.label}</span>
                  <span className="kit-card__value" style={{ fontSize: 22 }}>
                    {card.value}
                  </span>
                </article>
              ))}
            </Grid>
            <Grid columns={12}>
              <Section span={8} title={<span style={{ fontSize: 16 }}>Aktivite</span>}>
                <div className="kit-table-placeholder">
                  <div className="kit-table-placeholder__head">
                    <span>Proje</span>
                    <span>Sahip</span>
                    <span>Durum</span>
                    <span />
                  </div>
                  {projectsData.composedRows.map((row) => (
                    <div key={row.name} className="kit-table-placeholder__row">
                      <span>{row.name}</span>
                      <span>{row.owner}</span>
                      <span style={{ color: row.statusColor }}>{row.status}</span>
                      <span>…</span>
                    </div>
                  ))}
                </div>
              </Section>
              <Section span={4} title={<span style={{ fontSize: 16 }}>Plan</span>}>
                <div className="kit-card" style={{ padding: 14 }}>
                  <span className="kit-card__label">Pro</span>
                  <span className="kit-card__value" style={{ fontSize: 18 }}>
                    %92 kota
                  </span>
                </div>
              </Section>
            </Grid>
          </main>
        </AdminShell>
      </div>
      <p style={{ margin: 0, fontSize: 14, color: "var(--fg-muted)" }}>
        Kompozisyon katalogda kalır; ayrı page şablonu yok.
      </p>
    </SectionFrame>
  );
}
