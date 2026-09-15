"use client";

import { useCallback, useMemo, useState } from "react";
import copyData from "@/data/copy.json";
import { SectionFrame } from "../SectionFrame";
import {
  MONTHS,
  PRESETS,
  WEEK_DAYS,
  buildCalendarGrid,
  dayCount,
  fmtLong,
  styleCalendarDay,
} from "./dateUtils";
import { getSectionMeta } from "./getSectionMeta";

const meta = getSectionMeta("sec-07");

export function Sec07Calendar() {
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(8);
  const [rStart, setRStart] = useState<string | null>("2026-08-15");
  const [rEnd, setREnd] = useState<string | null>("2026-09-13");
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [range, setRange] = useState("Son 30 gün");

  const pickDay = useCallback(
    (date: string) => {
      if (!rStart || (rStart && rEnd)) {
        setRStart(date);
        setREnd(null);
        setRange("Özel");
        setHoverDate(null);
        return;
      }
      if (date < rStart) {
        setRStart(date);
        setREnd(rStart);
        setRange("Özel");
        return;
      }
      setREnd(date);
      setRange("Özel");
    },
    [rStart, rEnd],
  );

  const calendarCells = useMemo(() => {
    return buildCalendarGrid(calYear, calMonth).map((cell) => {
      const styled = styleCalendarDay(cell, rStart, rEnd, hoverDate);
      return {
        ...styled,
        onClick: cell.inMonth && cell.date ? () => pickDay(cell.date as string) : undefined,
        onEnter:
          cell.inMonth && cell.date
            ? () => {
                if (rStart && !rEnd) setHoverDate(cell.date);
              }
            : undefined,
      };
    });
  }, [calYear, calMonth, rStart, rEnd, hoverDate, pickDay]);

  const previewEnd = rEnd || (rStart && hoverDate && hoverDate > rStart ? hoverDate : null);

  const rangeLabel = !rStart
    ? "Aralık seçilmedi"
    : rEnd
      ? `${fmtLong(rStart)} – ${fmtLong(rEnd)} · ${dayCount(rStart, rEnd)} gün`
      : `${fmtLong(rStart)} – …`;

  const rangeStep = !rStart
    ? "Başlangıç gününe tıkla"
    : rEnd
      ? "Yeni bir güne tıklamak aralığı sıfırlar"
      : "Şimdi bitiş gününü seç";

  const rangeHint =
    rStart && rEnd
      ? range === "Özel"
        ? "Özel aralık seçildi"
        : `Hazır aralık: ${range}`
      : rStart
        ? "Bitiş günü bekleniyor — takvimde gez, aralık önizlenir"
        : "Takvimden başlangıç gününü seç";

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
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                setCalMonth((m) => {
                  if (m <= 0) {
                    setCalYear((y) => y - 1);
                    return 11;
                  }
                  return m - 1;
                });
              }}
              className="kit-btn kit-btn--icon kit-btn--sm"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {MONTHS[calMonth]} {calYear}
            </div>
            <button
              type="button"
              onClick={() => {
                setCalMonth((m) => {
                  if (m >= 11) {
                    setCalYear((y) => y + 1);
                    return 0;
                  }
                  return m + 1;
                });
              }}
              className="kit-btn kit-btn--icon kit-btn--sm"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {WEEK_DAYS.map((w) => (
              <div
                key={w}
                style={{
                  textAlign: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--fg-disabled)",
                  padding: "4px 0",
                }}
              >
                {w}
              </div>
            ))}
            {calendarCells.map((c, i) => (
              <button
                key={`${c.label}-${i}`}
                type="button"
                onClick={c.onClick}
                onMouseEnter={c.onEnter}
                disabled={!c.onClick}
                style={{
                  border: `1px solid ${c.border}`,
                  background: c.bg,
                  color: c.color,
                  height: 36,
                  borderRadius: c.radius,
                  cursor: c.cursor,
                  fontSize: 13,
                  fontWeight: c.weight,
                  fontFamily: "var(--font-mono)",
                  transition: "background .15s ease, border-color .15s ease",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{rangeLabel}</span>
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>{rangeStep}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setRStart(null);
                setREnd(null);
                setHoverDate(null);
                setRange("Özel");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                border: "1px solid transparent",
                background: "transparent",
                color: "var(--fg-muted)",
                fontSize: 13,
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
              }}
            >
              <i className="fa-solid fa-xmark" style={{ fontSize: 11 }} />
              Temizle
            </button>
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-subtle)",
              }}
            >
              Hazır aralıklar
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {copyData.ranges.map((label) => {
                const on = label === range;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (label === "Özel") {
                        setRange("Özel");
                        setRStart(null);
                        setREnd(null);
                        setHoverDate(null);
                        return;
                      }
                      const preset = PRESETS[label];
                      if (!preset) return;
                      const parts = preset[0].split("-");
                      setRange(label);
                      setRStart(preset[0]);
                      setREnd(preset[1]);
                      setHoverDate(null);
                      setCalYear(Number(parts[0]));
                      setCalMonth(Number(parts[1]) - 1);
                    }}
                    style={{
                      border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
                      background: on ? "var(--accent-surface)" : "var(--bg)",
                      color: on ? "var(--accent-hover)" : "var(--fg-muted)",
                      fontSize: 13,
                      fontWeight: 500,
                      padding: "8px 12px",
                      borderRadius: "var(--radius)",
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-subtle)",
              }}
            >
              Aralık girişi
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius)",
                  padding: "10px 12px",
                  background: "var(--bg)",
                  minWidth: 140,
                }}
              >
                <i className="fa-solid fa-calendar-days" style={{ fontSize: 12, color: "var(--fg-subtle)" }} />
                {rStart || "gg.aa.yyyy"}
              </div>
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 11, color: "var(--fg-subtle)" }} />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  border: `1px solid ${rStart && !rEnd ? "var(--accent)" : "var(--border-strong)"}`,
                  borderRadius: "var(--radius)",
                  padding: "10px 12px",
                  background: "var(--bg)",
                  minWidth: 140,
                }}
              >
                <i className="fa-solid fa-calendar-days" style={{ fontSize: 12, color: "var(--fg-subtle)" }} />
                {previewEnd || rEnd || "gg.aa.yyyy"}
              </div>
            </div>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--fg-subtle)" }}>
              <i className="fa-solid fa-circle-info" style={{ fontSize: 11 }} />
              {rangeHint}
            </span>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
