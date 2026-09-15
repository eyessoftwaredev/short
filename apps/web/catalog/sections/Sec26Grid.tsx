import chartsData from "@/data/charts.json";
import { Grid, Hero, Section } from "@/components/kit";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-26");

export function Sec26Grid() {
  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Hero
          variant="compact"
          eyebrow="Layout"
          title="Section + grid örneği"
          description="Başlık, açıklama ve birincil aksiyon aynı satırda hizalanır."
          actions={
            <>
              <button type="button" className="kit-btn">
                Dışa aktar
              </button>
              <button type="button" className="kit-btn kit-btn--primary">
                Yeni kayıt
              </button>
            </>
          }
        />
        <Grid columns={4}>
          {chartsData.layoutKpiCards.map((card) => (
            <article key={card.label} className="kit-card">
              <span className="kit-card__label">{card.label}</span>
              <span className="kit-card__value">{card.value}</span>
              <span className="kit-card__delta" style={{ color: card.deltaColor }}>
                {card.delta}
              </span>
            </article>
          ))}
        </Grid>
        <Grid columns={12}>
          <Section
            span={8}
            title="Ana içerik (8 kolon)"
            description="Tablo, form veya grafik alanı."
          >
            <div
              className="kit-card"
              style={{ minHeight: 120, color: "var(--fg-muted)", fontSize: 14 }}
            >
              min-width:0 ile taşma engellenir.
            </div>
          </Section>
          <Section span={4} title="Yan panel (4 kolon)" description="Özet kart veya filtre.">
            <div
              className="kit-card"
              style={{ minHeight: 120, color: "var(--fg-muted)", fontSize: 14 }}
            >
              Mobilde tam genişlik.
            </div>
          </Section>
        </Grid>
      </div>
    </SectionFrame>
  );
}
