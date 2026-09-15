"use client";

import { Grid } from "@/components/kit";
import opsData from "@/data/ops.json";
import { useState } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-51");

type Matrix = Record<string, Record<string, boolean>>;

export function Sec51Rbac() {
  const [matrix, setMatrix] = useState<Matrix>(opsData.matrix);

  const toggle = (role: string, cap: string) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [cap]: !prev[role]?.[cap],
      },
    }));
  };

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={12}>
        <div className="kit-span-12 kit-card kit-matrix" style={{ minWidth: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Rol</th>
                {opsData.capabilities.map((cap) => (
                  <th key={cap}>{cap}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opsData.roles.map((role) => (
                <tr key={role}>
                  <td>{role}</td>
                  {opsData.capabilities.map((cap) => {
                    const on = Boolean(matrix[role]?.[cap]);
                    return (
                      <td key={cap}>
                        <button
                          type="button"
                          className={on ? "kit-btn kit-btn--sm kit-btn--primary" : "kit-btn kit-btn--sm"}
                          aria-pressed={on}
                          onClick={() => toggle(role, cap)}
                        >
                          {on ? "On" : "Off"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Grid>
    </SectionFrame>
  );
}
