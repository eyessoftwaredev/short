"use client";

import { useMemo, useState } from "react";
import boardData from "@/data/board.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-38");

export function Sec38Arama() {
  const [searchQuery, setSearchQuery] = useState("fatura");

  const searchHits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return boardData.searchHits.filter(
      (hit) => !query || hit.title.toLowerCase().includes(query),
    );
  }, [searchQuery]);

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
        <div className="kit-card">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Proje, kişi, fatura ara…"
          />
          {searchHits.map((hit) => (
            <button
              key={hit.title}
              type="button"
              className="kit-hit"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "8px 0",
                cursor: "pointer",
                color: "var(--ink)",
              }}
            >
              <i className={hit.icon} style={{ width: 14, color: "var(--fg-subtle)", fontSize: 12 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>{hit.title}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-disabled)" }}>
                {hit.kind}
              </span>
            </button>
          ))}
          {searchHits.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--fg-subtle)", padding: "8px 0" }}>Sonuç yok</div>
          ) : null}
        </div>
        <div className="kit-table-placeholder">
          <div className="kit-table-placeholder__head">
            <span>Olay</span>
            <span>Aktör</span>
            <span>Zaman</span>
            <span />
          </div>
          {boardData.auditRows.map((row) => (
            <div key={row.event + row.when} className="kit-table-placeholder__row">
              <span>{row.event}</span>
              <span>{row.actor}</span>
              <span>{row.when}</span>
              <span />
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}
