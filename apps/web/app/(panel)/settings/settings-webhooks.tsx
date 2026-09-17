"use client";

import { Icon } from "@/components/kit/icon";

import { WEBHOOK_EVENTS, type WebhookEvent } from "@short/core";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  Card,
  Chip,
  CopyButton,
  EmptyState,
  Field,
  Input,
  Paywall,
  Switch,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { deleteWebhookAction, replayWebhookAction, testWebhookAction, toggleWebhookAction } from "./actions";
import { DangerButton } from "./settings-dialogs";
import type { RequestConfirm, RunAction, WebhookView } from "./settings-types";

const SIGNATURE_HEADER = "x-short-signature";

type SettingsWebhooksProps = {
  webhookRows: WebhookView[];
  hasFeature: boolean;
  canManage: boolean;
  pending: boolean;
  hookUrl: string;
  hookEvents: WebhookEvent[];
  onHookUrlChange: (value: string) => void;
  onHookEventsChange: (events: WebhookEvent[]) => void;
  onCreateHook: () => void;
  run: RunAction;
  requestConfirm: RequestConfirm;
};

function deliveryTone(status: number | null): "accent" | "danger" | "muted" {
  if (status === null) {
    return "muted";
  }
  return status >= 200 && status < 300 ? "accent" : "danger";
}

