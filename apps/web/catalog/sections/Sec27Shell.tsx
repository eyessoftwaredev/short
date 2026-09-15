"use client";

import { useMemo, useState } from "react";
import copyData from "@/data/copy.json";
import { AdminShell, Sidebar, Topbar } from "@/components/kit";
import type { SidebarGroup } from "@/components/kit";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-27");

export function Sec27Shell() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("Projeler");

  const groups: SidebarGroup[] = useMemo(
    () =>
      copyData.shellGroups.map((group) => ({
        label: group.label,
        items: group.items.map((item) => ({
          id: item.id,
          label: item.label,
          icon: <i className={item.icon} />,
          count: item.count || undefined,
          active: item.id === activeNav,
          onClick: () => setActiveNav(item.id),
        })),
      })),
    [activeNav],
  );

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-frame">
        <AdminShell
          style={{ minHeight: 420 }}
          sidebar={
            <Sidebar
              collapsed={collapsed}
              onToggle={() => setCollapsed((value) => !value)}
              toggleLabel={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
              brand={
                <>
                  <span className="kit-sidebar__logo" />
                  {!collapsed ? <span className="kit-sidebar__title">Acme</span> : null}
                </>
              }
              groups={groups}
              user={{
                name: "Merve Kaya",
                email: "merve@acme.com",
                initials: "MK",
              }}
            />
          }
          topbar={
            <Topbar
              crumbs={[{ label: "Çalışma alanı" }]}
              current={activeNav}
              searchPlaceholder="Ara…"
              actions={
                <button type="button" className="kit-btn kit-btn--primary">
                  Yeni
                </button>
              }
            />
          }
        >
          <main className="kit-page" style={{ padding: 20 }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--fg-muted)" }}>
              Aktif rota: <strong style={{ color: "var(--ink)" }}>{activeNav}</strong>
            </p>
          </main>
        </AdminShell>
      </div>
    </SectionFrame>
  );
}
