"use client";

import { Grid } from "@/components/kit";
import { useCallback, useState } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-05");

export function Sec05Form() {
  const [targetUrl, setTargetUrl] = useState("https://acme.com/projects/atlas-crm");
  const [alias, setAlias] = useState("atlas-crm");
  const [qrOn, setQrOn] = useState(true);
  const [expiryOn, setExpiryOn] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);

  const aliasTaken = alias.trim().toLowerCase() === "demo";

  const onToggleSwitch = useCallback(() => {
    setSwitchOn((v) => !v);
  }, []);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={2}>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Proje URL</label>
            <input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://acme.com/projects/atlas"
              style={{
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius)",
                padding: "10px 12px",
                fontSize: 14,
                background: "var(--bg)",
                color: "var(--ink)",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
              http:// veya https:// ile başlamalı.
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Proje adı</label>
            <div style={{ display: "flex", alignItems: "stretch" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  color: "var(--fg-muted)",
                  background: "var(--surface)",
                  border: "1px solid var(--border-strong)",
                  borderRight: "none",
                  borderRadius: "var(--radius) 0 0 var(--radius)",
                  padding: "10px 12px",
                }}
              >
                acme.app/
              </span>
              <input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="atlas-crm"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "1px solid var(--border-strong)",
                  borderRadius: "0 var(--radius) var(--radius) 0",
                  padding: "10px 12px",
                  fontSize: 14,
                  fontFamily: "var(--font-mono)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: aliasTaken ? "var(--danger)" : "var(--fg-subtle)" }}>
              {aliasTaken
                ? "Bu ad kullanımda."
                : "Boş bırakırsan rastgele 6 karakter üretilir."}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Etiket</label>
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
              <option>Kampanya</option>
              <option>Sosyal medya</option>
              <option>E-posta</option>
              <option>Dokümanlar</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Parola — hata durumu</label>
            <input
              type="password"
              defaultValue="123"
              style={{
                border: "1px solid var(--danger-border-strong)",
                borderRadius: "var(--radius)",
                padding: "10px 12px",
                fontSize: 14,
                background: "var(--bg)",
                color: "var(--ink)",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--danger)" }}>En az 8 karakter olmalı.</span>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Not</label>
            <textarea
              placeholder="Bu proje nerede kullanılacak?"
              style={{
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius)",
                padding: "10px 12px",
                fontSize: 14,
                minHeight: 84,
                resize: "vertical",
                background: "var(--bg)",
                color: "var(--ink)",
              }}
            />
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={qrOn}
              onChange={() => setQrOn((v) => !v)}
              style={{ width: 16, height: 16, margin: "2px 0 0", accentColor: "var(--accent)" }}
            />
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Kapak görseli ekle</span>
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>Proje kartında gösterilir.</span>
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={expiryOn}
              onChange={() => setExpiryOn((v) => !v)}
              style={{ width: 16, height: 16, margin: "2px 0 0", accentColor: "var(--accent)" }}
            />
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Bitiş tarihi ekle</span>
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                Süre sonunda proje arşivlenir.
              </span>
            </span>
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              borderTop: "1px solid var(--border)",
              paddingTop: 18,
            }}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Proje gizliliği</span>
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                Yalnızca ekip üyeleri istatistikleri görür.
              </span>
            </span>
            <button
              type="button"
              onClick={onToggleSwitch}
              style={{
                flex: "none",
                border: "none",
                cursor: "pointer",
                width: 44,
                height: 26,
                borderRadius: "var(--radius-pill)",
                padding: 3,
                display: "flex",
                justifyContent: switchOn ? "flex-end" : "flex-start",
                background: switchOn ? "var(--accent)" : "var(--border-strong)",
                transition: "background .15s ease",
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: switchOn ? "var(--on-accent)" : "var(--bg)",
                  display: "block",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                }}
              />
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="kit-btn kit-btn--primary">
              Kaydet
            </button>
            <button type="button" className="kit-btn">
              Vazgeç
            </button>
          </div>
        </div>
      </Grid>
    </SectionFrame>
  );
}
