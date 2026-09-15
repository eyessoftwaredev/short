"use client";

import { useCatalog } from "./CatalogProvider";

export function ToastStack() {
  const { toasts, dismissToast } = useCatalog();

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 70,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            minWidth: 280,
            maxWidth: 360,
            background: "var(--bg)",
            border: `1px solid ${t.border}`,
            borderRadius: "var(--radius)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-toast)",
          }}
        >
          <span
            style={{
              flex: "none",
              width: 22,
              height: 22,
              borderRadius: "var(--radius-sm)",
              background: t.iconBg,
              color: "var(--on-accent)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className={t.icon} />
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{t.title}</span>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--fg-muted)" }}>{t.body}</span>
          </span>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            style={{
              flex: "none",
              border: "none",
              background: "transparent",
              color: "var(--fg-disabled)",
              fontSize: 13,
              cursor: "pointer",
              padding: "0 2px",
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      ))}
    </div>
  );
}
