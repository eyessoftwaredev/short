import { Hero } from "@/components/kit";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-28");

export function Sec28Hero() {
  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Hero
          eyebrow="Workspace"
          title="Hoş geldin, Merve"
          description="Bu hafta 3 yeni proje açıldı. Analitik sekmesinden kullanım kırılımını incele."
          actions={
            <>
              <button type="button" className="kit-btn">
                Rapor indir
              </button>
              <button type="button" className="kit-btn kit-btn--primary">
                Proje oluştur
              </button>
            </>
          }
        />
        <Hero
          variant="compact"
          title="Analitik · Son 30 gün"
          description="184k API isteği · 24 proje · %99,98 uptime"
          actions={
            <button type="button" className="kit-btn">
              Filtrele
            </button>
          }
        />
        <Hero
          variant="inverse"
          eyebrow="Pro plan"
          title="Kota %92 dolu"
          description="18 / 20 koltuk kullanıldı. Business plana geçerek sınırsız ekip üyesi ekle."
          actions={
            <>
              <button type="button" className="kit-btn">
                Planları karşılaştır
              </button>
              <button type="button" className="kit-btn kit-btn--primary">
                Yükselt
              </button>
            </>
          }
        />
      </div>
    </SectionFrame>
  );
}
