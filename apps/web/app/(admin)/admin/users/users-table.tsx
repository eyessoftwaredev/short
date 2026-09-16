"use client";

import { Icon } from "@/components/kit/icon";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Badge,
  Button,
  Dropdown,
  Field,
  Input,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type DropdownItem,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { formatDate } from "@/lib/format";
import {
  banUserAction,
  impersonateUserAction,
  setSuperadminAction,
  unbanUserAction,
} from "./actions";

export type AdminUserView = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  emailVerified: boolean;
  createdAt: string;
  workspaces: number;
};

export function UsersTable({ rows, currentUserId }: { rows: AdminUserView[]; currentUserId: string }) {
  const router = useRouter();
  const t = useTranslations("admin.users");
  const tNav = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [banTarget, setBanTarget] = useState<AdminUserView | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>): void {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(actionMessage(result.error));
        return;
      }
      router.refresh();
    });
  }

  function confirmBan(): void {
    const target = banTarget;
    if (!target) {
      return;
    }
    setBanTarget(null);
    run(() => banUserAction(target.id, reason));
    setReason("");
  }

  function menuFor(row: AdminUserView): DropdownItem[] {
    const items: DropdownItem[] = [
      {
        id: "open",
        label: t("openProfile"),
        icon: <Icon name="user-gear" className="text-sm" />,
        href: `/admin/users/${row.id}`,
      },
    ];

    if (row.id !== currentUserId && !row.banned) {
      items.push({
        id: "impersonate",
        label: t("impersonate"),
        icon: <Icon name="user-check" className="text-sm" />,
        onSelect: () =>
          startTransition(async () => {
            const result = await impersonateUserAction(row.id);
            if (!result.ok) {
              setError(actionMessage(result.error));
              return;
            }
            // The session now belongs to the impersonated user, so land in their panel.
            window.location.href = "/dashboard";
          }),
      });
    }

    items.push({
      id: "role",
      label: row.role === "superadmin" ? t("revokeAdmin") : t("makeAdmin"),
      onSelect: () => run(() => setSuperadminAction(row.id, row.role !== "superadmin")),
    });

    items.push(
      row.banned
        ? { id: "unban", label: t("liftBan"), onSelect: () => run(() => unbanUserAction(row.id)) }
        : {
            id: "ban",
            label: t("banUser"),
            danger: true,
            onSelect: () => {
              setReason("");
              setBanTarget(row);
            },
          },
    );

    return items;
  }

  return (
    <div className="flex min-w-0 flex-col gap-3" aria-busy={pending}>
      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>{tNav("user")}</TableHeaderCell>
            <TableHeaderCell>{tNav("status")}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t("workspacesCard")}</TableHeaderCell>
            <TableHeaderCell>{tNav("joined")}</TableHeaderCell>
            <TableHeaderCell className="text-right">{tNav("actions")}</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link href={`/admin/users/${row.id}`} className="flex min-w-0 flex-col no-underline">
                  <span className="truncate text-sm font-medium text-ink">{row.name}</span>
                  <span className="truncate font-mono text-xs text-fg-muted">{row.email}</span>
                </Link>
              </TableCell>
              <TableCell>
                <span className="flex flex-wrap items-center gap-2">
                  {row.banned ? <Badge tone="danger">{t("banned")}</Badge> : null}
                  {row.role === "superadmin" ? <Badge tone="accent">{t("platformAdmin")}</Badge> : null}
                  {row.emailVerified ? null : <Badge tone="warn">{t("unverified")}</Badge>}
                  {!row.banned && row.emailVerified && row.role !== "superadmin" ? (
                    <Badge tone="muted">{t("active")}</Badge>
                  ) : null}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">{row.workspaces}</TableCell>
              <TableCell className="text-sm text-fg-muted">{formatDate(row.createdAt)}</TableCell>
              <TableCell>
                <span className="flex justify-end">
                  <Dropdown
                    items={menuFor(row)}
                    trigger={
                      <Button size="sm" icon aria-label={t("actionsFor", { email: row.email })}>
                        <Icon name="ellipsis" className="text-sm" />
                      </Button>
                    }
                  />
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        open={banTarget !== null}
        title={t("banTitle", { email: banTarget?.email ?? "" })}
        description={t("banDesc")}
        onClose={() => setBanTarget(null)}
        footer={
          <>
            <Button onClick={() => setBanTarget(null)}>{tc("cancel")}</Button>
            <Button variant="primary" onClick={confirmBan}>
              {t("banUser")}
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
