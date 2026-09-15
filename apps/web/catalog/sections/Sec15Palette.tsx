"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import copyData from "@/data/copy.json";
import { useCatalog } from "../CatalogProvider";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-15");

export function Sec15Palette() {
  const { setFormModalOpen, setDrawerOpen, pushToast } = useCatalog();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");

  const paletteItems = useMemo(
    () =>
      copyData.palette.filter((p) =>
        p.label.toLowerCase().includes(paletteQuery.trim().toLowerCase()),
      ),
    [paletteQuery],
  );

  const openPalette = useCallback(() => {
    setPaletteOpen(true);
    setPaletteQuery("");
  }, []);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    setPaletteQuery("");
  }, []);

  const runAction = useCallback(
    (act: string) => {
      closePalette();
      if (act === "new") setFormModalOpen(true);
      else if (act === "stats") setDrawerOpen(true);
      else pushToast("info");
    },
    [closePalette, setFormModalOpen, setDrawerOpen, pushToast],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && paletteOpen) closePalette();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        setPaletteQuery("");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [paletteOpen, closePalette]);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 28,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <button type="button" className="kit-btn" onClick={openPalette}>
          Komut paletini aç
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-2xs)",
              padding: "2px 6px",
            }}
          >
            ⌘K
          </span>
        </button>
        <span style={{ fontSize: 13, color: "var(--fg-subtle)" }}>
          Klavyeden ⌘K / Ctrl+K de çalışır.
        </span>
      </div>

      {paletteOpen ? (
        <div
          role="presentation"
          onClick={closePalette}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 65,
            background: "var(--overlay)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "80px 24px 24px",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg)",
              borderRadius: "var(--radius)",
              width: "100%",
              maxWidth: 520,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <input
              value={paletteQuery}
              onChange={(e) => setPaletteQuery(e.target.value)}
              placeholder="Komut veya proje ara…"
              autoFocus
              style={{
                border: "none",
                borderBottom: "1px solid var(--border)",
                padding: "16px 18px",
                fontSize: 15,
                outline: "none",
                background: "var(--bg)",
                color: "var(--ink)",
              }}
            />
            <div
              style={{
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                maxHeight: 320,
                overflow: "auto",
              }}
            >
              {paletteItems.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => runAction(p.act)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    color: "var(--ink)",
                    fontSize: 14,
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--accent-ink)", width: 16, textAlign: "center" }}>
                    <i className={p.icon} />
                  </span>
                  <span style={{ flex: 1 }}>{p.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-disabled)" }}>
                    {p.hint}
                  </span>
                </button>
              ))}
              {paletteItems.length === 0 ? (
                <div style={{ padding: "24px 12px", textAlign: "center", fontSize: 14, color: "var(--fg-subtle)" }}>
                  Sonuç yok
                </div>
              ) : null}
            </div>
            <div
              style={{
                borderTop: "1px solid var(--border)",
                background: "var(--surface)",
                padding: "10px 16px",
                display: "flex",
                gap: 16,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-subtle)",
              }}
            >
              <span>↑↓ gez</span>
              <span>↵ seç</span>
              <span>esc kapat</span>
            </div>
          </div>
        </div>
      ) : null}
    </SectionFrame>
  );
}
