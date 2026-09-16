"use client";

import { Icon } from "@/components/kit/icon";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionMessage } from "@/lib/action-message";
import { StatusBadge } from "@/components/shell/status-badge";
import type { DnsProbe, DnsRecordCheck } from "@/lib/dns-probe";
import type { CloudflareConnectionPublic } from "@/lib/customer-cloudflare";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  Field,
  Input,
  Sheet,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import type { HostnameHealth } from "@/lib/cloudflare";
import {
  addDomainAction,
  applyCloudflareDnsAction,
  connectCloudflareAction,
  disconnectCloudflareAction,
  probeDomainDnsAction,
  refreshDomainAction,
  removeDomainAction,
  resyncKvAction,
  updateDomainAction,
} from "./actions";

export type DomainRowView = {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string;
  isPlatform: boolean;
  isDefault: boolean;
  rootDestination: string | null;
  notFoundDestination: string | null;
  linkCount: number;
  lastCheckedAt: string | null;
  validationRecords: { type: "TXT" | "HTTP"; name: string; value: string }[];
};

type DomainsManagerProps = {
  rows: DomainRowView[];
  cnameTarget: string;
  canManage: boolean;
  /** False in self-hosted setups without Cloudflare credentials. */
  cloudflareConfigured: boolean;
  cloudflareAccount: CloudflareConnectionPublic | null;
};

function domainActionError(
  error: string,
  fieldErrors: Record<string, string[]> | undefined,
  host: string,
  t: (key: string, values?: Record<string, string | number>) => string,
  te: (key: string, values?: Record<string, string | number>) => string,
  actionMessage: (code: string | undefined | null) => string,
): string {
  if (error === "domain_taken") {
    return te("domain_taken", { host });
  }
  if (error === "domain_www") {
    return t("noWww");
  }
  if (error === "cloudflare_rejected") {
    return t("cloudflareRejected", { message: fieldErrors?.detail?.[0] ?? "" });
  }
  if (error === "cloudflare_check_failed") {
    return t("cloudflareCheckFailed", { message: fieldErrors?.detail?.[0] ?? "" });
  }
  if (error === "cf_token_invalid") {
    return t("cfTokenInvalid");
  }
  if (error === "cf_no_zone") {
    return t("cfNoZone", { host: fieldErrors?.host?.[0] ?? host });
  }
  if (error === "cf_not_connected") {
    return t("cfNotConnected");
  }
  if (error === "cf_dns_failed") {
    return t("cfDnsFailed", { message: fieldErrors?.detail?.[0] ?? "" });
  }
  return actionMessage(error);
}

