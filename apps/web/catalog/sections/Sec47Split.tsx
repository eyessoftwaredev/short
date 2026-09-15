"use client";

import { useState } from "react";
import copyData from "@/data/copy.json";
import projectsData from "@/data/projects.json";
import { cx } from "@/lib/cx";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-47");

type RteToolId = "bold" | "italic" | "list" | "link";

const previewClassMap: Record<RteToolId, string> = {
  bold: "kit-rte-preview--bold",
  italic: "kit-rte-preview--italic",
  list: "kit-rte-preview--list",
  link: "kit-rte-preview--link",
};

export function Sec47Split() {
  const [rteTool, setRteTool] = useState<RteToolId>("bold");
  const [rteDraft, setRteDraft] = useState(projectsData.rteDefaultDraft);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-split">
        <div className="kit-split__pane">
          <div className="kit-rte-group">
            <div className="kit-rte">
              {copyData.rteTools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className={cx("kit-rte__btn", rteTool === tool.id && "kit-rte__btn--on")}
                  aria-label={tool.label}
                  onClick={() => setRteTool(tool.id as RteToolId)}
                >
                  <i className={tool.icon} />
                </button>
              ))}
            </div>
            <textarea
              className="kit-rte__body"
              value={rteDraft}
              onChange={(event) => setRteDraft(event.target.value)}
              placeholder="Not yaz…"
              style={{ minHeight: 140, resize: "vertical" }}
            />
          </div>
        </div>
        <div className="kit-split__pane">
          <span className="kit-card__label">Önizleme</span>
          <div
            className={previewClassMap[rteTool]}
            style={{ fontSize: 15, lineHeight: 1.6, minWidth: 0 }}
          >
            {rteDraft}
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
