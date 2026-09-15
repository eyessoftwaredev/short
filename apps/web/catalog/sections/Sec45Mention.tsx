"use client";

import { useMemo, useState } from "react";
import peopleData from "@/data/people.json";
import { cx } from "@/lib/cx";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-45");

export function Sec45Mention() {
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionFocus, setMentionFocus] = useState(true);
  const [mentionPicked, setMentionPicked] = useState(false);

  const mentionOpen = (mentionFocus || mentionQuery.length > 0) && !mentionPicked;

  const mentionPeople = useMemo(() => {
    const query = mentionQuery.replace(/^@/, "").toLowerCase();
    return peopleData.mentions.filter(
      (person) =>
        !query ||
        person.name.toLowerCase().includes(query) ||
        person.handle.toLowerCase().includes(query),
    );
  }, [mentionQuery]);

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <div className="kit-card kit-card--static">
        <div className="kit-mention">
          <label style={{ fontSize: 13, fontWeight: 500 }}>Ata</label>
          <input
            value={mentionQuery}
            onChange={(event) => {
              setMentionQuery(event.target.value);
              setMentionPicked(false);
              setMentionFocus(true);
            }}
            onFocus={() => {
              setMentionFocus(true);
              setMentionPicked(false);
            }}
            placeholder="@ile ara"
          />
          {mentionOpen ? (
            <div className="kit-mention__list">
              {mentionPeople.map((person) => (
                <button
                  key={person.handle}
                  type="button"
                  className={cx(
                    "kit-tree__item",
                    person.handle === mentionQuery && "kit-tree__item--on",
                  )}
                  onClick={() => {
                    setMentionQuery(person.handle);
                    setMentionPicked(true);
                    setMentionFocus(false);
                  }}
                >
                  <span className="kit-avatar">{person.initials}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{person.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-disabled)" }}>
                    {person.handle}
                  </span>
                </button>
              ))}
              {mentionPeople.length === 0 ? (
                <div style={{ padding: 10, fontSize: 13, color: "var(--fg-subtle)" }}>Kişi yok</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </SectionFrame>
  );
}
