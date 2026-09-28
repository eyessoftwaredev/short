"use client";

import { Icon } from "@/components/kit/icon";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@short/core";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  CopyField,
  Disclosure,
  EmptyState,
  InfoTip,
  Input,
  Paywall,
  SectionCard,
  SettingsRow,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  toast,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { formatDateTime } from "@/lib/format";
import {
  createWebhookAction,
  deleteWebhookAction,
  replayWebhookAction,
  testWebhookAction,
  toggleWebhookAction,
  type WebhookAttemptResult,
} from "./actions";
import { SecretModal, useSettingsAction, useSettingsConfirm } from "./settings-dialogs";
import type { WebhookView } from "./settings-types";

const SIGNATURE_HEADER = "x-short-signature";

type SettingsWebhooksProps = {
  webhookRows: WebhookView[];
  hasFeature: boolean;
  canManage: boolean;
};

function statusTone(status: number | null): "success" | "danger" | "muted" {
  if (status === null) {
    return "muted";
  }
  return status >= 200 && status < 300 ? "success" : "danger";
}

/** next-intl treats dots as nesting, so `link.created` is looked up as `link_created`. */
function eventKey(event: string): string {
  return event.replace(/\./g, "_");
}

export function SettingsWebhooks({ webhookRows, hasFeature, canManage }: SettingsWebhooksProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const actionMessage = useActionMessage();
  const { requestConfirm, dialog } = useSettingsConfirm();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(["link.created", "link.broken"]);
  const [creating, setCreating] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [issuedSecret, setIssuedSecret] = useState<string | null>(null);

  if (!hasFeature) {
    return (
      <Paywall
        plan={t("paywallPlan")}
        title={t("hooksPaywallTitle")}
        description={t("hooksPaywallBody")}
        actionLabel={t("comparePlans")}
        preview={
          <>
            <span className="font-mono text-sm font-medium">POST https://api.acme.com/hooks</span>
            <span className="text-sm text-fg-muted">link.created · link.clicked · link.broken</span>
            <span className="font-mono text-sm text-fg-muted">{SIGNATURE_HEADER}: t=…,v1=…</span>
          </>
        }
      />
    );
  }

  const allSelected = events.length === WEBHOOK_EVENTS.length;
  const validUrl = /^https?:\/\/\S+$/i.test(url.trim());

  async function createHook(): Promise<void> {
    if (creating || !validUrl || events.length === 0) {
      return;
    }
    setCreating(true);
    setUrlError(null);
    try {
      const result = await createWebhookAction({ url: url.trim(), events, enabled: true });
      if (!result.ok) {
        if (result.fieldErrors?.url?.length) {
          setUrlError(t("webhookUrlPrivate"));
        } else {
          toast.error(actionMessage(result.error));
        }
        return;
      }
      setIssuedSecret(result.data.secret);
      setUrl("");
      router.refresh();
    } catch {
      toast.error(actionMessage("generic"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {canManage ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void createHook();
          }}
        >
          <SectionCard
            id="add-endpoint"
            title={t("addEndpoint")}
            description={t("webhooksDescription")}
            footer={
              <Button
                type="submit"
                variant="primary"
                leadingIcon="plus"
                loading={creating}
                disabled={!validUrl || events.length === 0}
              >
                {t("addEndpointButton")}
              </Button>
            }
          >
            <SettingsRow
              label={t("endpointUrl")}
              description={t("endpointUrlHint")}
              info={t("endpointUrlInfo")}
              htmlFor="webhook-url"
            >
              <Input
                id="webhook-url"
                type="url"
                inputMode="url"
                placeholder={t("endpointUrlPlaceholder")}
                value={url}
                aria-invalid={urlError ? true : undefined}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setUrlError(null);
                }}
              />
              {urlError ? <span className="text-[13px] text-danger">{urlError}</span> : null}
            </SettingsRow>
            <SettingsRow
              layout="stacked"
              label={t("eventsToSend")}
              description={t("eventsSelected", { selected: events.length, total: WEBHOOK_EVENTS.length })}
              info={t("eventsToSendInfo")}
            >
              <ul className="m-0 grid min-w-0 list-none gap-2 p-0 sm:grid-cols-2">
                {WEBHOOK_EVENTS.map((event) => {
                  const on = events.includes(event);
                  return (
                    <li
                      key={event}
                      className="flex min-w-0 items-start gap-3 rounded-default border border-border px-3 py-2.5"
                    >
                      <Switch
                        size="sm"
                        className="mt-0.5"
                        checked={on}
                        aria-label={event}
                        onCheckedChange={(checked) =>
                          setEvents((prev) =>
                            checked ? [...prev, event] : prev.filter((item) => item !== event),
                          )
                        }
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-mono text-[13px] text-ink">{event}</span>
                        <span className="text-[13px] leading-5 text-fg-muted">
                          {t(`webhookEvents.${eventKey(event)}`)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => setEvents(allSelected ? [] : [...WEBHOOK_EVENTS])}
              >
                {allSelected ? t("clearAll") : t("selectAll")}
              </Button>
            </SettingsRow>
          </SectionCard>
        </form>
      ) : (
        <Callout tone="info">{t("webhooksReadOnly")}</Callout>
      )}

      {webhookRows.length === 0 ? (
        <EmptyState
          tone="first-run"
          icon="bolt"
          title={t("hooksEmptyTitle")}
          description={t("hooksEmptyBody")}
        />
      ) : (
        webhookRows.map((row) => (
          <EndpointCard key={row.id} row={row} canManage={canManage} requestConfirm={requestConfirm} />
        ))
      )}

      <Disclosure title={t("verifyingDeliveries")} description={t("verifyingSummary")}>
        <div className="flex min-w-0 flex-col gap-3">
          <p className="m-0 text-sm leading-relaxed text-fg-muted">{t("verifyingBody")}</p>
          <CopyField value={SIGNATURE_HEADER} size="sm" label={t("signatureHeader")} />
          <Button size="sm" variant="ghost" leadingIcon="book" href="/docs/webhooks" className="self-start">
            {t("webhookDocs")}
          </Button>
        </div>
      </Disclosure>

      <SecretModal
        open={issuedSecret !== null}
        kind="signingSecret"
        secret={issuedSecret ?? ""}
        usage={t("signingSecretUsage")}
        onDismiss={() => {
          setIssuedSecret(null);
          toast.success(t("endpointAdded"));
        }}
      />
      {dialog}
    </div>
  );
}

function EndpointCard({
  row,
  canManage,
  requestConfirm,
}: {
  row: WebhookView;
  canManage: boolean;
  requestConfirm: ReturnType<typeof useSettingsConfirm>["requestConfirm"];
}) {
  const locale = useLocale();
  const t = useTranslations("settings");
  const router = useRouter();
  const actionMessage = useActionMessage();
  const { pending, run } = useSettingsAction();
  const [busy, setBusy] = useState<"test" | "replay" | null>(null);
  const healthy = row.lastStatus !== null && row.lastStatus >= 200 && row.lastStatus < 300;

  async function attempt(kind: "test" | "replay"): Promise<void> {
    setBusy(kind);
    try {
      const result = kind === "test" ? await testWebhookAction(row.id) : await replayWebhookAction(row.id);
      if (!result.ok) {
        toast.error(
          result.fieldErrors?.url?.length
            ? t("webhookUrlPrivate")
            : result.error === "not_found"
              ? t("nothingToReplay")
              : actionMessage(result.error),
        );
        return;
      }
      announce(result.data);
      router.refresh();
    } catch {
      toast.error(actionMessage("generic"));
    } finally {
      setBusy(null);
    }
  }

  function announce(outcome: WebhookAttemptResult): void {
    if (outcome.status !== null && outcome.status >= 200 && outcome.status < 300) {
      toast.success(t("deliveryOk", { status: outcome.status }));
    } else if (outcome.status !== null) {
      toast.error(t("deliveryRejected", { status: outcome.status }), outcome.error ?? undefined);
    } else {
      toast.error(t("deliveryFailed"), outcome.error ?? undefined);
    }
  }

  return (
    <Card
      padding="none"
      title={
        <span className="block min-w-0 truncate font-mono text-sm" title={row.url}>
          {row.url}
        </span>
      }
      description={
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={row.enabled ? "success" : "muted"} dot size="sm">
            {row.enabled ? t("active") : t("paused")}
          </Badge>
          <Badge tone={statusTone(row.lastStatus)} size="sm">
            {row.lastStatus === null ? t("noDeliveries") : t("httpStatus", { status: row.lastStatus })}
          </Badge>
          <span className="text-[13px] text-fg-subtle tabular-nums">
            {row.lastDeliveryAt
              ? t("lastDelivery", { when: formatDateTime(row.lastDeliveryAt, locale) })
              : t("nothingSent")}
          </span>
        </span>
      }
      actions={
        <span className="flex items-center gap-2">
          <Switch
            checked={row.enabled}
            disabled={!canManage || pending}
            aria-label={
              row.enabled ? t("disableDeliveries", { url: row.url }) : t("enableDeliveries", { url: row.url })
            }
            onCheckedChange={(enabled) =>
              void run(
                () => toggleWebhookAction(row.id, enabled),
                enabled ? t("endpointEnabled") : t("endpointPaused"),
              )
            }
          />
          <InfoTip label={row.enabled ? t("active") : t("paused")}>{t("endpointToggleInfo")}</InfoTip>
        </span>
      }
    >
      <div className="flex min-w-0 flex-col gap-4 px-5">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {row.events.map((event) => (
            <Badge key={event} tone="neutral" size="sm" className="font-mono">
              {event}
            </Badge>
          ))}
        </div>

        {!healthy && row.lastError ? (
          <Callout tone="danger" title={t("lastErrorTitle")}>
            <span className="font-mono text-xs break-all">{row.lastError}</span>
          </Callout>
        ) : null}

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              leadingIcon="bolt"
              loading={busy === "test"}
              disabled={busy !== null}
              onClick={() => void attempt("test")}
            >
              {t("testPing")}
            </Button>
            <Button
              size="sm"
              leadingIcon="rotate-right"
              loading={busy === "replay"}
              disabled={busy !== null || row.deliveries.length === 0}
              title={row.deliveries.length === 0 ? t("nothingToReplay") : undefined}
              onClick={() => void attempt("replay")}
            >
              {t("replayLast")}
            </Button>
            <InfoTip label={t("testPing")}>{t("testReplayInfo")}</InfoTip>
            <Button
              size="sm"
              variant="ghost"
              leadingIcon="trash"
              className="ml-auto text-danger hover:text-danger"
              disabled={pending || busy !== null}
              onClick={() =>
                requestConfirm({
                  title: t("deleteEndpointTitle"),
                  description: row.url,
                  consequences: [t("deleteStop"), t("deleteSecret")],
                  confirmLabel: t("deleteEndpointConfirm"),
                  onConfirm: () => run(() => deleteWebhookAction(row.id), t("endpointDeleted")),
                })
              }
            >
              {t("deleteEndpointConfirm")}
            </Button>
          </div>
        ) : null}
      </div>

      {row.deliveries.length > 0 ? (
        <Table bare density="compact" label={t("recentDeliveries")}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("colEvent")}</TableHeaderCell>
              <TableHeaderCell>{t("colResult")}</TableHeaderCell>
              <TableHeaderCell>{t("colWhen")}</TableHeaderCell>
              <TableHeaderCell>{t("colDetails")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {row.deliveries.map((delivery) => (
              <TableRow key={delivery.id}>
                <TableCell className="font-mono text-xs whitespace-nowrap">{delivery.event}</TableCell>
                <TableCell>
                  <Badge tone={statusTone(delivery.status)} size="sm">
                    {delivery.status ?? t("noStatus")}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-fg-muted tabular-nums">
                  {formatDateTime(delivery.createdAt, locale)}
                </TableCell>
                <TableCell
                  truncate
                  className="font-mono text-xs text-fg-muted"
                  title={delivery.error ?? undefined}
                >
                  {delivery.error ?? <Icon name="check" className="text-xs text-success" />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="m-0 px-5 pb-5 text-[13px] text-fg-subtle">{t("noDeliveriesYet")}</p>
      )}
    </Card>
  );
}
