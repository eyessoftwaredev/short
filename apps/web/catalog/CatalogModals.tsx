"use client";

import analyticsData from "@/data/analytics.json";
import { useCatalog } from "./CatalogProvider";

export function CatalogModals() {
  const {
    formModalOpen,
    confirmModalOpen,
    drawerOpen,
    closeOverlays,
    setFormModalOpen,
    setConfirmModalOpen,
    pushToast,
  } = useCatalog();

  const handleSaveModal = () => {
    setFormModalOpen(false);
    pushToast("success");
  };

  const handleConfirmDelete = () => {
    setConfirmModalOpen(false);
    pushToast("error");
  };

  return (
    <>
      {formModalOpen ? (
        <div
          role="presentation"
          onClick={closeOverlays}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "var(--overlay)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg)",
              borderRadius: "var(--radius)",
              width: "100%",
              maxWidth: 480,
              display: "flex",
              flexDirection: "column",
              maxHeight: "88vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Yeni proje</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>
                  Acme Pazarlama çalışma alanına eklenir.
                </p>
              </div>
              <button
                type="button"
                onClick={closeOverlays}
                style={{
                  flex: "none",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--fg-muted)",
                  width: 30,
                  height: 30,
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>Proje URL</label>
                <input
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
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>Kısa ad</label>
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
                    placeholder="billing-v2"
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
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                padding: "16px 24px",
                borderTop: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <button
                type="button"
                onClick={closeOverlays}
                style={{
                  border: "1px solid var(--border-strong)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: 14,
                  fontWeight: 500,
                  padding: "10px 18px",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                style={{
                  border: "1px solid var(--accent)",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontSize: 14,
                  fontWeight: 500,
                  padding: "10px 18px",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                }}
              >
                Oluştur
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmModalOpen ? (
        <div
          role="presentation"
          onClick={closeOverlays}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "var(--overlay)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg)",
              borderRadius: "var(--radius)",
              width: "100%",
              maxWidth: 420,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius)",
                background: "var(--danger-surface)",
                color: "var(--danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>3 projeyi sil</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--fg-muted)" }}>
              Bu projeler arşivlenir ve ekip listesinden kalkar. Geçmiş 30 gün saklanır. İşlem geri
              alınamaz.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <button
                type="button"
                onClick={closeOverlays}
                style={{
                  border: "1px solid var(--border-strong)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: 14,
                  fontWeight: 500,
                  padding: "10px 18px",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  border: "1px solid var(--danger)",
                  background: "var(--danger)",
                  color: "var(--on-accent)",
                  fontSize: 14,
                  fontWeight: 500,
                  padding: "10px 18px",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                }}
              >
                Kalıcı olarak sil
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {drawerOpen ? (
        <div
          role="presentation"
          onClick={closeOverlays}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "var(--overlay)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg)",
              width: "100%",
              maxWidth: 420,
              height: "100%",
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--accent-ink)" }}>
                  Atlas CRM
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--fg-subtle)" }}>2 Eyl 2026 · Ürün</p>
              </div>
              <button
                type="button"
                onClick={closeOverlays}
                style={{
                  flex: "none",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--fg-muted)",
                  width: 30,
                  height: 30,
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--fg-subtle)",
                    }}
                  >
                    Oturum
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 600 }}>12.480</span>
                </div>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--fg-subtle)",
                    }}
                  >
                    Benzersiz
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 600 }}>9.117</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--fg-subtle)",
                  }}
                >
                  En aktif ülkeler
                </div>
                {analyticsData.drawerCountries.map((d) => (
                  <div key={d.name} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        fontSize: 13,
                      }}
                    >
                      <span>{d.name}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>
                        {d.share}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: "var(--radius-3xs)",
                        background: "var(--surface)",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ height: "100%", width: d.share, background: "var(--accent)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                marginTop: "auto",
                display: "flex",
                gap: 10,
                padding: "16px 24px",
                borderTop: "1px solid var(--border)",
                background: "var(--surface)",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                style={{
                  border: "1px solid var(--accent)",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontSize: 14,
                  fontWeight: 500,
                  padding: "10px 18px",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                }}
              >
                Düzenle
              </button>
              <button
                type="button"
                style={{
                  border: "1px solid var(--border-strong)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: 14,
                  fontWeight: 500,
                  padding: "10px 18px",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                }}
              >
                Dışa aktar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
