"use client";

import copyData from "@/data/copy.json";
import { useCatalog, type ToastKind } from "../CatalogProvider";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-09");

export function Sec09Toast() {
  const { pushToast } = useCatalog();

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {copyData.toastTriggers.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => pushToast(t.kind as ToastKind)}
              style={{
                border: `1px solid ${t.border}`,
                background: "var(--bg)",
                color: t.color,
                fontSize: 14,
                fontWeight: 500,
                padding: "10px 18px",
                borderRadius: "var(--radius)",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderTop: "1px solid var(--border)",
            paddingTop: 24,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--fg-subtle)",
            }}
          >
            Satır içi uyarı
          </div>
          {copyData.inlineAlerts.map((a) => (
            <div
              key={a.title}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                border: `1px solid ${a.border}`,
                background: a.bg,
                borderRadius: "var(--radius)",
                padding: "14px 16px",
              }}
            >
              <span
                style={{
                  flex: "none",
                  width: 22,
                  height: 22,
                  borderRadius: "var(--radius-sm)",
                  background: a.iconBg,
                  color: "var(--on-accent)",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className={a.icon} />
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: a.titleColor }}>{a.title}</span>
                <span style={{ fontSize: 13, lineHeight: 1.55, color: "var(--fg-muted)" }}>{a.body}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}
