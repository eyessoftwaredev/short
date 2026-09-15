"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreHorizontal, UserCheck } from "lucide-react";
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
  const [pending, startTransition] = useTransition();
  const [banTarget, setBanTarget] = useState<AdminUserView | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>): void {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
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
    const items: DropdownItem[] = [];

    if (row.id !== currentUserId && !row.banned) {
      items.push({
        id: "impersonate",
        label: "Impersonate",
        icon: <UserCheck className="size-4" />,
        onSelect: () =>
          startTransition(async () => {
            const result = await impersonateUserAction(row.id);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            // The session now belongs to the impersonated user, so land in their panel.
            window.location.href = "/dashboard";
          }),
      });
    }

    items.push({
      id: "role",
      label: row.role === "superadmin" ? "Revoke platform admin" : "Make platform admin",
      onSelect: () => run(() => setSuperadminAction(row.id, row.role !== "superadmin")),
    });

    items.push(
      row.banned
        ? { id: "unban", label: "Lift ban", onSelect: () => run(() => unbanUserAction(row.id)) }
        : {
            id: "ban",
            label: "Ban user",
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
            <TableHeaderCell>User</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Workspaces</TableHeaderCell>
            <TableHeaderCell>Joined</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{row.name}</span>
                  <span className="truncate font-mono text-xs text-fg-muted">{row.email}</span>
                </span>
              </TableCell>
              <TableCell>
                <span className="flex flex-wrap items-center gap-2">
                  {row.banned ? <Badge tone="danger">Banned</Badge> : null}
                  {row.role === "superadmin" ? <Badge tone="accent">Platform admin</Badge> : null}
                  {row.emailVerified ? null : <Badge tone="warn">Unverified</Badge>}
                  {!row.banned && row.emailVerified && row.role !== "superadmin" ? (
                    <Badge tone="muted">Active</Badge>
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
                      <Button size="sm" icon aria-label={`Actions for ${row.email}`}>
                        <MoreHorizontal className="size-4" />
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
        title={`Ban ${banTarget?.email ?? ""}`}
        description="The user is signed out immediately and cannot sign in again until the ban is lifted. Their links keep redirecting."
        onClose={() => setBanTarget(null)}
        footer={
          <>
            <Button onClick={() => setBanTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmBan}>
              Ban user
            </Button>
          </>
        }
      >
        <Field label="Reason" hint="Stored on the account and shown in the audit log.">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Phishing destinations"
          />
        </Field>
      </Modal>
    </div>
  );
}
