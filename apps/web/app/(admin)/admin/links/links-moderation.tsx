"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/kit/icon";
import {
  Badge,
  Button,
  ConfirmDialog,
  Field,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  toast,
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
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<AdminLinkView | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function confirmFlag(): void {
    const link = target;
    if (!link) {
      return;
    }
    startTransition(async () => {
      const result = await flagLinkAction(link.id, reason);
      setTarget(null);
      if (!result.ok) {
        toast.error(t("actionFailed"), actionMessage(result.error));
        return;
      }
      setReason("");
      toast.success(t("flaggedToast", { link: `${link.hostname}/${link.slug}` }));
      router.refresh();
    });
  }

  function restore(link: AdminLinkView): void {
    setRestoring(link.id);
    startTransition(async () => {
      const result = await clearLinkFlagAction(link.id);
      setRestoring(null);
      if (!result.ok) {
        toast.error(t("actionFailed"), actionMessage(result.error));
        return;
      }
      toast.success(t("restoredToast", { link: `${link.hostname}/${link.slug}` }));
      router.refresh();
    });
  }

  return (
    <>
      <Table label={t("title")} pending={pending && target === null && restoring === null}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>{t("shortLink")}</TableHeaderCell>
            <TableHeaderCell className="hidden md:table-cell">{tNav("destination")}</TableHeaderCell>
            <TableHeaderCell className="hidden sm:table-cell">{tNav("workspace")}</TableHeaderCell>
            <TableHeaderCell className="hidden lg:table-cell">{tNav("created")}</TableHeaderCell>
            <TableHeaderCell className="w-px">
              <span className="sr-only">{tNav("actions")}</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-mono text-[13px] text-ink">
                    {row.hostname}/{row.slug}
                  </span>
                  {row.flagged ? (
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <Badge tone="danger" dot size="sm">
                        {t("flagged")}
                      </Badge>
                      {row.abuseReason ? (
                        <span className="min-w-0 truncate text-xs text-fg-muted">{row.abuseReason}</span>
                      ) : null}
                    </span>
                  ) : row.disabled ? (
                    <span>
                      <Badge tone="neutral" size="sm">
                        {t("disabled")}
                      </Badge>
                    </span>
                  ) : null}
                  {/* Destination moves under the slug when its column is hidden. */}
                  <span className="truncate font-mono text-xs text-fg-subtle md:hidden">
                    {truncateMiddle(row.destination, 40)}
                  </span>
                </span>
              </TableCell>
              <TableCell className="hidden max-w-xs md:table-cell">
                <a
                  href={row.destination}
                  target="_blank"
                  rel="noreferrer noopener nofollow"
                  title={row.destination}
                  className="inline-flex max-w-full min-w-0 items-center gap-1.5 font-mono text-xs text-fg-muted no-underline hover:text-accent-ink"
                >
                  <span className="truncate">{truncateMiddle(row.destination, 52)}</span>
                  <Icon name="external-link" className="shrink-0 text-[10px]" />
                </a>
              </TableCell>
              <TableCell className="hidden text-[13px] text-fg-muted sm:table-cell">{row.workspaceName}</TableCell>
              <TableCell className="numeric hidden text-[13px] whitespace-nowrap text-fg-muted lg:table-cell">
                {formatDate(row.createdAt)}
              </TableCell>
              <TableCell align="right">
                {row.flagged ? (
                  <Button
                    size="sm"
                    leadingIcon="rotate-right"
                    loading={restoring === row.id}
                    disabled={pending && restoring !== row.id}
                    onClick={() => restore(row)}
                  >
                    {t("restore")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    leadingIcon="flag"
                    disabled={pending}
                    onClick={() => {
                      setReason("");
                      setTarget(row);
                    }}
                  >
                    {t("flag")}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={target !== null}
        title={t("flagTitle", { host: target?.hostname ?? "", slug: target?.slug ?? "" })}
        description={t("flagDesc")}
        confirmLabel={t("flagConfirm")}
        loading={pending && target !== null}
        onConfirm={confirmFlag}
        onClose={() => setTarget(null)}
      >
        <Field label={t("reason")} info={t("reasonInfo")} hint={t("reasonHint")}>
          <Input
            value={reason}
            maxLength={240}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("reasonPlaceholder")}
          />
        </Field>
      </ConfirmDialog>
    </>
  );
}
