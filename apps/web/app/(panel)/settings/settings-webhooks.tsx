"use client";

import { AlertTriangle, Plus, Trash2, Webhook } from "lucide-react";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@short/core";
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
import { deleteWebhookAction, toggleWebhookAction } from "./actions";
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
  if (!hasFeature) {
    return (
      <Paywall
        plan="Business"
        title="Push events into your own systems"
        description="Get a signed POST the moment a link is created, edited or clicked — no polling required."
        actionLabel="Compare plans"
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
          Verifying deliveries
        </span>
        <p className="m-0 text-sm leading-relaxed text-fg-muted">
          Every request is signed with HMAC-SHA256 over the raw body. Compare your own digest
          against the header below and reject anything that does not match.
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-default border border-border bg-surface-subtle px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink">
            {SIGNATURE_HEADER}
          </code>
          <CopyButton value={SIGNATURE_HEADER} label="Copy" />
        </div>
      </Card>

      {canManage ? (
        <Card staticHover className="gap-4">
          <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-fg-subtle uppercase">
            <Plus className="size-3.5" aria-hidden="true" />
            Add an endpoint
          </span>

          <Field
            label="Endpoint URL"
            hint="Must accept POST over HTTPS and answer within a few seconds."
          >
            <Input
              type="url"
              inputMode="url"
              placeholder="https://api.acme.com/hooks/short"
              value={hookUrl}
              onChange={(event) => onHookUrlChange(event.target.value)}
            />
          </Field>

          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2 p-0 text-sm font-medium">
              <span>Events to send</span>
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
                {hookEvents.length} of {WEBHOOK_EVENTS.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onHookEventsChange(allSelected ? [] : [...WEBHOOK_EVENTS])}
              >
                {allSelected ? "Clear all" : "Select all"}
              </Button>
            </div>
          </fieldset>

          <div className="flex justify-end">
            <Button
              variant="primary"
              disabled={pending || hookUrl.trim() === "" || hookEvents.length === 0}
              onClick={onCreateHook}
            >
              <Plus className="size-4" aria-hidden="true" />
              {pending ? "Adding…" : "Add endpoint"}
            </Button>
          </div>
        </Card>
      ) : null}

      {webhookRows.length === 0 ? (
        <EmptyState
          icon={<Webhook className="size-5" />}
          eyebrow="Webhooks"
          title="No endpoints yet"
          description="Add an endpoint to receive link and bio page events the moment they happen."
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
                      {row.lastStatus === null ? "No deliveries" : `HTTP ${row.lastStatus}`}
                    </Badge>
                    <span className="tabular-nums">
                      {row.lastDeliveryAt
                        ? `Last delivery ${formatDateTime(row.lastDeliveryAt)}`
                        : "Nothing sent yet"}
                    </span>
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <label className="flex shrink-0 items-center gap-2 text-xs text-fg-muted">
                    <Switch
                      checked={row.enabled}
                      disabled={!canManage || pending}
                      aria-label={`${row.enabled ? "Disable" : "Enable"} deliveries to ${row.url}`}
                      onCheckedChange={(enabled) =>
                        run(
                          () => toggleWebhookAction(row.id, enabled),
                          enabled ? "Endpoint enabled." : "Endpoint paused.",
                        )
                      }
                    />
                    <span>{row.enabled ? "Active" : "Paused"}</span>
                  </label>
                  {canManage ? (
                    <DangerButton
                      size="sm"
                      icon
                      aria-label={`Delete endpoint ${row.url}`}
                      disabled={pending}
                      onClick={() =>
                        requestConfirm({
                          title: "Delete this endpoint?",
                          description: row.url,
                          consequences: [
                            "Deliveries stop immediately and queued retries are dropped.",
                            "The signing secret is destroyed — a new endpoint gets a new one.",
                          ],
                          confirmLabel: "Delete endpoint",
                          onConfirm: () =>
                            run(() => deleteWebhookAction(row.id), "Endpoint deleted."),
                        })
                      }
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
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

              {row.lastError ? (
                <div className="flex min-w-0 items-start gap-2.5 rounded-default border border-danger bg-danger-surface px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden="true" />
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
