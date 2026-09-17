"use client";

import { Icon } from "@/components/kit/icon";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  Field,
  Input,
  Paywall,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { revokeApiKeyAction } from "./actions";
import { DangerButton } from "./settings-dialogs";
import type { KeyView, RequestConfirm, RunAction } from "./settings-types";

type SettingsApiProps = {
  apiKeys: KeyView[];
  apiBaseUrl: string;
  apiRateLimit: number;
  hasFeature: boolean;
  canManage: boolean;
  pending: boolean;
  keyName: string;
  onKeyNameChange: (value: string) => void;
  onCreateKey: () => void;
  run: RunAction;
  requestConfirm: RequestConfirm;
};

export function SettingsApi({
  apiKeys,
  apiBaseUrl,
  apiRateLimit,
  hasFeature,
  canManage,
  pending,
  keyName,
  onKeyNameChange,
  onCreateKey,
  run,
  requestConfirm,
}: SettingsApiProps) {
  const t = useTranslations("settings");
  const [revealHelp, setRevealHelp] = useState(false);

  if (!hasFeature) {
    return (
      <Paywall
        plan={t("paywallPlan")}
        title={t("apiPaywallTitle")}
        description={t("apiPaywallBody")}
        actionLabel={t("comparePlans")}
        preview={
          <>
            <span className="font-mono text-sm font-medium">short_live_••••••••••••</span>
            <span className="text-sm text-fg-muted">POST /api/v1/links</span>
            <span className="text-sm text-fg-muted">GET /api/v1/links/:id/stats</span>
            <span className="text-sm text-fg-muted">{t("apiPreviewRate")}</span>
          </>
        }
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card staticHover className="gap-5 bg-surface p-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="m-0 text-base font-semibold tracking-tight">{t("endpoint")}</h3>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-default border border-border bg-surface-subtle px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink">{apiBaseUrl}</code>
          <CopyButton value={apiBaseUrl} />
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
          <span className="tabular-nums">
            {apiRateLimit === -1
              ? t("rateLimitUnlimited")
              : t("rateLimitHour", { count: formatNumber(apiRateLimit) })}
          </span>
          <span aria-hidden="true">·</span>
          <a
            href={`${apiBaseUrl}/openapi.json`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5"
          >
            {t("openapi")}
            <Icon name="external-link" className="text-xs" aria-hidden="true" />
          </a>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            className="border-0 bg-transparent p-0 text-sm text-accent underline-offset-2 hover:underline"
            aria-expanded={revealHelp}
            onClick={() => setRevealHelp((prev) => !prev)}
          >
            {revealHelp ? t("hideExample") : t("showExample")}
          </button>
        </div>

        {revealHelp ? (
          <pre className="m-0 min-w-0 overflow-x-auto rounded-default border border-border bg-surface-subtle px-3.5 py-3 font-mono text-xs leading-relaxed text-fg-muted">
            {`curl ${apiBaseUrl}/links \\
  -H "Authorization: Bearer short_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://acme.com/pricing","slug":"pricing"}'`}
          </pre>
        ) : null}
      </Card>

      {canManage ? (
        <Card staticHover className="gap-5 bg-surface p-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="m-0 text-base font-semibold tracking-tight">{t("createKeyHeading")}</h3>
            <p className="m-0 text-sm text-fg-muted">{t("keyOnceHint")}</p>
          </div>
          <div className="flex min-w-0 flex-wrap items-end gap-3">
            <Field label={t("keyName")} className="min-w-56 flex-1" hint={t("keyNameHint")}>
              <Input
                placeholder={t("keyNamePlaceholder")}
                value={keyName}
                onChange={(event) => onKeyNameChange(event.target.value)}
              />
            </Field>
            <Button
              variant="primary"
              className="shrink-0"
              disabled={pending || keyName.trim() === ""}
              onClick={onCreateKey}
            >
              <Icon name="key" className="text-sm" aria-hidden="true" />
              {pending ? t("creating") : t("createKey")}
            </Button>
          </div>
        </Card>
      ) : null}

      {apiKeys.length === 0 ? (
        <EmptyState
          icon={<Icon name="key" className="text-lg" />}
          eyebrow={t("apiEmptyEyebrow")}
          title={t("apiEmptyTitle")}
          description={t("apiEmptyBody")}
        />
      ) : (
        <Table>
          <caption className="sr-only">{t("apiTableCaption")}</caption>
          <TableHead>
            <TableRow>
              <TableHeaderCell scope="col">{t("colName")}</TableHeaderCell>
              <TableHeaderCell scope="col">{t("colKey")}</TableHeaderCell>
              <TableHeaderCell scope="col" className="text-right">
                {t("colRequests")}
              </TableHeaderCell>
              <TableHeaderCell scope="col">{t("colLastUsed")}</TableHeaderCell>
              <TableHeaderCell scope="col">{t("colCreated")}</TableHeaderCell>
              <TableHeaderCell scope="col" className="text-right">
                {t("colActions")}
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apiKeys.map((row) => {
              const displayName = row.name ?? t("thisKey");
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">
                        {row.name ?? t("unnamedKey")}
                      </span>
                      {row.enabled ? null : <Badge tone="muted">{t("revoked")}</Badge>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <code className="font-mono text-xs whitespace-nowrap text-fg-muted">
                      {row.start ? `${row.start}••••••••` : t("hidden")}
                    </code>
                  </TableCell>
                  <TableCell className="text-right font-mono whitespace-nowrap tabular-nums">
                    {formatNumber(row.requestCount)}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap text-fg-muted tabular-nums">
                    {row.lastRequest ? (
                      formatDateTime(row.lastRequest)
                    ) : (
                      <span className="text-fg-disabled">{t("neverUsed")}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap text-fg-muted tabular-nums">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="flex justify-end">
                      {canManage && row.enabled ? (
                        <DangerButton
                          size="sm"
                          icon
                          aria-label={t("revokeAria", { name: displayName })}
                          disabled={pending}
                          onClick={() =>
                            requestConfirm({
                              title: t("revokeTitle", { name: displayName }),
                              description: t("revokeBody"),
                              consequences: [
                                t("revokeUndo"),
                                t("revokeUsage", { count: formatNumber(row.requestCount) }),
                              ],
                              confirmLabel: t("revokeConfirm"),
                              onConfirm: () =>
                                run(() => revokeApiKeyAction(row.id), t("keyRevoked")),
                            })
                          }
                        >
                          <Icon name="trash" className="text-sm" aria-hidden="true" />
                        </DangerButton>
                      ) : (
                        <span className="text-xs text-fg-disabled">—</span>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
