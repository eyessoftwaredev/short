"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import copyData from "@/data/copy.json";
import projectsData from "@/data/projects.json";
import { useCatalog } from "../CatalogProvider";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-12");

export function Sec12Inputs() {
  const { pushToast } = useCatalog();
  const [comboOpen, setComboOpen] = useState(false);
  const [comboQuery, setComboQuery] = useState("");
  const [domain, setDomain] = useState(projectsData.domains[0] ?? "app.acme.com");
  const [tags, setTags] = useState(["ürün", "q3", "crm"]);
  const [tagDraft, setTagDraft] = useState("");
  const [ttl, setTtl] = useState(30);
  const [redirect, setRedirect] = useState("301");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [keyVisible, setKeyVisible] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const uploadTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const comboOptions = useMemo(
    () =>
      projectsData.domains.filter((d) =>
        d.toLowerCase().includes(comboQuery.trim().toLowerCase()),
      ),
    [comboQuery],
  );

  const onTagKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const v = tagDraft.trim().toLowerCase();
        if (v && !tags.includes(v)) setTags((prev) => [...prev, v]);
        setTagDraft("");
      } else if (e.key === "Backspace" && !tagDraft && tags.length) {
        setTags((prev) => prev.slice(0, -1));
      }
    },
    [tagDraft, tags],
  );

  const onFakeUpload = useCallback(() => {
    if (uploading) return;
    setUploading(true);
    setUploadPct(0);
    if (uploadTimer.current) clearInterval(uploadTimer.current);
    uploadTimer.current = setInterval(() => {
      setUploadPct((prev) => {
        const next = prev + 12;
        if (next >= 100) {
          if (uploadTimer.current) clearInterval(uploadTimer.current);
          pushToast("info");
          return 100;
        }
        return next;
      });
    }, 260);
  }, [uploading, pushToast]);

  const onCopyKey = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(projectsData.apiKey);
      setKeyCopied(true);
      window.setTimeout(() => setKeyCopied(false), 1400);
    } catch {
      setKeyCopied(false);
    }
  }, []);

  const ttlLabel = ttl >= 90 ? "Süresiz" : `${ttl} gün`;

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
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Alan adı — aranabilir seçici</label>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setComboOpen((o) => !o);
                  setComboQuery("");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  border: `1px solid ${comboOpen ? "var(--accent)" : "var(--border-strong)"}`,
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: 14,
                  padding: "10px 12px",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>{domain}</span>
                <span style={{ fontSize: 10, color: "var(--fg-subtle)", fontFamily: "var(--font-sans)" }}>
                  {comboOpen ? "▴" : "▾"}
                </span>
              </button>
              {comboOpen ? (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    zIndex: 30,
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: 6,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    boxShadow: "var(--shadow-pop)",
                  }}
                >
                  <input
                    value={comboQuery}
                    onChange={(e) => setComboQuery(e.target.value)}
                    placeholder="Alan adı ara"
                    style={{
                      border: "1px solid var(--border-strong)",
                      borderRadius: "var(--radius-sm)",
                      padding: "8px 10px",
                      fontSize: 13,
                      marginBottom: 4,
                      background: "var(--bg)",
                      color: "var(--ink)",
                    }}
                  />
                  {comboOptions.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDomain(d);
                        setComboOpen(false);
                        setComboQuery("");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: d === domain ? "var(--surface)" : "transparent",
                        color: "var(--ink)",
                        fontSize: 13,
                        padding: "8px 10px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <span>{d}</span>
                      <span style={{ color: "var(--accent-ink)" }}>{d === domain ? "✓" : ""}</span>
                    </button>
                  ))}
                  {comboOptions.length === 0 ? (
                    <div style={{ padding: 10, fontSize: 13, color: "var(--fg-subtle)" }}>Eşleşme yok</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Etiketler</label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius)",
                padding: 8,
              }}
            >
              {tags.map((t) => (
                <span
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "4px 8px",
                    fontSize: 13,
                  }}
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--fg-subtle)",
                      fontSize: 11,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </span>
              ))}
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={onTagKey}
                placeholder="Etiket ekle + Enter"
                style={{
                  flex: 1,
                  minWidth: 120,
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  padding: "5px 4px",
                  background: "transparent",
                  color: "var(--ink)",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Proje ömrü</label>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent-ink)" }}>
                {ttlLabel}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={90}
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-disabled)",
              }}
            >
              <span>1 gün</span>
              <span>90 gün</span>
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Yönlendirme tipi</label>
            {copyData.redirectOptions.map((ro) => {
              const on = redirect === ro.code;
              return (
                <label
                  key={ro.code}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    cursor: "pointer",
                    border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                    background: on ? "var(--accent-tint)" : "var(--bg)",
                    borderRadius: "var(--radius)",
                    padding: "12px 14px",
                  }}
                >
                  <input
                    type="radio"
                    checked={on}
                    onChange={() => setRedirect(ro.code)}
                    style={{ width: 16, height: 16, margin: "2px 0 0", accentColor: "var(--accent)" }}
                  />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{ro.label}</span>
                    <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{ro.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>CSV ile toplu yükleme</label>
            <div
              style={{
                border: "1px dashed var(--border-strong)",
                borderRadius: "var(--radius)",
                padding: "28px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                textAlign: "center",
                background: "var(--surface-subtle)",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "var(--radius)",
                  background: "var(--accent-surface)",
                  color: "var(--accent-ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="fa-solid fa-cloud-arrow-up" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Dosyayı buraya sürükle</div>
              <div style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                .csv · en fazla 10 MB · sütunlar: url, alias, tag
              </div>
              <button type="button" className="kit-btn kit-btn--sm" onClick={onFakeUpload} style={{ marginTop: 4 }}>
                Dosya seç
              </button>
            </div>
            {uploading ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)" }}>projeler-eylul.csv</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>{uploadPct}%</span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: "var(--radius-3xs)",
                    background: "var(--surface)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${uploadPct}%`,
                      background: "var(--accent)",
                      transition: "width .3s ease",
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              borderTop: "1px solid var(--border)",
              paddingTop: 18,
            }}
          >
            <label style={{ fontSize: 13, fontWeight: 500 }}>API anahtarı</label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--inverse)",
                borderRadius: "var(--radius)",
                padding: "12px 14px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 160,
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--on-inverse-dim)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {keyVisible ? projectsData.apiKey : "sk_live_••••••••••••••••••••4f7a"}
              </span>
              <button
                type="button"
                onClick={() => setKeyVisible((v) => !v)}
                style={{
                  border: "1px solid var(--on-inverse-border)",
                  background: "transparent",
                  color: "var(--on-inverse)",
                  fontSize: 12,
                  padding: "5px 10px",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer",
                }}
              >
                {keyVisible ? "Gizle" : "Göster"}
              </button>
              <button
                type="button"
                onClick={onCopyKey}
                style={{
                  border: "1px solid var(--on-inverse)",
                  background: "var(--on-inverse)",
                  color: "var(--inverse)",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "5px 10px",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer",
                }}
              >
                {keyCopied ? "Kopyalandı ✓" : "Kopyala"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
