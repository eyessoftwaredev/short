"use client";

import { useState } from "react";
import projectsData from "@/data/projects.json";
import { cx } from "@/lib/cx";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-46");

export function Sec46Tree() {
  const [treeOpen, setTreeOpen] = useState(true);
  const [treeGroupOpen, setTreeGroupOpen] = useState(true);
  const [treeLeaf, setTreeLeaf] = useState("Atlas CRM");

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-card kit-card--static kit-tree">
        <button type="button" className="kit-tree__item" onClick={() => setTreeOpen((value) => !value)}>
          <i
            className={treeOpen ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-right"}
            style={{ width: 12, color: "var(--fg-subtle)", fontSize: 11 }}
          />
          <span>Acme</span>
        </button>
        {treeOpen ? (
          <div className="kit-tree__branch">
            <button type="button" className="kit-tree__item" onClick={() => setTreeGroupOpen((value) => !value)}>
              <i
                className={treeGroupOpen ? "fa-solid fa-chevron-down" : "fa-solid fa-chevron-right"}
                style={{ width: 12, color: "var(--fg-subtle)", fontSize: 11 }}
              />
              <span>Ürün</span>
            </button>
            {treeGroupOpen ? (
              <div className="kit-tree__branch">
                {projectsData.treeLeaves.map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={cx("kit-tree__item", treeLeaf === label && "kit-tree__item--on")}
                    onClick={() => setTreeLeaf(label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className={cx("kit-tree__item", treeLeaf === "Dokümanlar" && "kit-tree__item--on")}
              onClick={() => setTreeLeaf("Dokümanlar")}
            >
              Dokümanlar
            </button>
          </div>
        ) : null}
      </div>
    </SectionFrame>
  );
}
