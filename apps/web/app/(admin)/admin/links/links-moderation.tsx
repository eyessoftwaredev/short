"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink, Flag, ShieldOff } from "lucide-react";
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { formatDate, truncateMiddle } from "@/lib/format";
import { clearLinkFlagAction, flagLinkAction } from "./actions";

export type AdminLinkView = {
  id: string;
  slug: string;
  hostname: string;
  destination: string;
  workspaceName: string;
  createdAt: string;
  flagged: boolean;
  abuseReason: string | null;
  disabled: boolean;
};

export function LinksModeration({ rows }: { rows: AdminLinkView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<AdminLinkView | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirmFlag(): void {
    const link = target;
    if (!link) {
      return;
    }
    setTarget(null);
    setError(null);
    startTransition(async () => {
      const result = await flagLinkAction(link.id, reason);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReason("");
      router.refresh();
    });
  }

  function restore(link: AdminLinkView): void {
    setError(null);
    startTransition(async () => {
      const result = await clearLinkFlagAction(link.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3" aria-busy={pending}>
      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Short link</TableHeaderCell>
            <TableHeaderCell>Destination</TableHeaderCell>
            <TableHeaderCell>Workspace</TableHeaderCell>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-mono text-sm">
                    {row.hostname}/{row.slug}
                  </span>
                  {row.flagged ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone="danger">Flagged</Badge>
                      {row.abuseReason ? (
                        <span className="truncate text-xs text-fg-muted">{row.abuseReason}</span>
                      ) : null}
                    </span>
                  ) : row.disabled ? (
                    <Badge tone="muted">Disabled</Badge>
                  ) : null}
                </span>
              </TableCell>
              <TableCell>
                <a
                  href={row.destination}
                  target="_blank"
                  rel="noreferrer noopener nofollow"
                  className="inline-flex min-w-0 items-center gap-1.5 text-sm"
                >
                  <span className="truncate">{truncateMiddle(row.destination, 52)}</span>
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
              </TableCell>
              <TableCell className="text-sm text-fg-muted">{row.workspaceName}</TableCell>
              <TableCell className="text-sm text-fg-muted">{formatDate(row.createdAt)}</TableCell>
              <TableCell>
                <span className="flex justify-end gap-2">
                  {row.flagged ? (
                    <Button size="sm" disabled={pending} onClick={() => restore(row)}>
                      <ShieldOff className="size-4" />
                      Restore
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        setReason("");
                        setTarget(row);
                      }}
                    >
                      <Flag className="size-4" />
                      Flag
                    </Button>
                  )}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        open={target !== null}
        title={`Flag ${target?.hostname ?? ""}/${target?.slug ?? ""}`}
        description="The link stops redirecting immediately and the edge cache entry is removed. The workspace keeps the record and its stats."
        onClose={() => setTarget(null)}
        footer={
          <>
            <Button onClick={() => setTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmFlag}>
              Flag and disable
            </Button>
          </>
        }
      >
        <Field label="Reason" hint="Shown in the audit log and to the support team.">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Phishing page reported by Google Safe Browsing"
          />
        </Field>
      </Modal>
    </div>
  );
}
