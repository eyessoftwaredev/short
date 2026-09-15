"use client";

import { useEffect, useState } from "react";
import copyData from "@/data/copy.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-37");

export function Sec37Footer() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onDocClick = () => setUserMenuOpen(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-frame">
        <div className="kit-topbar">
          <span className="kit-topbar__current">Acme</span>
          <div className="kit-topbar__actions" style={{ position: "relative" }}>
            <button
              type="button"
              className="kit-avatar kit-avatar--lg"
              aria-expanded={userMenuOpen}
              onClick={(event) => {
                event.stopPropagation();
                setUserMenuOpen((value) => !value);
              }}
            >
              MK
            </button>
            {userMenuOpen ? (
              <div
                className="kit-pop"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  zIndex: 20,
                  minWidth: 200,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 6,
                  boxShadow: "var(--shadow-pop)",
                }}
              >
                {copyData.userMenuItems.map((label) => (
                  <button
                    key={label}
                    type="button"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      color: "var(--ink)",
                      fontSize: 14,
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                    }}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <footer className="kit-footer">
          <span>© 2026 Acme Inc.</span>
          <span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a href="#">Gizlilik</a>
            <a href="#">Şartlar</a>
            <a href="#">Durum</a>
            <a href="#">Dokümanlar</a>
          </span>
        </footer>
      </div>
    </SectionFrame>
  );
}
