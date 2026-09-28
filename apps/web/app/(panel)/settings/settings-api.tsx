"use client";

import { Icon } from "@/components/kit/icon";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  CopyField,
  Disclosure,
  EmptyState,
  Input,
  Paywall,
  SectionCard,
  SettingsRow,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  toast,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { createApiKeyAction, revokeApiKeyAction } from "./actions";
import { SecretModal, useSettingsAction, useSettingsConfirm } from "./settings-dialogs";
import type { KeyView } from "./settings-types";

type SettingsApiProps = {
  apiKeys: KeyView[];
  apiBaseUrl: string;
  apiRateLimit: number;
  hasFeature: boolean;
  canManage: boolean;
};

export function SettingsApi({ apiKeys, apiBaseUrl, apiRateLimit, hasFeature, canManage }: SettingsApiProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const actionMessage = useActionMessage();
  const { pending, run } = useSettingsAction();
  const { requestConfirm, dialog } = useSettingsConfirm();
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const trimmed = keyName.trim();
  const validName = trimmed.length >= 1 && trimmed.length <= 32;

  if (!hasFeature) {
    return (
      <Paywall
        plan={t("paywallPlan")}
        title={t("apiPaywallTitle")}
        description={t("apiPaywallBody")}
        actionLabel={t("comparePlans")}
        preview={
          <>
            <span className="font-mono text-sm font-medium">short_••••••••••••</span>
            <span className="text-sm text-fg-muted">POST /api/v1/links</span>
            <span className="text-sm text-fg-muted">GET /api/v1/links/:id/stats</span>
            <span className="text-sm text-fg-muted">{t("apiPreviewRate")}</span>
          </>
        }
      />
    );
  }

  async function createKey(): Promise<void> {
    if (creating || !validName) {
      return;
    }
    setCreating(true);
    try {
      const result = await createApiKeyAction(keyName);
      if (!result.ok) {
        toast.error(actionMessage(result.error));
        return;
      }
      setIssuedKey(result.data.key);
      setKeyName("");
      router.refresh();
    } catch {
      toast.error(actionMessage("generic"));
    } finally {
      setCreating(false);
    }
  }

  const activeKeys = apiKeys.filter((row) => row.enabled).length;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <SectionCard id="api-endpoint" title={t("endpoint")} description={t("apiDescription")}>
        <SettingsRow label={t("baseUrl")} description={t("baseUrlDesc")} info={t("baseUrlInfo")}>
          <CopyField value={apiBaseUrl} size="sm" />
        </SettingsRow>
        <SettingsRow label={t("rateLimit")} description={t("rateLimitDesc")}>
          <span className="numeric text-sm font-medium text-ink">
            {apiRateLimit === -1
              ? t("rateLimitUnlimited")
              : t("rateLimitHour", { count: formatNumber(apiRateLimit) })}
          </span>
        </SettingsRow>
        <SettingsRow label={t("apiDocs")} description={t("apiDocsDesc")}>
          <span className="flex flex-wrap gap-2">
            <Button size="sm" leadingIcon="book" href="/docs/api">
              {t("apiGuide")}
            </Button>
            <Button size="sm" leadingIcon="file-code" href={`${apiBaseUrl}/openapi.json`} external>
              {t("openapi")}
            </Button>
          </span>
        </SettingsRow>
        <div className="py-4">
          <Disclosure variant="plain" title={t("showExample")} description={t("exampleDesc")}>
            <pre className="m-0 min-w-0 overflow-x-auto rounded-default border border-border bg-surface-subtle px-3.5 py-3 font-mono text-xs leading-relaxed text-fg-muted">
              {`curl ${apiBaseUrl}/links \\
  -H "Authorization: Bearer short_…" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://acme.com/pricing","slug":"pricing"}'`}
            </pre>
          </Disclosure>
        </div>
      </SectionCard>

      {canManage ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void createKey();
          }}
        >
          <SectionCard
            id="create-key"
            title={t("createKeyHeading")}
            description={t("keyOnceHint")}
            footer={
              <Button
                type="submit"
                variant="primary"
                leadingIcon="key"
                loading={creating}
                disabled={!validName}
              >
                {t("createKey")}
              </Button>
            }
          >
            <SettingsRow
              label={t("keyName")}
              description={t("keyNameHint")}
              info={t("keyNameInfo")}
              htmlFor="api-key-name"
            >
              <Input
                id="api-key-name"
                placeholder={t("keyNamePlaceholder")}
                value={keyName}
                maxLength={32}
                autoComplete="off"
                onChange={(event) => setKeyName(event.target.value)}
              />
            </SettingsRow>
          </SectionCard>
        </form>
      ) : (
        <Callout tone="info">{t("apiReadOnly")}</Callout>
      )}

      <Card
        id="api-keys"
        padding={apiKeys.length === 0 ? "md" : "none"}
        title={
          <span className="inline-flex items-center gap-2">
            {t("apiKeysList")}
            <Badge tone="neutral" size="sm">
              {activeKeys}
            </Badge>
          </span>
        }
        description={t("apiKeysListDesc")}
      >
        {apiKeys.length === 0 ? (
          <EmptyState
            bare
            size="sm"
            tone="first-run"
            icon="key"
            title={t("apiEmptyTitle")}
            description={t("apiEmptyBody")}
          />
        ) : (
          <Table bare label={t("apiTableCaption")}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("colName")}</TableHeaderCell>
                <TableHeaderCell>{t("colKey")}</TableHeaderCell>
                <TableHeaderCell numeric>{t("colRequests")}</TableHeaderCell>
                <TableHeaderCell>{t("colLastUsed")}</TableHeaderCell>
                <TableHeaderCell>{t("colCreated")}</TableHeaderCell>
                <TableHeaderCell align="right">
                  <span className="sr-only">{t("colActions")}</span>
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
                        {row.enabled ? null : (
                          <Badge tone="muted" size="sm">
                            {t("revoked")}
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-xs whitespace-nowrap text-fg-muted">
                        {row.start ? `${row.start}••••••••` : t("hidden")}
                      </code>
                    </TableCell>
                    <TableCell numeric>{formatNumber(row.requestCount)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-fg-muted tabular-nums">
                      {row.lastRequest ? (
                        formatDateTime(row.lastRequest)
                      ) : (
                        <span className="text-fg-subtle">{t("neverUsed")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-fg-muted tabular-nums">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell align="right">
                      {canManage && row.enabled ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon
                          aria-label={t("revokeAria", { name: displayName })}
                          title={t("revokeConfirm")}
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
                              onConfirm: () => run(() => revokeApiKeyAction(row.id), t("keyRevoked")),
                            })
                          }
                        >
                          <Icon name="trash" className="text-sm text-danger" aria-hidden="true" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <SecretModal
        open={issuedKey !== null}
        kind="apiKey"
        secret={issuedKey ?? ""}
        usage={t("apiKeyUsage", { url: apiBaseUrl })}
        onDismiss={() => {
          setIssuedKey(null);
          toast.success(t("keyCreated"));
        }}
      />
      {dialog}
    </div>
  );
}
