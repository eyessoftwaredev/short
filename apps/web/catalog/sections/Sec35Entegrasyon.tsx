"use client";

import { useState } from "react";
import boardData from "@/data/board.json";
import { Grid } from "@/components/kit";
import { useCatalog } from "../CatalogProvider";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-35");

type IntegrationState = Record<string, boolean>;

export function Sec35Entegrasyon() {
  const { pushToast } = useCatalog();
  const [connected, setConnected] = useState<IntegrationState>({
    slack: true,
    github: false,
    stripe: true,
  });

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={3}>
        {boardData.integrations.map((integration) => {
          const isConnected = connected[integration.id] ?? false;
          const isStripe = integration.id === "stripe";
          const status = isStripe || isConnected ? "Bağlı" : "Kopuk";
          const statusColor = isStripe || isConnected ? "var(--accent-hover)" : "var(--fg-disabled)";
          const action = isStripe ? "Yönet" : isConnected ? "Kes" : "Bağla";

          return (
            <article key={integration.id} className="kit-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{integration.name}</span>
                <span style={{ fontSize: 12, color: statusColor }}>{status}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5 }}>
                {integration.body}
              </p>
              <button
                type="button"
                className="kit-btn"
                onClick={() => {
                  if (isStripe) {
                    pushToast("info");
                    return;
                  }
                  setConnected((prev) => ({ ...prev, [integration.id]: !isConnected }));
                }}
              >
                {action}
              </button>
            </article>
          );
        })}
      </Grid>
    </SectionFrame>
  );
}
