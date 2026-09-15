"use client";

import { Grid, Section } from "@/components/kit";
import opsData from "@/data/ops.json";
import { cx } from "@/lib/cx";
import { useMemo, useState } from "react";
import { SectionFrame } from "../SectionFrame";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-58");

type Message = {
  id: string;
  from: string;
  body: string;
};

export function Sec58Chat() {
  const [popOpen, setPopOpen] = useState(true);
  const [threadId, setThreadId] = useState(opsData.chatThreads[0]?.id ?? "t1");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Record<string, Message[]>>(opsData.chatMessages);

  const threadMessages = useMemo(() => messages[threadId] ?? [], [messages, threadId]);
  const unread = opsData.chatThreads.reduce((sum, thread) => sum + thread.unread, 0);

  const send = () => {
    const body = draft.trim();
    if (!body) {
      return;
    }
    setMessages((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] ?? []), { id: `local-${Date.now()}`, from: "out", body }],
    }));
    setDraft("");
  };

  return (
    <SectionFrame id={meta.id} heading={meta.heading} blurb={meta.blurb}>
      <Grid columns={12}>
        <Section span={4} title="Thread listesi" description="Destek kuyruğu.">
          <div className="kit-chat__list">
            {opsData.chatThreads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                className={cx("kit-chat__list-item", threadId === thread.id && "kit-chat__list-item--on")}
                onClick={() => setThreadId(thread.id)}
              >
                <span style={{ fontWeight: 500 }}>{thread.title}</span>
                <span style={{ fontSize: 12, color: "var(--fg-subtle)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {thread.preview}
                </span>
              </button>
            ))}
          </div>
        </Section>
        <Section span={8} title="Konuşma" description="Assign / resolve yuvaları statik.">
          <div className="kit-chat kit-chat--page">
            <div className="kit-chat__head">
              <strong style={{ flex: 1, minWidth: 0 }}>
                {opsData.chatThreads.find((thread) => thread.id === threadId)?.title ?? "Chat"}
              </strong>
              <button type="button" className="kit-btn kit-btn--sm">
                Ata
              </button>
              <button type="button" className="kit-btn kit-btn--sm">
                Çöz
              </button>
            </div>
            <div className="kit-chat__thread">
              {threadMessages.map((msg) => (
                <div key={msg.id} className={cx("kit-chat__bubble", msg.from === "out" ? "kit-chat__bubble--out" : "kit-chat__bubble--in")}>
                  {msg.body}
                </div>
              ))}
            </div>
            <div className="kit-chat__composer">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Mesaj yaz"
                aria-label="Message"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    send();
                  }
                }}
              />
              <button type="button" className="kit-btn kit-btn--primary" onClick={send}>
                Gönder
              </button>
            </div>
          </div>
        </Section>
      </Grid>

      <div className="kit-chat-stage">
        {popOpen ? (
          <div className="kit-chat kit-chat--pop">
            <div className="kit-chat__head">
              <strong style={{ flex: 1 }}>Destek</strong>
              <button type="button" className="kit-btn kit-btn--icon" aria-label="Close chat" onClick={() => setPopOpen(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="kit-chat__thread">
              {(messages.t1 ?? []).map((msg) => (
                <div key={msg.id} className={cx("kit-chat__bubble", msg.from === "out" ? "kit-chat__bubble--out" : "kit-chat__bubble--in")}>
                  {msg.body}
                </div>
              ))}
            </div>
            <div className="kit-chat__composer">
              <input placeholder="Kısa yanıt" aria-label="Pop message" readOnly />
              <button type="button" className="kit-btn kit-btn--primary">
                Gönder
              </button>
            </div>
          </div>
        ) : null}
        <button type="button" className="kit-btn kit-btn--primary kit-chat__launch" onClick={() => setPopOpen((prev) => !prev)}>
          <i className="fa-solid fa-comment" />
          {unread > 0 && !popOpen ? <span className="kit-chat__badge">{unread}</span> : null}
        </button>
      </div>
    </SectionFrame>
  );
}
