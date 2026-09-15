"use client";

import { useState } from "react";
import { ExternalLink, KeyRound, Terminal, Trash2 } from "lucide-react";
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
  const [revealHelp, setRevealHelp] = useState(false);

  if (!hasFeature) {
    return (
      <Paywall
        plan="Business"
        title="Automate Short from your own backend"
        description="Issue scoped keys, create links programmatically and read click totals over the REST API."
        actionLabel="Compare plans"
        preview={
          <>
            <span className="font-mono text-sm font-medium">short_live_••••••••••••</span>
            <span className="text-sm text-fg-muted">POST /api/v1/links</span>
            <span className="text-sm text-fg-muted">GET /api/v1/links/:id/stats</span>
            <span className="text-sm text-fg-muted">1,000 requests / hour</span>
          </>
        }
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card staticHover className="gap-4">
        <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-fg-subtle uppercase">
          <Terminal className="size-3.5" aria-hidden="true" />
          Endpoint
        </span>

        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-default border border-border bg-surface-subtle px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink">{apiBaseUrl}</code>
          <CopyButton value={apiBaseUrl} label="Copy" />
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
          <span className="tabular-nums">
            Rate limit{" "}
            <span className="font-mono text-ink">
              {apiRateLimit === -1 ? "unlimited" : `${formatNumber(apiRateLimit)}/hour`}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <a
            href={`${apiBaseUrl}/openapi.json`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5"
          >
            OpenAPI spec
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            className="border-0 bg-transparent p-0 text-sm text-accent underline-offset-2 hover:underline"
            aria-expanded={revealHelp}
            onClick={() => setRevealHelp((prev) => !prev)}
          >
            {revealHelp ? "Hide example" : "Show example request"}
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
        <Card staticHover className="gap-4">
          <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-fg-subtle uppercase">
            <KeyRound className="size-3.5" aria-hidden="true" />
            Create a key
          </span>
          <div className="flex min-w-0 flex-wrap items-end gap-3">
            <Field
              label="Key name"
              className="min-w-56 flex-1"
              hint="Name it after the system that will use it, so revoking later is obvious."
            >
              <Input
                placeholder="Production server"
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
              <KeyRound className="size-4" aria-hidden="true" />
              {pending ? "Creating…" : "Create key"}
            </Button>
          </div>
          <p className="m-0 text-xs text-fg-subtle">
            The full key is displayed once, immediately after creation, and stored hashed
            afterwards.
          </p>
        </Card>
      ) : null}

      {apiKeys.length === 0 ? (
        <EmptyState
          icon={<KeyRound className="size-5" />}
          eyebrow="API"
          title="No keys yet"
          description="Create a key to call the REST API from your own backend or from a script."
        />
      ) : (
        <Table>
          <caption className="sr-only">API keys issued for this workspace</caption>
          <TableHead>
            <TableRow>
              <TableHeaderCell scope="col">Name</TableHeaderCell>
              <TableHeaderCell scope="col">Key</TableHeaderCell>
              <TableHeaderCell scope="col" className="text-right">
                Requests
              </TableHeaderCell>
              <TableHeaderCell scope="col">Last used</TableHeaderCell>
              <TableHeaderCell scope="col">Created</TableHeaderCell>
              <TableHeaderCell scope="col" className="text-right">
                Actions
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apiKeys.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {row.name ?? "Unnamed key"}
                    </span>
                    {row.enabled ? null : <Badge tone="muted">Revoked</Badge>}
                  </span>
                </TableCell>
                <TableCell>
                  <code className="font-mono text-xs whitespace-nowrap text-fg-muted">
                    {row.start ? `${row.start}••••••••` : "hidden"}
                  </code>
                </TableCell>
                <TableCell className="text-right font-mono whitespace-nowrap tabular-nums">
                  {formatNumber(row.requestCount)}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-fg-muted tabular-nums">
                  {row.lastRequest ? (
                    formatDateTime(row.lastRequest)
                  ) : (
                    <span className="text-fg-disabled">Never used</span>
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
                        aria-label={`Revoke ${row.name ?? "this key"}`}
                        disabled={pending}
                        onClick={() =>
                          requestConfirm({
                            title: `Revoke ${row.name ?? "this key"}?`,
                            description:
                              "Any system still sending this key starts receiving 401 responses immediately.",
                            consequences: [
                              "This cannot be undone — issue a new key to restore access.",
                              `${formatNumber(row.requestCount)} requests have been made with it so far.`,
                            ],
                            confirmLabel: "Revoke key",
                            onConfirm: () =>
                              run(() => revokeApiKeyAction(row.id), "API key revoked."),
                          })
                        }
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </DangerButton>
                    ) : (
                      <span className="text-xs text-fg-disabled">—</span>
                    )}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
