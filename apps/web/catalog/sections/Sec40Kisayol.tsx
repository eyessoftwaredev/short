import copyData from "@/data/copy.json";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-40");

export function Sec40Kisayol() {
  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-card">
        {copyData.shortcuts.map((shortcut) => (
          <div
            key={shortcut.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "8px 0",
            }}
          >
            <span style={{ fontSize: 14 }}>{shortcut.label}</span>
            <span style={{ display: "flex", gap: 4 }}>
              <kbd className="kit-kbd">{shortcut.mod}</kbd>
              <kbd className="kit-kbd">{shortcut.key}</kbd>
            </span>
          </div>
        ))}
      </div>
    </SectionFrame>
  );
}
