"use client";

import { useState } from "react";
import peopleData from "@/data/people.json";
import { useCatalog } from "../CatalogProvider";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-32");

export function Sec32Timeline() {
  const { pushToast } = useCatalog();
  const [commentDraft, setCommentDraft] = useState("");

  const handlePost = () => {
    setCommentDraft("");
    pushToast("success");
  };

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div className="kit-card">
          <div className="kit-timeline">
            {peopleData.timelineItems.map((item) => (
              <div key={item.title} className="kit-timeline__item">
                <div className="kit-timeline__rail">
                  <span className="kit-timeline__dot" />
                  <span className="kit-timeline__line" />
                </div>
                <div style={{ paddingBottom: 16, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 2 }}>{item.body}</div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--fg-disabled)",
                      marginTop: 4,
                    }}
                  >
                    {item.when}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="kit-card">
          {peopleData.comments.map((comment) => (
            <div key={comment.when + comment.name} style={{ display: "flex", gap: 10, minWidth: 0 }}>
              <span className="kit-avatar">{comment.initials}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{comment.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-disabled)" }}>
                    {comment.when}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>
                  {comment.body}
                </p>
              </div>
            </div>
          ))}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              marginTop: 8,
            }}
          >
            Yorum
            <textarea
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Bir not bırak…"
              style={{ minHeight: 72, resize: "vertical" }}
            />
          </label>
          <button
            type="button"
            className="kit-btn kit-btn--primary"
            style={{ alignSelf: "flex-start" }}
            onClick={handlePost}
          >
            Gönder
          </button>
        </div>
      </div>
    </SectionFrame>
  );
}
