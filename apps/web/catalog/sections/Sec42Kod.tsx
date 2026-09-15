"use client";

import { useEffect, useState } from "react";
import copyData from "@/data/copy.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-42");

export function Sec42Kod() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyData.codeSample);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-code">
        <div className="kit-code__bar">
          <span>bash</span>
          <button
            type="button"
            onClick={() => {
              void handleCopy();
            }}
            style={{
              border: "1px solid var(--on-inverse-soft)",
              background: "transparent",
              color: "var(--on-inverse)",
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: "var(--radius-xs)",
              cursor: "pointer",
            }}
          >
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>
        <pre>{`curl -H "Authorization: Bearer $TOKEN" \\
  https://api.acme.com/v1/projects`}</pre>
      </div>
    </SectionFrame>
  );
}
