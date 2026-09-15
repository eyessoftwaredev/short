"use client";

import { useState } from "react";
import copyData from "@/data/copy.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-20");

export function Sec20Auth() {
  const [authMode, setAuthMode] = useState<"login" | "otp">("login");
  const [authError, setAuthError] = useState("");
  const [otp, setOtp] = useState(["1", "2", "3", "", "", ""]);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {copyData.authTabs.map((at) => {
              const on = at.id === authMode;
              return (
                <button
                  key={at.id}
                  type="button"
                  onClick={() => {
                    setAuthMode(at.id as "login" | "otp");
                    setAuthError("");
                  }}
                  style={{
                    border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
                    background: on ? "var(--accent-surface)" : "var(--bg)",
                    color: on ? "var(--accent-hover)" : "var(--fg-muted)",
                    fontSize: 13,
                    fontWeight: 500,
                    padding: "7px 12px",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  {at.label}
                </button>
              );
            })}
          </div>

          {authMode === "login" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Tekrar hoş geldin</h3>
                <p style={{ margin: 0, fontSize: 14, color: "var(--fg-muted)" }}>
                  Acme workspace hesabınla devam et.
                </p>
              </div>
              {authError ? (
                <div
                  style={{
                    border: "1px solid var(--danger-border-strong)",
                    background: "var(--danger-surface)",
                    borderRadius: "var(--radius)",
                    padding: "12px 14px",
                    fontSize: 13,
                    color: "var(--danger)",
                  }}
                >
                  {authError}
                </div>
              ) : null}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>E-posta</label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  style={{
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius)",
                    padding: "10px 12px",
                    fontSize: 14,
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 500 }}>Parola</label>
                  <button
                    type="button"
                    onClick={() =>
                      setAuthError("Bu e-posta adresiyle kayıtlı hesap bulunamadı.")
                    }
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--accent-ink)",
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Unuttum
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  style={{
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius)",
                    padding: "10px 12px",
                    fontSize: 14,
                  }}
                />
              </div>
              <button type="button" className="kit-btn kit-btn--primary" style={{ width: "100%" }}>
                Giriş yap
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 12,
                  color: "var(--fg-subtle)",
                }}
              >
                <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
                veya
                <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              <button type="button" className="kit-btn" style={{ width: "100%" }}>
                <i className="fa-brands fa-google" />
                Google ile devam et
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Doğrulama kodu</h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--fg-muted)", maxWidth: "32ch" }}>
                you@company.com adresine 6 haneli kod gönderdik.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {otp.map((val, i) => (
                  <input
                    key={i}
                    maxLength={1}
                    value={val}
                    onChange={(e) => {
                      const next = [...otp];
                      next[i] = e.target.value.slice(-1);
                      setOtp(next);
                    }}
                    style={{
                      width: 44,
                      height: 48,
                      textAlign: "center",
                      fontFamily: "var(--font-mono)",
                      fontSize: 18,
                      border: `1px solid ${i === 3 ? "var(--accent)" : "var(--border-strong)"}`,
                      borderRadius: "var(--radius)",
                      background: "var(--bg)",
                      color: "var(--ink)",
                    }}
                  />
                ))}
              </div>
              <button type="button" className="kit-btn kit-btn--primary" style={{ width: "100%" }}>
                Doğrula
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 16,
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
            Magic link
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
            Parola yok — e-posta ile tek tık giriş.
          </p>
          <input
            type="email"
            placeholder="you@company.com"
            style={{
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius)",
              padding: "10px 12px",
              fontSize: 14,
            }}
          />
          <button type="button" className="kit-btn kit-btn--primary">
            Magic link gönder
          </button>
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
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
              Kayıt
            </div>
            <input
              type="text"
              placeholder="Ad Soyad"
              style={{
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius)",
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
            <input
              type="email"
              placeholder="you@company.com"
              style={{
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius)",
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontSize: 13,
                color: "var(--fg-muted)",
                cursor: "pointer",
              }}
            >
              <input type="checkbox" style={{ width: 16, height: 16 }} />
              <span>Hizmet şartlarını kabul ediyorum.</span>
            </label>
            <button type="button" className="kit-btn">
              Hesap oluştur
            </button>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
