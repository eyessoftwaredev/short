"use client";

import { useCatalog } from "../CatalogProvider";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-08");

export function Sec08Modal() {
  const { setFormModalOpen, setConfirmModalOpen, setDrawerOpen } = useCatalog();

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 28,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button type="button" className="kit-btn kit-btn--primary" onClick={() => setFormModalOpen(true)}>
          Yeni proje modalı
        </button>
        <button type="button" className="kit-btn kit-btn--danger" onClick={() => setConfirmModalOpen(true)}>
          Silme onayı
        </button>
        <button type="button" className="kit-btn" onClick={() => setDrawerOpen(true)}>
          Yan panel (drawer)
        </button>
      </div>
    </SectionFrame>
  );
}
