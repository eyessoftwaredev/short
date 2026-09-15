import type { ReactNode } from "react";
import { cn } from "@/lib/cx";

export type TimelineItem = {
  id: string;
  title: ReactNode;
  body?: ReactNode;
  when: ReactNode;
  /** Highlights the entry, e.g. a destructive or security-relevant action. */
  tone?: "accent" | "warn" | "danger" | "muted";
};

const dotTones: Record<NonNullable<TimelineItem["tone"]>, string> = {
  accent: "bg-accent",
  warn: "bg-warn",
  danger: "bg-danger",
  muted: "bg-border-strong",
};

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("m-0 flex min-w-0 list-none flex-col p-0", className)}>
      {items.map((item, index) => (
        <li key={item.id} className="flex min-w-0 gap-3">
          <span className="flex flex-col items-center" aria-hidden="true">
            <span
              className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dotTones[item.tone ?? "accent"])}
            />
            {index < items.length - 1 ? <span className="min-h-5 w-px flex-1 bg-border" /> : null}
          </span>
          <span className="min-w-0 pb-4">
            <span className="block text-sm font-medium">{item.title}</span>
            {item.body ? (
              <span className="mt-0.5 block text-sm text-fg-muted">{item.body}</span>
            ) : null}
            <span className="mt-1 block font-mono text-xs text-fg-disabled">{item.when}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
