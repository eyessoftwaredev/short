"use client";

import { useTranslations } from "next-intl";
import type { DnsRecordCheck } from "@/lib/dns-probe";
import { Icon } from "@/components/kit/icon";
import { Badge, CopyField } from "@/components/ui";
import { relativeRecordName } from "./dns-names";

export type DnsRecordItem = {
  id: string;
  /** `routing` = the CNAME that sends traffic to us; `verify` = the SSL/ownership TXT. */
  purpose: "routing" | "verify";
  type: string;
  name: string;
  value: string;
  check?: DnsRecordCheck;
};

type DnsRecordsProps = {
  records: DnsRecordItem[];
  /** Registrable domain (`acme.com`) — for the "short name" hint. */
  apex: string;
  /** A probe is in flight and nothing has come back yet. */
  checking: boolean;
  /** Cloudflare has not handed out the TXT record yet; show a placeholder for it. */
  verifyPending?: boolean;
};

function RecordStatus({ check, checking }: { check?: DnsRecordCheck; checking: boolean }) {
  const t = useTranslations("domains");
  if (!check) {
    return (
      <Badge tone="neutral" dot>
        {checking ? t("recordChecking") : t("recordUnchecked")}
      </Badge>
    );
  }
  if (check.status === "ok") {
    return (
      <Badge tone="success" dot>
        {t("recordFound")}
      </Badge>
    );
  }
  if (check.status === "mismatch") {
    return (
      <Badge tone="danger" dot>
        {t("recordWrong")}
      </Badge>
    );
  }
  return (
    <Badge tone="warn" dot>
      {t("recordMissing")}
    </Badge>
  );
}

/**
 * One block per record with a copy button on every value — people copy these into
 * another tab, so each value must be one click away and impossible to mis-select.
 */
export function DnsRecords({ records, apex, checking, verifyPending = false }: DnsRecordsProps) {
  const t = useTranslations("domains");

  return (
    <ol className="m-0 flex min-w-0 list-none flex-col divide-y divide-border-subtle p-0">
      {records.map((record, index) => {
        const short = relativeRecordName(record.name, apex);
        const mismatch = record.check?.status === "mismatch" ? record.check.found.slice(0, 3) : [];
        return (
          <li key={record.id} className="flex min-w-0 flex-col gap-4 py-5 first:pt-1 last:pb-1">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-fg-muted"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink">
                    {record.purpose === "routing" ? t("recordRouting") : t("recordVerify")}
                  </span>
                  <span className="text-[13px] leading-5 text-fg-muted">
                    {record.purpose === "routing" ? t("recordRoutingDesc") : t("recordVerifyDesc")}
                  </span>
                </span>
              </div>
              <RecordStatus check={record.check} checking={checking} />
            </div>

            <div className="grid min-w-0 gap-3 lg:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm leading-5 font-medium text-ink">{t("recordType")}</span>
                <span className="flex h-9.5 items-center">
                  <Badge tone="neutral" className="font-mono">
                    {record.type}
                  </Badge>
                </span>
              </div>
              <CopyField
                label={t("recordName")}
                info={t("recordNameInfo")}
                value={record.name}
                hint={short !== record.name ? t("recordNameHint", { apex, short }) : undefined}
              />
              <CopyField label={t("recordValue")} value={record.value} />
            </div>

            {mismatch.length > 0 ? (
              <p className="m-0 flex items-start gap-2 text-[13px] leading-5 text-danger">
                <Icon name="circle-xmark" className="mt-0.5 shrink-0 text-xs" />
                <span className="min-w-0 break-words">
                  {t("recordWrongHint", { found: mismatch.join(", ") })}
                </span>
              </p>
            ) : null}
          </li>
        );
      })}

      {verifyPending ? (
        <li className="flex min-w-0 items-start gap-3 py-5 last:pb-1">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-fg-muted"
            aria-hidden="true"
          >
            {records.length + 1}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium text-ink">{t("recordVerify")}</span>
            <span className="flex items-center gap-1.5 text-[13px] text-fg-muted">
              <Icon name="spinner" className="text-xs" />
              {t("verifyRecordPending")}
            </span>
          </span>
        </li>
      ) : null}
    </ol>
  );
}
