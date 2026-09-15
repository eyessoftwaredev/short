"use client";

import { useTheme } from "@/components/providers/theme-provider";
import catalogMeta from "@/data/catalog.json";
import { CatalogProvider } from "./CatalogProvider";
import { CatalogModals } from "./CatalogModals";
import { PalettePicker } from "./PalettePicker";
import { catalogSections } from "./sections";
import { ToastStack } from "./ToastStack";

function CatalogContent() {
  const { dark, toggleTheme } = useTheme();

  return (
    <>
      <nav className="kit-toc" aria-label="Catalog">
        <div className="kit-toc__bar">
          <a className="kit-toc__brand" href="#top">
            eyesONE
          </a>
          <div className="kit-toc__tools">
            <PalettePicker />
            <button
              type="button"
              className="kit-btn kit-btn--icon"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              <i className={dark ? "fa-solid fa-sun" : "fa-solid fa-moon"} />
            </button>
          </div>
        </div>
        <div className="kit-toc__list">
          {catalogMeta.map((sec) => (
            <a key={sec.id} className="kit-toc__link" href={`#${sec.id}`}>
              {sec.num} {sec.title}
            </a>
          ))}
        </div>
      </nav>

      <div
        id="top"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 32px 120px",
          display: "flex",
          flexDirection: "column",
          gap: 64,
        }}
      >
        <header
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            borderBottom: "1px solid var(--border)",
            paddingBottom: 36,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            eyesONE
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 46,
              lineHeight: 1.06,
              letterSpacing: "-0.025em",
              fontWeight: 600,
              maxWidth: "22ch",
            }}
          >
            eyesONE — B2B arayüz teması
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: "62ch",
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--fg-muted)",
            }}
          >
            Ürün bağımsız katalog. Token kaynağı{" "}
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>styles/kit/</code>. Demo veriler{" "}
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>data/*.json</code>.
          </p>
        </header>

        {catalogSections.map((Section, index) => (
          <Section key={catalogMeta[index]?.id ?? index} />
        ))}
      </div>

      <CatalogModals />
      <ToastStack />
    </>
  );
}

export function CatalogPage() {
  return (
    <CatalogProvider>
      <CatalogContent />
    </CatalogProvider>
  );
}