export function SettingsWebhooks({
  webhookRows,
  hasFeature,
  canManage,
  pending,
  hookUrl,
  hookEvents,
  onHookUrlChange,
  onHookEventsChange,
  onCreateHook,
  run,
  requestConfirm,
}: SettingsWebhooksProps) {
  const t = useTranslations("settings");

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
            <span className="text-sm text-fg-muted">link.created · link.clicked</span>
            <span className="font-mono text-sm text-fg-muted">{SIGNATURE_HEADER}: sha256=…</span>
          </>
        }
      />
    );
  }

  const allSelected = hookEvents.length === WEBHOOK_EVENTS.length;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card staticHover className="gap-2">
        <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
          {t("verifyingDeliveries")}
        </span>
        <p className="m-0 text-sm leading-relaxed text-fg-muted">{t("verifyingBody")}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-default border border-border bg-surface-subtle px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink">
            {SIGNATURE_HEADER}
          </code>
          <CopyButton value={SIGNATURE_HEADER} />
        </div>
      </Card>

      {canManage ? (
        <Card staticHover className="gap-4">
          <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-fg-subtle uppercase">
            <Icon name="plus" className="text-xs" aria-hidden="true" />
            {t("addEndpoint")}
          </span>

          <Field label={t("endpointUrl")} hint={t("endpointUrlHint")}>
            <Input
              type="url"
              inputMode="url"
              placeholder={t("endpointUrlPlaceholder")}
              value={hookUrl}
              onChange={(event) => onHookUrlChange(event.target.value)}
            />
          </Field>

          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2 p-0 text-sm font-medium">
              <span>{t("eventsToSend")}</span>
            </legend>
            <div className="flex min-w-0 flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((event) => {
                const on = hookEvents.includes(event);
                return (
                  <Chip
                    key={event}
                    active={on}
                    aria-pressed={on}
                    className="font-mono text-xs"
                    onClick={() =>
                      onHookEventsChange(
                        on ? hookEvents.filter((item) => item !== event) : [...hookEvents, event],
                      )
                    }
                  >
                    {event}
                  </Chip>
                );
              })}
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-fg-subtle tabular-nums">
                {t("eventsSelected", { selected: hookEvents.length, total: WEBHOOK_EVENTS.length })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onHookEventsChange(allSelected ? [] : [...WEBHOOK_EVENTS])}
              >
                {allSelected ? t("clearAll") : t("selectAll")}
              </Button>
            </div>
          </fieldset>

          <div className="flex justify-end">
            <Button
              variant="primary"
              disabled={pending || hookUrl.trim() === "" || hookEvents.length === 0}
              onClick={onCreateHook}
            >
              <Icon name="plus" className="text-sm" aria-hidden="true" />
              {pending ? t("adding") : t("addEndpointButton")}
            </Button>
          </div>
        </Card>
      ) : null}

      {webhookRows.length === 0 ? (
        <EmptyState
          icon={<Icon name="bolt" className="text-lg" />}
          eyebrow={t("hooksEmptyEyebrow")}
          title={t("hooksEmptyTitle")}
          description={t("hooksEmptyBody")}
        />
      ) : (
        <div className="flex min-w-0 flex-col gap-3">
          {webhookRows.map((row) => (
            <Card key={row.id} staticHover className="gap-3.5">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="min-w-0 truncate font-mono text-sm text-ink" title={row.url}>
                    {row.url}
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
                    <Badge tone={deliveryTone(row.lastStatus)}>
                      {row.lastStatus === null
                        ? t("noDeliveries")
                        : t("httpStatus", { status: row.lastStatus })}
                    </Badge>
                    <span className="tabular-nums">
                      {row.lastDeliveryAt
                        ? t("lastDelivery", { when: formatDateTime(row.lastDeliveryAt) })
                        : t("nothingSent")}
                    </span>
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <label className="flex shrink-0 items-center gap-2 text-xs text-fg-muted">
                    <Switch
                      checked={row.enabled}
                      disabled={!canManage || pending}
                      aria-label={
                        row.enabled
                          ? t("disableDeliveries", { url: row.url })
                          : t("enableDeliveries", { url: row.url })
                      }
                      onCheckedChange={(enabled) =>
                        run(
                          () => toggleWebhookAction(row.id, enabled),
                          enabled ? t("endpointEnabled") : t("endpointPaused"),
                        )
                      }
                    />
                    <span>{row.enabled ? t("active") : t("paused")}</span>
                  </label>
                  {canManage ? (
                    <DangerButton
                      size="sm"
                      icon
                      aria-label={t("deleteEndpointAria", { url: row.url })}
                      disabled={pending}
                      onClick={() =>
                        requestConfirm({
                          title: t("deleteEndpointTitle"),
                          description: row.url,
                          consequences: [t("deleteStop"), t("deleteSecret")],
                          confirmLabel: t("deleteEndpointConfirm"),
                          onConfirm: () =>
                            run(() => deleteWebhookAction(row.id), t("endpointDeleted")),
                        })
                      }
                    >
                      <Icon name="trash" className="text-sm" aria-hidden="true" />
                    </DangerButton>
                  ) : null}
                </div>
              </div>

              <div className="flex min-w-0 flex-wrap gap-1.5">
                {row.events.map((event) => (
                  <Badge key={event} tone="muted" className="font-mono">
                    {event}
                  </Badge>
                ))}
              </div>

              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => testWebhookAction(row.id), t("pingSent"))}
                  >
                    {t("testPing")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => replayWebhookAction(row.id), t("replayed"))}
                  >
                    {t("replayLast")}
                  </Button>
                </div>
              ) : null}

              {row.deliveries.length > 0 ? (
                <div className="flex min-w-0 flex-col gap-1.5">
                  {row.deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-default border border-border bg-surface-subtle px-3 py-2 text-xs"
                    >
                      <span className="font-mono">{delivery.event}</span>
                      <Badge tone={deliveryTone(delivery.status)}>
                        {delivery.status ?? t("noStatus")}
                      </Badge>
                      <span className="text-fg-subtle">{formatDateTime(delivery.createdAt)}</span>
                      {delivery.error ? (
                        <span className="min-w-0 basis-full font-mono text-danger break-all">
                          {delivery.error}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {row.lastError ? (
                <div className="flex min-w-0 items-start gap-2.5 rounded-default border border-danger bg-danger-surface px-3 py-2.5">
                  <Icon name="warning" className="mt-0.5 text-xs shrink-0 text-danger" aria-hidden="true" />
                  <span className="min-w-0 font-mono text-xs break-all text-fg-muted">
                    {row.lastError}
                  </span>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