export function DomainsManager({
  rows,
  cnameTarget,
  canManage,
  cloudflareConfigured,
  cloudflareAccount,
}: DomainsManagerProps) {
  const router = useRouter();
  const t = useTranslations("domains");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, HostnameHealth>>({});
  const [probes, setProbes] = useState<Record<string, DnsProbe>>({});
  const [editing, setEditing] = useState<DomainRowView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [applyAfterConnect, setApplyAfterConnect] = useState<string | null>(null);

  async function add(): Promise<void> {
    setError(null);
    const result = await addDomainAction(hostname);
    if (!result.ok) {
      setError(domainActionError(result.error, result.fieldErrors, hostname.trim(), t, te, actionMessage));
      return;
    }
    if (result.data.health) {
      setHealth((prev) => ({ ...prev, [result.data.id]: result.data.health as HostnameHealth }));
    }
    setHostname("");
    router.refresh();
  }

  async function refresh(id: string, silent = false): Promise<string | null> {
    setError(null);
    const result = await refreshDomainAction(id);
    if (!result.ok) {
      if (!silent) {
        setError(domainActionError(result.error, result.fieldErrors, "", t, te, actionMessage));
      }
      return null;
    }
    if (result.data.health) {
      setHealth((prev) => ({ ...prev, [id]: result.data.health as HostnameHealth }));
    }
    if (!silent || result.data.status === "active") {
      router.refresh();
    }
    return result.data.status;
  }

  async function applyCloudflare(id: string): Promise<void> {
    setError(null);
    const result = await applyCloudflareDnsAction(id);
    if (!result.ok && result.error === "cf_not_connected") {
      setApplyAfterConnect(id);
      setConnectOpen(true);
      return;
    }
    if (!result.ok) {
      setError(domainActionError(result.error, result.fieldErrors, "", t, te, actionMessage));
      return;
    }
    setNotice(
      result.data.created + result.data.updated > 0
        ? t("cfApplied", { count: result.data.created + result.data.updated, zone: result.data.zone })
        : t("cfAlready", { zone: result.data.zone }),
    );
    const probe = await probeDomainDnsAction(id);
    if (probe.ok) {
      setProbes((prev) => ({ ...prev, [id]: probe.data }));
    }
    await refresh(id, true);
  }

  async function remove(row: DomainRowView): Promise<void> {
    if (!window.confirm(t("removeConfirm", { host: row.hostname }))) {
      return;
    }
    const result = await removeDomainAction(row.id);
    if (!result.ok) {
      setError(domainActionError(result.error, result.fieldErrors, row.hostname, t, te, actionMessage));
      return;
    }
    router.refresh();
  }

  async function resync(): Promise<void> {
    setNotice(null);
    const result = await resyncKvAction();
    setNotice(
      result.ok
        ? t("publishedCount", { count: result.data.count })
        : domainActionError(result.error, result.fieldErrors, "", t, te, actionMessage),
    );
  }

  const watchingIds = rows
    .filter((row) => !row.isPlatform && row.status !== "active" && row.status !== "suspended")
    .map((row) => row.id)
    .join(",");

  useEffect(() => {
    if (watchingIds === "") {
      return undefined;
    }
    const ids = watchingIds.split(",");
    let cancelled = false;

    async function tick(): Promise<void> {
      for (const id of ids) {
        if (cancelled) {
          return;
        }
        const probe = await probeDomainDnsAction(id);
        if (cancelled) {
          return;
        }
        if (probe.ok) {
          setProbes((prev) => ({ ...prev, [id]: probe.data }));
        }
        await refresh(id, true);
      }
    }

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [watchingIds]);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {canManage ? (
        <Card staticHover className="gap-4">
          <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
            {t("connect")}
          </span>
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("domain")} className="min-w-64 flex-1" hint={t("domainHint")}>
              <Input
                placeholder="link.acme.com"
                value={hostname}
                onChange={(event) => setHostname(event.target.value)}
              />
            </Field>
            <Button
              variant="primary"
              disabled={pending || hostname.trim() === ""}
              onClick={() => startTransition(() => void add())}
            >
              <Icon name="plus" className="text-sm" />
              {t("add")}
            </Button>
          </div>

          {cloudflareConfigured ? null : (
            <p className="m-0 flex items-center gap-2 text-sm text-fg-muted">
              <Icon name="warning" className="text-sm text-warn-ink" />
              {t("cloudflareMissing")}
            </p>
          )}

          {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Icon name="globe" className="text-lg" />}
          eyebrow={t("title")}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("hostname")}</TableHeaderCell>
              <TableHeaderCell>{t("status")}</TableHeaderCell>
              <TableHeaderCell>{t("ssl")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("links")}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t("actions")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm">{row.hostname}</span>
                    {row.isPlatform ? <Badge tone="muted">{t("platform")}</Badge> : null}
                    {row.isDefault ? <Badge tone="accent">{t("default")}</Badge> : null}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.isPlatform ? "active" : row.status} />
                </TableCell>
                <TableCell className="font-mono text-xs text-fg-muted">
                  {row.isPlatform ? t("sslManaged") : row.sslStatus}
                </TableCell>
                <TableCell className="text-right font-mono">{row.linkCount}</TableCell>
                <TableCell>
                  <span className="flex justify-end gap-2">
                    {canManage && !row.isPlatform ? (
                      <>
                        <Button
                          size="sm"
                          icon
                          aria-label={t("recheck")}
                          disabled={pending}
                          onClick={() => startTransition(() => void refresh(row.id))}
                        >
                          <Icon name="rotate-right" className="text-sm" />
                        </Button>
                        <Button
                          size="sm"
                          icon
                          aria-label={t("settings")}
                          onClick={() => setEditing(row)}
                        >
                          <Icon name="sliders" className="text-sm" />
                        </Button>
                        <Button
                          size="sm"
                          icon
                          aria-label={t("remove")}
                          disabled={pending}
                          onClick={() => startTransition(() => void remove(row))}
                        >
                          <Icon name="trash" className="text-sm" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" icon aria-label={t("settings")} onClick={() => setEditing(row)}>
                        <Icon name="sliders" className="text-sm" />
                      </Button>
                    )}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {rows
        .filter((row) => !row.isPlatform && row.status !== "active")
        .map((row) => (
          <Card key={`setup-${row.id}`} staticHover className="gap-4">
            <span className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
                {t("dnsSetup", { host: row.hostname })}
              </span>
              <StatusBadge status={row.status} />
            </span>

            {health[row.id]?.message ? (
              <p className="m-0 flex items-center gap-2 text-sm text-danger">
                <Icon name="warning" className="text-sm" />
                {health[row.id]?.message}
              </p>
            ) : null}

            <p className="m-0 text-sm text-fg-muted">{t("dnsHint")}</p>

            <div className="flex flex-col gap-2">
              <DnsRow
                type="CNAME"
                name={row.hostname}
                value={cnameTarget}
                check={probes[row.id]?.records.find((record) => record.type === "CNAME")}
              />
              {(health[row.id]?.validation ?? row.validationRecords).map((record) => (
                <DnsRow
                  key={`${record.type}-${record.name}`}
                  type={record.type}
                  name={record.name}
                  value={record.value}
                  check={probes[row.id]?.records.find(
                    (entry) => entry.type === record.type && entry.name === record.name,
                  )}
                />
              ))}
            </div>

            {probes[row.id]?.ready && row.status !== "active" ? (
              <span className="flex items-center gap-2 text-sm text-accent-ink">
                <Icon name="shield" className="text-sm" />
                {t("dnsSslWaiting")}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm text-fg-muted">
                <Icon name="rotate-right" className="text-sm" />
                {t("dnsWatching")}
              </span>
            )}

            {canManage ? (
              <span className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={pending}
                  onClick={() => startTransition(() => void applyCloudflare(row.id))}
                >
                  <Icon name="cloudflare" className="text-sm" />
                  {t("cfAdd")}
                </Button>
                {cloudflareAccount ? (
                  <button
                    type="button"
                    className="text-xs text-fg-subtle"
                    onClick={() => setConnectOpen(true)}
                  >
                    {t("cfConnected", { name: cloudflareAccount.accountName })}
                  </button>
                ) : null}
              </span>
            ) : null}
          </Card>
        ))}

      {canManage ? (
        <Card staticHover className="flex-row flex-wrap items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-sm font-medium">{t("publishTitle")}</span>
            <span className="block text-sm text-fg-muted">{notice ?? t("publishHint")}</span>
          </span>
          <Button size="sm" disabled={pending} onClick={() => startTransition(() => void resync())}>
            <Icon name="rotate-right" className="text-sm" />
            {t("resync")}
          </Button>
        </Card>
      ) : null}

      <DomainSettingsSheet
        row={editing}
        readOnly={!canManage || (editing?.isPlatform ?? false)}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />

      <CloudflareConnectSheet
        open={connectOpen}
        account={cloudflareAccount}
        onClose={() => {
          setConnectOpen(false);
          setApplyAfterConnect(null);
        }}
        onConnected={() => {
          const id = applyAfterConnect;
          setConnectOpen(false);
          setApplyAfterConnect(null);
          router.refresh();
          if (id) {
            startTransition(() => void applyCloudflare(id));
          }
        }}
        onDisconnected={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

function dnsTone(status: DnsRecordCheck["status"] | undefined): "accent" | "warn" | "danger" | "muted" {
  if (status === "ok") {
    return "accent";
  }
  if (status === "mismatch") {
    return "danger";
  }
  if (status === "waiting") {
    return "warn";
  }
  return "muted";
}

function DnsRow({
  type,
  name,
  value,
  check,
}: {
  type: string;
  name: string;
  value: string;
  check?: DnsRecordCheck;
}) {
  const t = useTranslations("domains");
  const tc = useTranslations("common");
  const label =
    check?.status === "ok"
      ? t("dnsRecordOk")
      : check?.status === "mismatch"
        ? t("dnsRecordMismatch", { found: check.found[0] ?? "—" })
        : check
          ? t("dnsRecordWaiting")
          : null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-default border border-border bg-surface-subtle px-3.5 py-2.5">
      <Badge tone="muted">{type}</Badge>
      <span className="min-w-0 flex-1 truncate font-mono text-xs">{name}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-accent-ink">{value}</span>
      {label ? (
        <Badge tone={dnsTone(check?.status)} dot>
          {label}
        </Badge>
      ) : null}
      <CopyButton value={value} label={tc("copy")} />
    </div>
  );
}

const TOKEN_CREATE_URL =
  "https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22dns%22%2C%22type%22%3A%22edit%22%7D%5D&name=Short.ky";

type ConnectSheetProps = {
  open: boolean;
  account: CloudflareConnectionPublic | null;
  onClose: () => void;
  onConnected: () => void;
  onDisconnected: () => void;
};

function CloudflareConnectSheet({
  open,
  account,
  onClose,
  onConnected,
  onDisconnected,
}: ConnectSheetProps) {
  const t = useTranslations("domains");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function connect(): Promise<void> {
    setSaving(true);
    setError(null);
    const result = await connectCloudflareAction(token);
    setSaving(false);
    if (!result.ok) {
      setError(domainActionError(result.error, result.fieldErrors, "", t, te, actionMessage));
      return;
    }
    setToken("");
    onConnected();
  }

  async function disconnect(): Promise<void> {
    if (!window.confirm(t("cfDisconnectConfirm"))) {
      return;
    }
    setSaving(true);
    const result = await disconnectCloudflareAction();
    setSaving(false);
    if (!result.ok) {
      setError(domainActionError(result.error, result.fieldErrors, "", t, te, actionMessage));
      return;
    }
    onDisconnected();
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("cfConnectTitle")}
      footer={
        <>
          <Button size="sm" onClick={onClose} disabled={saving}>
            {tc("cancel")}
          </Button>
          {account ? (
            <Button size="sm" disabled={saving} onClick={() => void disconnect()}>
              {t("cfDisconnect")}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="primary"
            disabled={saving || token.trim() === ""}
            onClick={() => void connect()}
          >
            <Icon name="cloudflare" className="text-sm" />
            {saving ? t("saving") : t("cfConnect")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-sm text-fg-muted">{t("cfConnectHint")}</p>
        {account ? (
          <p className="m-0 text-sm">
            {t("cfConnected", { name: account.accountName })}
          </p>
        ) : null}
        <Field
          label={t("cfToken")}
          hint={t("cfTokenHint")}
        >
          <Input
            type="password"
            autoComplete="off"
            placeholder={t("cfTokenPlaceholder")}
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </Field>
        <a
          href={TOKEN_CREATE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm text-accent-ink no-underline"
        >
          <Icon name="external-link" className="text-xs" />
          {t("cfTokenCreate")}
        </a>
        {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
      </div>
    </Sheet>
  );
}

type SheetProps = {
  row: DomainRowView | null;
  readOnly: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function DomainSettingsSheet({ row, readOnly, onClose, onSaved }: SheetProps) {
  const t = useTranslations("domains");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const [root, setRoot] = useState("");
  const [notFound, setNotFound] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Reset the local draft when a different domain is opened.
  if (row && loadedFor !== row.id) {
    setLoadedFor(row.id);
    setRoot(row.rootDestination ?? "");
    setNotFound(row.notFoundDestination ?? "");
    setIsDefault(row.isDefault);
    setError(null);
  }

  async function save(): Promise<void> {
    if (!row) {
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateDomainAction(row.id, {
      rootDestination: root,
      notFoundDestination: notFound,
      isDefault,
    });
    setSaving(false);

    if (!result.ok) {
      setError(domainActionError(result.error, result.fieldErrors, row.hostname, t, te, actionMessage));
      return;
    }
    onSaved();
  }

  return (
    <Sheet
      open={row != null}
      onClose={onClose}
      title={row ? t("settingsNamed", { host: row.hostname }) : t("settings")}
      footer={
        readOnly ? null : (
          <>
            <Button size="sm" onClick={onClose} disabled={saving}>
              {tc("cancel")}
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={saving}
              onClick={() => {
                void save();
              }}
            >
              {saving ? t("saving") : tc("save")}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t("rootDestination")} hint={t("rootHint")}>
          <Input
            placeholder="https://acme.com"
            value={root}
            disabled={readOnly}
            onChange={(event) => setRoot(event.target.value)}
          />
        </Field>

        <Field label={t("notFoundDestination")} hint={t("notFoundHint")}>
          <Input
            placeholder="https://acme.com/404"
            value={notFound}
            disabled={readOnly}
            onChange={(event) => setNotFound(event.target.value)}
          />
        </Field>

        <Card staticHover className="flex-row items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-sm font-medium">{t("defaultForNew")}</span>
            <span className="block text-sm text-fg-muted">{t("defaultForNewHint")}</span>
          </span>
          <Switch checked={isDefault} disabled={readOnly} onCheckedChange={setIsDefault} />
        </Card>

        {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
      </div>
    </Sheet>
  );
}
