import boardData from "@/data/board.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-34");

export function Sec34Kanban() {
  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-kanban">
        {boardData.kanbanCols.map((col) => (
          <div key={col.title} className="kit-kanban__col">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{col.title}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-disabled)" }}>
                {col.count}
              </span>
            </div>
            {col.cards.map((card) => (
              <article key={card.title} className="kit-kanban__card">
                <span style={{ fontSize: 14, fontWeight: 500 }}>{card.title}</span>
                <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{card.meta}</span>
              </article>
            ))}
          </div>
        ))}
      </div>
    </SectionFrame>
  );
}
