"use client";

import { useMemo, useState } from "react";
import copyData from "@/data/copy.json";
import peopleData from "@/data/people.json";
import { useCatalog } from "../CatalogProvider";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-21");

type SettingsSection = keyof typeof copyData.settingsCopy;

export function Sec21Settings() {
  const { pushToast } = useCatalog();
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("profile");
  const [inviteEmail, setInviteEmail] = useState("");

  const copy = useMemo(
    () => copyData.settingsCopy[settingsSection],
    [settingsSection],
  );

  const onInvite = () => {
    pushToast("success");
    setInviteEmail("");
  };

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "220px 1fr",
        }}
      >
        <div
          style={{
            background: "var(--surface-subtle)",
            borderRight: "1px solid var(--border)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {copyData.settingsNav.map((sn) => {
            const on = sn.id === settingsSection;
            return (
              <button
                key={sn.id}
                type="button"
                onClick={() => setSettingsSection(sn.id as SettingsSection)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: on ? "var(--accent-surface)" : "transparent",
                  color: on ? "var(--accent-hover)" : "var(--fg-muted)",
                  fontSize: 14,
                  fontWeight: on ? 500 : 400,
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                <i className={sn.icon} style={{ fontSize: 12, width: 14, textAlign: "center" }} />
                {sn.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{copy.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>{copy.body}</p>
          </div>

          {settingsSection === "profile" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>Ad</label>
                <input
                  defaultValue="Merve"
                  style={{
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius)",
                    padding: "10px 12px",
                    fontSize: 14,
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>Soyad</label>
                <input
                  defaultValue="Kaya"
                  style={{
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius)",
                    padding: "10px 12px",
                    fontSize: 14,
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>E-posta</label>
                <input
                  defaultValue="merve@acme.com"
                  style={{
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius)",
                    padding: "10px 12px",
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
          ) : null}

          {settingsSection === "team" ? (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  style={{
                    flex: 1,
                    minWidth: 200,
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius)",
                    padding: "10px 12px",
                    fontSize: 14,
                  }}
                />
                <select
                  style={{
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius)",
                    padding: "10px 12px",
                    fontSize: 14,
                    background: "var(--bg)",
                    color: "var(--ink)",
                  }}
                >
                  <option>Editor</option>
                  <option>Admin</option>
                  <option>Viewer</option>
                </select>
                <button type="button" className="kit-btn kit-btn--primary" onClick={onInvite}>
                  Davet gönder
                </button>
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px 100px",
                    background: "var(--surface)",
                    borderBottom: "1px solid var(--border)",
                    padding: "11px 16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--fg-muted)",
                  }}
                >
                  <span>Üye</span>
                  <span>Rol</span>
                  <span>Durum</span>
                </div>
                {peopleData.teamMembers.map((tm) => (
                  <div
                    key={tm.email}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 100px",
                      alignItems: "center",
                      padding: "13px 16px",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{tm.name}</span>
                      <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>{tm.email}</span>
                    </span>
                    <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>{tm.role}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        padding: "4px 8px",
                        borderRadius: "var(--radius-xs)",
                        background: tm.statusBg,
                        color: tm.statusColor,
                        justifySelf: "start",
                      }}
                    >
                      {tm.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </SectionFrame>
  );
}
