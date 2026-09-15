"use client";

import { Grid } from "@/components/kit";
import opsData from "@/data/ops.json";
import { useState } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-52");

export function Sec52Security() {
  const [twoFa, setTwoFa] = useState(false);
  const [sessions, setSessions] = useState(opsData.sessions);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={12}>
        <div className="kit-span-8 kit-card" style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <h3 className="kit-chart__title">Aktif oturumlar</h3>
          {sessions.map((session) => (
            <div
              key={session.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid var(--border-subtle)",
                minWidth: 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{session.device}</div>
                <div style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                  {session.place} · {session.when}
                  {session.current ? " · bu cihaz" : ""}
                </div>
              </div>
              {session.current ? (
                <span className="kit-badge">Şimdi</span>
              ) : (
                <button
                  type="button"
                  className="kit-btn kit-btn--sm"
                  onClick={() => setSessions((prev) => prev.filter((item) => item.id !== session.id))}
                >
                  Kapat
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="kit-span-4 kit-card" style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <h3 className="kit-chart__title">İki adımlı doğrulama</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>
            Uygulama kodu ile oturum açmayı zorunlu kıl.
          </p>
          <button
            type="button"
            className={twoFa ? "kit-btn kit-btn--primary" : "kit-btn"}
            aria-pressed={twoFa}
            onClick={() => setTwoFa((prev) => !prev)}
          >
            {twoFa ? "2FA açık" : "2FA kapalı"}
          </button>
        </div>
      </Grid>
    </SectionFrame>
  );
}
