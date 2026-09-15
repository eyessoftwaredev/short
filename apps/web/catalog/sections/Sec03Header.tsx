"use client";

import { useCallback, useState, type MouseEvent } from "react";
import copyData from "@/data/copy.json";
import projectsData from "@/data/projects.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-03");

export function Sec03Header() {
  const [workspace, setWorkspace] = useState(projectsData.workspaces[0] ?? "Acme Pazarlama");
  const [wsOpen, setWsOpen] = useState(false);
  const [tab, setTab] = useState(copyData.appTabs[0] ?? "Projeler");

  const onToggleWorkspace = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setWsOpen((o) => !o);
  }, []);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            padding: "16px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 22, height: 22, borderRadius: "var(--radius-sm)", background: "var(--accent)" }} />
              <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>eyesONE</span>
            </div>
            <nav style={{ display: "flex", gap: 24, fontSize: 14 }}>
              {["Ürün", "Analitik", "Fiyatlandırma", "Dokümanlar"].map((label) => (
                <a key={label} href="#" style={{ color: "var(--fg-muted)" }}>
                  {label}
                </a>
              ))}
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" className="kit-btn kit-btn--ghost">
              Giriş yap
            </button>
            <button type="button" className="kit-btn kit-btn--primary">
              Ücretsiz başla
            </button>
          </div>
        </div>

        <div style={{ background: "var(--surface)", padding: "0 24px", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "12px 0",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={onToggleWorkspace}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--bg)",
                    border: `1px solid ${wsOpen ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "var(--radius-2xs)",
                      background: "var(--inverse)",
                      color: "var(--on-inverse)",
                      fontSize: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {workspace.charAt(0)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{workspace}</span>
                  <span style={{ fontSize: 10, color: "var(--fg-subtle)" }}>{wsOpen ? "▴" : "▾"}</span>
                </button>
                {wsOpen ? (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      zIndex: 30,
                      minWidth: 220,
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
                    {projectsData.workspaces.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          setWorkspace(w);
                          setWsOpen(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          width: "100%",
                          textAlign: "left",
                          border: "none",
                          background: w === workspace ? "var(--surface)" : "transparent",
                          color: "var(--ink)",
                          fontSize: 13,
                          padding: "8px 10px",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "var(--radius-2xs)",
                            background: "var(--inverse)",
                            color: "var(--on-inverse)",
                            fontSize: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {w.charAt(0)}
                        </span>
                        <span style={{ flex: 1 }}>{w}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent-ink)" }}>
                          {w === workspace ? "✓" : ""}
                        </span>
                      </button>
                    ))}
                    <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                    <button
                      type="button"
                      onClick={() => setWsOpen(false)}
                      style={{
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        color: "var(--fg-muted)",
                        fontSize: 13,
                        padding: "8px 10px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                      }}
                    >
                      Yeni çalışma alanı…
                    </button>
                  </div>
                ) : null}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--accent-ink)",
                  background: "var(--accent-surface)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-xs)",
                }}
              >
                Pro
              </span>
            </div>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--inverse)",
                color: "var(--on-inverse)",
                fontSize: 12,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              MK
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {copyData.appTabs.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setTab(label)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  padding: "10px 12px",
                  borderBottom: `2px solid ${label === tab ? "var(--accent)" : "transparent"}`,
                  color: label === tab ? "var(--ink)" : "var(--fg-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: "20px 24px", fontSize: 14, color: "var(--fg-muted)", background: "var(--bg)" }}>
          Aktif sekme: <strong style={{ color: "var(--ink)" }}>{tab}</strong>
        </div>
      </div>
    </SectionFrame>
  );
}
