"use client";

import { Grid } from "@/components/kit";
import copyData from "@/data/copy.json";
import peopleData from "@/data/people.json";
import { cx } from "@/lib/cx";
import { useState, type CSSProperties } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-48");

type SwatchId = keyof typeof copyData.ringMap;

export function Sec48Inbox() {
  const [inboxKey, setInboxKey] = useState("0");
  const [swatch, setSwatch] = useState<SwatchId>("accent");

  const ring = copyData.ringMap[swatch];

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={2}>
        <div className="kit-inbox">
          {peopleData.inboxRows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={cx("kit-inbox__row", inboxKey === row.id && "kit-inbox__row--on")}
              onClick={() => setInboxKey(row.id)}
            >
              <span className="kit-avatar">{row.initials}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 500 }}>{row.title}</span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--fg-subtle)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.body}
                </span>
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-disabled)" }}>
                {row.when}
              </span>
            </button>
          ))}
        </div>
        <div className="kit-card kit-card--static kit-matrix">
          <span className="kit-card__label">Planlar</span>
          <table>
            <thead>
              <tr>
                <th>Özellik</th>
                <th>Free</th>
                <th>Pro</th>
                <th>Biz</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Projeler</td>
                <td>3</td>
                <td>50</td>
                <td>∞</td>
              </tr>
              <tr>
                <td>SSO</td>
                <td>—</td>
                <td>—</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Denetim</td>
                <td>—</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="kit-card kit-card--static">
          <span className="kit-card__label">Aksan</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {copyData.swatches.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx("kit-swatch", swatch === item.id && "kit-swatch--on")}
                style={{ background: item.color }}
                aria-label={item.label}
                onClick={() => setSwatch(item.id as SwatchId)}
              />
            ))}
          </div>
          <div
            className="kit-ring"
            style={{ "--ring": ring.pct, "--ring-color": ring.color } as CSSProperties}
          >
            <span>{ring.label}</span>
          </div>
        </div>
      </Grid>
    </SectionFrame>
  );
}
