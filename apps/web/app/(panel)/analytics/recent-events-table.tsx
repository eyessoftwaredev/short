import type { RecentEventRow } from "@short/analytics";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { Icon } from "@/components/kit/icon";
import { formatDateTime, parseClickhouseDate, truncateMiddle } from "@/lib/format";
import { browserIcon, countryFlag, deviceIcon, osIcon } from "@/lib/stats-icons";
import { browserLabel, clientLabels, countryName, deviceLabel, osLabel } from "@/lib/stats";

type RecentEventsTableProps = {
  events: RecentEventRow[];
  showLink?: boolean;
  /** Inside a `<Card padding="none">`: drops the table frame and the empty state box. */
  bare?: boolean;
};

function typeLabel(
  type: string,
  t: (key: string) => string,
): string {
  // One row is one event: the singular "Link click", not the plural filter-chip label "Clicks".
  if (type === "click" || type === "qr_scan" || type === "bio_view" || type === "bio_click") {
    return t(`eventKind.${type}`);
  }
  return type;
}

export async function RecentEventsTable({ events, showLink = false, bare = false }: RecentEventsTableProps) {
  const [locale, ts] = await Promise.all([getLocale(), getTranslations("stats")]);
  const unknown = ts("unknown");
  const labels = clientLabels(ts);

  if (events.length === 0) {
    return (
      <EmptyState
        size="sm"
        bare={bare}
        icon="arrow-pointer"
        title={ts("nothingRecorded")}
        description={ts("nothingRecordedBody")}
      />
    );
  }

  return (
    <Table stickyHeader bare={bare} density="compact" label={ts("recentEventsTable")}>
      <TableHead sticky>
        <TableRow>
          <TableHeaderCell className="w-32">{ts("when")}</TableHeaderCell>
          <TableHeaderCell className="w-44">{ts("eventType")}</TableHeaderCell>
          {showLink ? <TableHeaderCell className="w-44">{ts("link")}</TableHeaderCell> : null}
          <TableHeaderCell className="w-48">{ts("location")}</TableHeaderCell>
          <TableHeaderCell className="w-56">{ts("device")}</TableHeaderCell>
          <TableHeaderCell className="w-32">{ts("ip")}</TableHeaderCell>
          <TableHeaderCell>{ts("referrer")}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {events.map((event, index) => {
          const flag = countryFlag(event.country);
          return (
            <TableRow key={`${event.ts}-${event.ip}-${index}`}>
              <TableCell className="numeric font-mono text-xs whitespace-nowrap text-fg-muted">
                {formatDateTime(parseClickhouseDate(event.ts), locale)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-fg-muted">{typeLabel(event.type, ts)}</TableCell>
              {showLink ? (
                // Every text column truncates to its header width; the link keeps a floor so
                // it is never squeezed down to a few pixels.
                <TableCell truncate className="min-w-40">
                  {event.linkId ? (
                    <Link
                      href={`/links/${event.linkId}/stats`}
                      className="flex min-w-0 font-mono text-sm text-ink no-underline hover:text-accent-ink"
                    >
                      {/* The host repeats on every row; it gives way before the slug does. */}
                      <span className="min-w-0 truncate text-fg-subtle">{event.hostname}/</span>
                      <span className="max-w-[80%] shrink-0 truncate font-medium">{event.slug}</span>
                    </Link>
                  ) : (
                    <span className="flex min-w-0 font-mono text-sm text-fg-muted">
                      {event.hostname ? (
                        <span className="min-w-0 truncate">{event.hostname}/</span>
                      ) : null}
                      <span className="max-w-[80%] shrink-0 truncate">{event.slug || "—"}</span>
                    </span>
                  )}
                </TableCell>
              ) : null}
              <TableCell truncate>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex w-5 shrink-0 justify-center" aria-hidden="true">
                    {flag || <Icon name="earth" className="text-xs text-fg-subtle" />}
                  </span>
                  <span className="min-w-0 truncate">
                    {countryName(event.country, locale, unknown)}
                    {event.city ? ` · ${event.city}` : ""}
                  </span>
                </span>
              </TableCell>
              <TableCell truncate>
                <span className="flex min-w-0 items-center gap-2 text-fg-muted">
                  <span className="flex shrink-0 items-center gap-1">
                    {deviceIcon(event.device)}
                    {osIcon(event.os)}
                    {browserIcon(event.browser)}
                  </span>
                  <span className="min-w-0 truncate">
                    {deviceLabel(event.device, labels)} · {osLabel(event.os, labels)} ·{" "}
                    {browserLabel(event.browser, labels)}
                  </span>
                </span>
              </TableCell>
              <TableCell className="font-mono text-xs text-fg-muted">
                {event.ip || "—"}
              </TableCell>
              <TableCell truncate className="min-w-28 text-fg-muted">
                {event.referrerDomain === "" ? ts("direct") : event.referrerDomain}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
