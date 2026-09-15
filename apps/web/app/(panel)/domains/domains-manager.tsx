"use client";

import {
  Globe,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shell/status-badge";
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
};

type DomainsManagerProps = {
  rows: DomainRowView[];
  cnameTarget: string;
  canManage: boolean;
  /** False in self-hosted setups without Cloudflare credentials. */
  cloudflareConfigured: boolean;
};

export function DomainsManager({
  rows,
  cnameTarget,
  canManage,
  cloudflareConfigured,
}: DomainsManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, HostnameHealth>>({});
  const [editing, setEditing] = useState<DomainRowView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function add(): Promise<void> {
    setError(null);
    const result = await addDomainAction(hostname);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.data.health) {
      setHealth((prev) => ({ ...prev, [result.data.id]: result.data.health as HostnameHealth }));
    }
    setHostname("");
    router.refresh();
  }

  async function refresh(id: string): Promise<void> {
    setError(null);
    const result = await refreshDomainAction(id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.data.health) {
      setHealth((prev) => ({ ...prev, [id]: result.data.health as HostnameHealth }));
    }
    router.refresh();
  }

  async function remove(row: DomainRowView): Promise<void> {
    if (!window.confirm(`Remove ${row.hostname}? Links on it will stop resolving.`)) {
      return;
    }
    const result = await removeDomainAction(row.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function resync(): Promise<void> {
    setNotice(null);
    const result = await resyncKvAction();
    setNotice(
      result.ok ? `Pushed ${result.data.count} links to the edge cache.` : result.error,
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {canManage ? (
        <Card staticHover className="gap-4">
          <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
            Connect a domain
          </span>
          <div className="flex flex-wrap items-end gap-3">
            <Field
              label="Hostname"
              className="min-w-64 flex-1"
              hint="Use a dedicated subdomain such as link.acme.com or go.acme.com."
            >
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
              <Plus className="size-4" />
              Add domain
            </Button>
          </div>

          {cloudflareConfigured ? null : (
            <p className="m-0 flex items-center gap-2 text-sm text-fg-muted">
              <TriangleAlert className="size-4 text-warn-ink" />
              Cloudflare credentials are not configured, so certificates will not be issued
              automatically. The domain is still recorded locally.
            </p>
          )}

          {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Globe className="size-5" />}
          eyebrow="Domains"
          title="No custom domains yet"
          description="Short links work on the platform domain right away. Add your own hostname for branded links."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Hostname</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>SSL</TableHeaderCell>
              <TableHeaderCell className="text-right">Links</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm">{row.hostname}</span>
                    {row.isPlatform ? <Badge tone="muted">Platform</Badge> : null}
                    {row.isDefault ? <Badge tone="accent">Default</Badge> : null}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.isPlatform ? "active" : row.status} />
                </TableCell>
                <TableCell className="font-mono text-xs text-fg-muted">
                  {row.isPlatform ? "managed" : row.sslStatus}
                </TableCell>
                <TableCell className="text-right font-mono">{row.linkCount}</TableCell>
                <TableCell>
                  <span className="flex justify-end gap-2">
                    {canManage && !row.isPlatform ? (
                      <>
                        <Button
                          size="sm"
                          icon
                          aria-label="Re-check status"
                          disabled={pending}
                          onClick={() => startTransition(() => void refresh(row.id))}
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          icon
                          aria-label="Domain settings"
                          onClick={() => setEditing(row)}
                        >
                          <Settings2 className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          icon
                          aria-label="Remove domain"
                          disabled={pending}
                          onClick={() => startTransition(() => void remove(row))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" icon aria-label="Domain settings" onClick={() => setEditing(row)}>
                        <Settings2 className="size-4" />
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
                DNS setup · {row.hostname}
              </span>
              <StatusBadge status={row.status} />
            </span>

            {health[row.id]?.message ? (
              <p className="m-0 flex items-center gap-2 text-sm text-danger">
                <TriangleAlert className="size-4" />
                {health[row.id]?.message}
              </p>
            ) : null}

            <p className="m-0 text-sm text-fg-muted">
              Add this record at your DNS provider. The certificate is issued automatically once
              the record propagates.
            </p>

            <div className="flex flex-col gap-2">
              <DnsRow type="CNAME" name={row.hostname} value={cnameTarget} />
              {(health[row.id]?.validation ?? []).map((record) => (
                <DnsRow
                  key={`${record.type}-${record.name}`}
                  type={record.type}
                  name={record.name}
                  value={record.value}
                />
              ))}
            </div>

            <span className="flex items-center gap-2 text-sm text-fg-muted">
              <ShieldCheck className="size-4 text-accent-ink" />
              Checks run on demand — hit refresh after updating DNS.
            </span>
          </Card>
        ))}

      {canManage ? (
        <Card staticHover className="flex-row flex-wrap items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-sm font-medium">Edge cache</span>
            <span className="block text-sm text-fg-muted">
              {notice ?? "Re-push every link in this workspace to the redirect worker's cache."}
            </span>
          </span>
          <Button size="sm" disabled={pending} onClick={() => startTransition(() => void resync())}>
            <RefreshCw className="size-4" />
            Resync
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
    </div>
  );
}

function DnsRow({ type, name, value }: { type: string; name: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-default border border-border bg-surface-subtle px-3.5 py-2.5">
      <Badge tone="muted">{type}</Badge>
      <span className="min-w-0 flex-1 truncate font-mono text-xs">{name}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-accent-ink">{value}</span>
      <CopyButton value={value} label="Copy" />
    </div>
  );
}

type SheetProps = {
  row: DomainRowView | null;
  readOnly: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function DomainSettingsSheet({ row, readOnly, onClose, onSaved }: SheetProps) {
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
      setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <Sheet
      open={row != null}
      onClose={onClose}
      title={row ? `${row.hostname} settings` : "Domain settings"}
      footer={
        readOnly ? null : (
          <>
            <Button size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={saving}
              onClick={() => {
                void save();
              }}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Root destination"
          hint="Where https://hostname/ sends visitors. Leave empty for a 404."
        >
          <Input
            placeholder="https://acme.com"
            value={root}
            disabled={readOnly}
            onChange={(event) => setRoot(event.target.value)}
          />
        </Field>

        <Field
          label="Not-found destination"
          hint="Where unknown or archived slugs go. Leave empty for a 404."
        >
          <Input
            placeholder="https://acme.com/404"
            value={notFound}
            disabled={readOnly}
            onChange={(event) => setNotFound(event.target.value)}
          />
        </Field>

        <Card staticHover className="flex-row items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-sm font-medium">Default for new links</span>
            <span className="block text-sm text-fg-muted">
              Preselected in the link editor for this workspace.
            </span>
          </span>
          <Switch checked={isDefault} disabled={readOnly} onCheckedChange={setIsDefault} />
        </Card>

        {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
      </div>
    </Sheet>
  );
}
