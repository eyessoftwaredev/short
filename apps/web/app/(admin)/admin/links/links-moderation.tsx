"use client";

import { Icon } from "@/components/kit/icon";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { useActionMessage } from "@/lib/action-message";
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
  const t = useTranslations("admin.links");
  const tNav = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
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
        setError(actionMessage(result.error));
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
        setError(actionMessage(result.error));
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
            <TableHeaderCell>{t("shortLink")}</TableHeaderCell>
            <TableHeaderCell>{tNav("destination")}</TableHeaderCell>
            <TableHeaderCell>{tNav("workspace")}</TableHeaderCell>
            <TableHeaderCell>{tNav("created")}</TableHeaderCell>
            <TableHeaderCell className="text-right">{tNav("actions")}</TableHeaderCell>
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
                      <Badge tone="danger">{t("flagged")}</Badge>
                      {row.abuseReason ? (
                        <span className="truncate text-xs text-fg-muted">{row.abuseReason}</span>
                      ) : null}
                    </span>
                  ) : row.disabled ? (
                    <Badge tone="muted">{t("disabled")}</Badge>
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
                  <Icon name="external-link" className="text-xs shrink-0" />
                </a>
              </TableCell>
              <TableCell className="text-sm text-fg-muted">{row.workspaceName}</TableCell>
              <TableCell className="text-sm text-fg-muted">{formatDate(row.createdAt)}</TableCell>
              <TableCell>
                <span className="flex justify-end gap-2">
                  {row.flagged ? (
                    <Button size="sm" disabled={pending} onClick={() => restore(row)}>
                      <Icon name="ban" className="text-sm" />
                      {tc("restore")}
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
                      <Icon name="flag" className="text-sm" />
                      {t("flag")}
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
        title={t("flagTitle", { host: target?.hostname ?? "", slug: target?.slug ?? "" })}
        description={t("flagDesc")}
        onClose={() => setTarget(null)}
        footer={
          <>
            <Button onClick={() => setTarget(null)}>{tc("cancel")}</Button>
            <Button variant="primary" onClick={confirmFlag}>
              {t("flagConfirm")}
            </Button>
          </>
        }
      >
        <Field label={t("reason")} hint={t("reasonHint")}>
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("reasonPlaceholder")}
          />
        </Field>
      </Modal>
    </div>
  );
}
