"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button, Card, Field, InfoTip, Select, Switch } from "@/components/ui";

export type AnalyticsLinkOption = { id: string; label: string };

type AnalyticsFiltersProps = {
  links: AnalyticsLinkOption[];
  domains: string[];
  link: string | null;
  domain: string | null;
  type: string | null;
  includeBots: boolean;
};

const EVENT_TYPES = ["click", "qr_scan", "bio_view", "bio_click"] as const;

/**
 * Every filter lives in the query string, so a filtered report can be bookmarked or
 * shared with a teammate, and the server component re-queries on each change.
 */
export function AnalyticsFilters({ links, domains, link, domain, type, includeBots }: AnalyticsFiltersProps) {
  const t = useTranslations("stats");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const active = link !== null || domain !== null || type !== null || includeBots;

  function update(patch: Record<string, string | null>): void {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    const query = next.toString();
    startTransition(() => {
      router.replace(query === "" ? pathname : `${pathname}?${query}`, { scroll: false });
    });
  }

  return (
    <Card padding="sm" aria-busy={pending || undefined} className={pending ? "opacity-80" : undefined}>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <Field label={t("filterLink")} info={t("filterLinkInfo")}>
          <Select value={link ?? ""} onChange={(event) => update({ link: event.target.value || null })}>
            <option value="">{t("filterAllLinks")}</option>
            {links.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("filterDomain")} info={t("filterDomainInfo")}>
          <Select value={domain ?? ""} onChange={(event) => update({ domain: event.target.value || null })}>
            <option value="">{t("filterAllDomains")}</option>
            {domains.map((hostname) => (
              <option key={hostname} value={hostname}>
                {hostname}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("filterType")} info={t("filterTypeInfo")}>
          <Select value={type ?? ""} onChange={(event) => update({ type: event.target.value || null })}>
            <option value="">{t("allEvents")}</option>
            {EVENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(`typeLong.${value}`)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 lg:h-9.5 lg:flex-nowrap">
          <span className="flex items-center gap-2">
            <Switch
              checked={includeBots}
              aria-label={t("includeBots")}
              onCheckedChange={(checked) => update({ includeBots: checked ? "1" : null })}
            />
            <span className="text-sm font-medium whitespace-nowrap text-ink">{t("includeBots")}</span>
            <InfoTip label={t("includeBots")}>{t("includeBotsInfo")}</InfoTip>
          </span>
          {active ? (
            <Button
              size="sm"
              variant="ghost"
              leadingIcon="xmark"
              onClick={() => update({ link: null, domain: null, type: null, includeBots: null })}
            >
              {t("clearFilters")}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
