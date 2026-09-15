"use client";

import { useCallback, useMemo, useState, type MouseEvent } from "react";
import copyData from "@/data/copy.json";
import projectsData from "@/data/projects.json";
import { useCatalog } from "../CatalogProvider";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-06");
const PAGE_SIZE = projectsData.pageSize;
const STATUS = projectsData.status as Record<string, { bg: string; color: string }>;

type Row = (typeof projectsData.rows)[number];

export function Sec06Table() {
  const { setFormModalOpen, setConfirmModalOpen, setDrawerOpen, pushToast } = useCatalog();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(copyData.filters[0] ?? "Tümü");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [copiedRow, setCopiedRow] = useState<string | null>(null);
  const [rowMenu, setRowMenu] = useState<string | null>(null);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = projectsData.rows.filter((r) => {
      const okQ =
        !q ||
        r.short.toLowerCase().includes(q) ||
        r.tag.toLowerCase().includes(q) ||
        r.target.toLowerCase().includes(q);
      const okF =
        filter === "Tümü" ||
        (filter === "Aktif" && r.status === "Aktif") ||
        (filter === "Süresi geçti" && r.status === "Süresi geçti");
      return okQ && okF;
    });
    rows = [...rows].sort((a, b) => (sortDesc ? b.clicks - a.clicks : a.clicks - b.clicks));
    return rows;
  }, [query, filter, sortDesc]);

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = visibleRows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const allSelected = pageRows.length > 0 && pageRows.every((r) => selected[r.short]);

  const nf = (n: number) => n.toLocaleString("tr-TR");

  const onToggleAll = useCallback(() => {
    const on = !allSelected;
    setSelected((prev) => {
      const next = { ...prev };
      pageRows.forEach((r) => {
        next[r.short] = on;
      });
      return next;
    });
  }, [allSelected, pageRows]);

  const onCopy = useCallback((short: string) => {
    setCopiedRow(short);
    window.setTimeout(() => setCopiedRow(null), 1200);
  }, []);

  const gridCols =
    "44px minmax(220px,1.4fr) minmax(180px,1.2fr) 120px 96px 110px 56px";

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Proje veya etiket ara"
              style={{
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius)",
                padding: "8px 12px",
                fontSize: 14,
                minWidth: 220,
                background: "var(--bg)",
                color: "var(--ink)",
              }}
            />
            {copyData.filters.map((label) => {
              const on = label === filter;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setFilter(label);
                    setPage(0);
                  }}
                  style={{
                    border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
                    background: on ? "var(--accent-surface)" : "var(--bg)",
                    color: on ? "var(--accent-hover)" : "var(--fg-muted)",
                    fontSize: 13,
                    fontWeight: 500,
                    padding: "8px 12px",
                    borderRadius: "var(--radius)",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>{visibleRows.length} proje</div>
        </div>

        {selectedCount > 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              background: "var(--accent-surface)",
              borderBottom: "1px solid var(--accent-surface-hover)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--accent-ink)", fontWeight: 500 }}>
              {selectedCount} proje seçildi
            </span>
            <button type="button" className="kit-btn kit-btn--sm kit-btn--soft">
              Etiketle
            </button>
            <button type="button" className="kit-btn kit-btn--sm kit-btn--danger">
              Arşivle
            </button>
          </div>
        ) : null}

        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 880 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                alignItems: "center",
                background: "var(--surface)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ padding: "11px 16px" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  style={{ width: 15, height: 15, accentColor: "var(--accent)" }}
                />
              </div>
              {["Proje", "Sahip", "Durum"].map((h) => (
                <div
                  key={h}
                  style={{
                    padding: "11px 12px",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--fg-muted)",
                    fontWeight: 500,
                  }}
                >
                  {h}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSortDesc((d) => !d)}
                style={{
                  padding: "11px 12px",
                  textAlign: "right",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--accent-ink)",
                  fontWeight: 500,
                  cursor: "pointer",
                  userSelect: "none",
                  border: "none",
                  background: "transparent",
                }}
              >
                {sortDesc ? "Oturum ↓" : "Oturum ↑"}
              </button>
              <div
                style={{
                  padding: "11px 12px",
                  textAlign: "right",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--fg-muted)",
                  fontWeight: 500,
                }}
              >
                Oluşturma
              </div>
              <div
                style={{
                  padding: "11px 16px",
                  textAlign: "right",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--fg-muted)",
                  fontWeight: 500,
                }}
              >
                İşlem
              </div>
            </div>

            {visibleRows.length === 0 ? (
              <div
                style={{
                  padding: "56px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  textAlign: "center",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600 }}>Sonuç bulunamadı</div>
                <div style={{ fontSize: 14, color: "var(--fg-muted)" }}>
                  Aramayı veya filtreyi değiştirmeyi dene.
                </div>
              </div>
            ) : (
              pageRows.map((r) => (
                <TableRow
                  key={r.short}
                  row={r}
                  gridCols={gridCols}
                  selected={!!selected[r.short]}
                  onToggle={() =>
                    setSelected((prev) => ({ ...prev, [r.short]: !prev[r.short] }))
                  }
                  copyLabel={copiedRow === r.short ? "✓" : "Kopyala"}
                  onCopy={() => onCopy(r.short)}
                  menuOpen={rowMenu === r.short}
                  menuBg={rowMenu === r.short ? "var(--surface)" : "var(--bg)"}
                  onMenu={(e) => {
                    e.stopPropagation();
                    setRowMenu(rowMenu === r.short ? null : r.short);
                  }}
                  onEdit={() => {
                    setRowMenu(null);
                    setFormModalOpen(true);
                  }}
                  onExport={() => {
                    setRowMenu(null);
                    pushToast("success");
                  }}
                  onStats={() => {
                    setRowMenu(null);
                    setDrawerOpen(true);
                  }}
                  onDelete={() => {
                    setRowMenu(null);
                    setConfirmModalOpen(true);
                  }}
                  nf={nf}
                />
              ))
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "12px 16px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
            {visibleRows.length === 0
              ? "0 kayıt"
              : `${safePage * PAGE_SIZE + 1}–${Math.min(visibleRows.length, safePage * PAGE_SIZE + PAGE_SIZE)} / ${visibleRows.length} kayıt · sayfa ${safePage + 1}/${pageCount}`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="kit-btn kit-btn--sm"
            >
              Önceki
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="kit-btn kit-btn--sm"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}

type TableRowProps = {
  row: Row;
  gridCols: string;
  selected: boolean;
  onToggle: () => void;
  copyLabel: string;
  onCopy: () => void;
  menuOpen: boolean;
  menuBg: string;
  onMenu: (e: MouseEvent<HTMLButtonElement>) => void;
  onEdit: () => void;
  onExport: () => void;
  onStats: () => void;
  onDelete: () => void;
  nf: (n: number) => string;
};

function TableRow({
  row,
  gridCols,
  selected,
  onToggle,
  copyLabel,
  onCopy,
  menuOpen,
  menuBg,
  onMenu,
  onEdit,
  onExport,
  onStats,
  onDelete,
  nf,
}: TableRowProps) {
  const st = STATUS[row.status] ?? { bg: "var(--surface)", color: "var(--fg-muted)" };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: gridCols,
        alignItems: "center",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ padding: "13px 16px" }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          style={{ width: 15, height: 15, accentColor: "var(--accent)" }}
        />
      </div>
      <div style={{ padding: "13px 12px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.short}
          </span>
          <button
            type="button"
            onClick={onCopy}
            style={{
              flexShrink: 0,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--fg-muted)",
              fontSize: 11,
              padding: "3px 7px",
              borderRadius: "var(--radius-xs)",
              cursor: "pointer",
            }}
          >
            {copyLabel}
          </button>
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-subtle)", marginTop: 3 }}>{row.tag}</div>
      </div>
      <div
        style={{
          padding: "13px 12px",
          fontSize: 13,
          color: "var(--fg-muted)",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {row.target}
      </div>
      <div style={{ padding: "13px 12px" }}>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            padding: "4px 8px",
            borderRadius: "var(--radius-xs)",
            background: st.bg,
            color: st.color,
          }}
        >
          {row.status}
        </span>
      </div>
      <div
        style={{
          padding: "13px 12px",
          textAlign: "right",
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "var(--font-mono)",
          color: "var(--ink)",
        }}
      >
        {nf(row.clicks)}
      </div>
      <div style={{ padding: "13px 12px", textAlign: "right", fontSize: 13, color: "var(--fg-subtle)" }}>
        {row.created}
      </div>
      <div style={{ padding: "13px 16px", textAlign: "right" }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            type="button"
            onClick={onMenu}
            style={{
              border: "1px solid var(--border)",
              background: menuBg,
              color: "var(--fg-muted)",
              fontSize: 13,
              width: 30,
              height: 30,
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-ellipsis" />
          </button>
          {menuOpen ? (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                zIndex: 30,
                minWidth: 180,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: 6,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                boxShadow: "var(--shadow-pop)",
                textAlign: "left",
              }}
            >
              {[
                { label: "Düzenle", action: onEdit },
                { label: "Dışa aktar", action: onExport },
                { label: "İstatistikler", action: onStats },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  style={{
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    color: "var(--ink)",
                    fontSize: 13,
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              ))}
              <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
              <button
                type="button"
                onClick={onDelete}
                style={{
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  color: "var(--danger)",
                  fontSize: 13,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                Sil
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
