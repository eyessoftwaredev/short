"use client";

import { Grid } from "@/components/kit";
import peopleData from "@/data/people.json";
import { useMemo, useState } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-50");

export function Sec50Users() {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return peopleData.directory.filter((user) => {
      if (!q) {
        return true;
      }
      return `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(q);
    });
  }, [query]);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={12}>
        <div className="kit-span-12 kit-card" style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ad, e-posta, rol"
              aria-label="Search users"
              style={{ maxWidth: 280 }}
            />
            <button type="button" className="kit-btn kit-btn--primary">
              Davet et
            </button>
          </div>
          <div style={{ overflow: "auto" }}>
            <table className="kit-table">
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>Son görülme</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.email}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span>{user.name}</span>
                        <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="kit-badge">{user.role}</span>
                    </td>
                    <td style={{ color: user.suspended ? "var(--danger)" : "var(--accent-ink)" }}>{user.status}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{user.lastSeen}</td>
                    <td>
                      <button type="button" className="kit-btn kit-btn--sm">
                        {user.suspended ? "Aç" : "Askıya al"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Grid>
    </SectionFrame>
  );
}
