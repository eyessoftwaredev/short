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
import { countryName, titleCase } from "@/lib/stats";

type RecentEventsTableProps = {
  events: RecentEventRow[];
  showLink?: boolean;
};

function typeLabel(
  type: string,
  t: (key: string) => string,
): string {
  if (type === "click" || type === "qr_scan" || type === "bio_view" || type === "bio_click") {
    return t(`type.${type}`);
  }
  return type;
}

export async function RecentEventsTable({ events, showLink = false }: RecentEventsTableProps) {
  const [locale, ts] = await Promise.all([getLocale(), getTranslations("stats")]);
  const unknown = ts("unknown");

  if (events.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<Icon name="arrow-pointer" className="text-sm" />}
        title={ts("nothingRecorded")}
        description={ts("nothingRecordedBody")}
      />
    );
  }

  return (
    <Table stickyHeader density="compact" label={ts("recentEventsTable")} wrapperClassName="bg-surface">
      <TableHead sticky>
        <TableRow>
          <TableHeaderCell className="w-40">{ts("when")}</TableHeaderCell>
          <TableHeaderCell className="w-28">{ts("eventType")}</TableHeaderCell>
          {showLink ? <TableHeaderCell className="w-44">{ts("link")}</TableHeaderCell> : null}
          <TableHeaderCell className="w-48">{ts("location")}</TableHeaderCell>
          <TableHeaderCell className="w-56">{ts("device")}</TableHeaderCell>
          <TableHeaderCell className="w-36">{ts("ip")}</TableHeaderCell>
          <TableHeaderCell>{ts("referrer")}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {events.map((event, index) => {
          const flag = countryFlag(event.country);
          return (
            <TableRow key={`${event.ts}-${event.ip}-${index}`}>
              <TableCell className="numeric font-mono text-xs whitespace-nowrap text-fg-muted">
                {formatDateTime(parseClickhouseDate(event.ts))}
              </TableCell>
              <TableCell className="text-fg-muted">{typeLabel(event.type, ts)}</TableCell>
              {showLink ? (
                <TableCell truncate>
                  {event.linkId ? (
                    <Link
                      href={`/links/${event.linkId}/stats`}
                      className="truncate font-mono text-sm text-ink no-underline hover:text-accent-ink"
                    >
                      <span className="text-fg-subtle">{event.hostname}/</span>
                      <span className="font-medium">{event.slug}</span>
                    </Link>
                  ) : (
                    <span className="font-mono text-sm text-fg-muted">
                      {event.hostname ? `${event.hostname}/` : ""}
                      {event.slug || "—"}
                    </span>
                  )}
                </TableCell>
              ) : null}
              <TableCell>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0 text-center" aria-hidden="true">
                    {flag || "??"}
                  </span>
                  <span className="min-w-0 truncate">
                    {countryName(event.country, locale, unknown)}
                    {event.city ? ` · ${event.city}` : ""}
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <span className="flex min-w-0 items-center gap-2 text-fg-muted">
                  <span className="flex shrink-0 items-center gap-1">
                    {deviceIcon(event.device)}
                    {osIcon(event.os)}
                    {browserIcon(event.browser)}
                  </span>
                  <span className="min-w-0 truncate">
                    {titleCase(event.device, unknown)} · {titleCase(event.os, unknown)} ·{" "}
                    {titleCase(event.browser, unknown)}
                  </span>
                </span>
              </TableCell>
              <TableCell className="font-mono text-xs text-fg-muted">
                {event.ip || "—"}
              </TableCell>
              <TableCell truncate className="text-fg-muted">
                {event.referrerDomain === "" ? ts("direct") : event.referrerDomain}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
