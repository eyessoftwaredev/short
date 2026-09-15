"use client";

import { Grid } from "@/components/kit";
import peopleData from "@/data/people.json";
import { useState } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-56");

export function Sec56Context() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState(false);
  const person = peopleData.directory[0];

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={12}>
        <div className="kit-span-7 kit-card kit-context" style={{ minWidth: 0 }}>
          <table className="kit-table" onContextMenu={(event) => {
            event.preventDefault();
            const box = event.currentTarget.getBoundingClientRect();
            setMenu({ x: event.clientX - box.left, y: event.clientY - box.top });
          }}>
            <thead>
              <tr>
                <th>Proje</th>
                <th>Sahip</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Q4 onboarding</td>
                <td>{person.name}</td>
              </tr>
              <tr>
                <td>Billing v2</td>
                <td>Ahmet Yılmaz</td>
              </tr>
            </tbody>
          </table>
          {menu ? (
            <div className="kit-context__menu" style={{ left: menu.x, top: menu.y }} role="menu">
              <button type="button" className="kit-context__item" role="menuitem" onClick={() => setMenu(null)}>
                Aç
              </button>
              <button type="button" className="kit-context__item" role="menuitem" onClick={() => setMenu(null)}>
                Kopyala
              </button>
              <button type="button" className="kit-context__item kit-context__item--danger" role="menuitem" onClick={() => setMenu(null)}>
                Sil
              </button>
            </div>
          ) : null}
        </div>
        <div className="kit-span-5 kit-card" style={{ minWidth: 0 }}>
          <div
            className="kit-hovercard"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            <button type="button" className="kit-btn">
              {person.name}
            </button>
            {hover ? (
              <div className="kit-hovercard__panel">
                <strong>{person.name}</strong>
                <div style={{ fontSize: 12, color: "var(--fg-subtle)", marginTop: 4 }}>{person.email}</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>{person.role} · {person.status}</div>
              </div>
            ) : null}
          </div>
        </div>
      </Grid>
    </SectionFrame>
  );
}
