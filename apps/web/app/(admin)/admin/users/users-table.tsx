"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Avatar,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { UserActions } from "./user-actions";

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

function initialsOf(name: string, email: string): string {
  const source = name.trim() === "" ? email : name;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "?"}${parts.length > 1 ? (parts[1]?.[0] ?? "") : ""}`.toUpperCase();
}

/** Every state an account can be in, loudest first; "Active" only when nothing else applies. */
export function UserStatusBadges({ user }: { user: Pick<AdminUserView, "banned" | "role" | "emailVerified"> }) {
  const t = useTranslations("admin.users");
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {user.banned ? (
        <Badge tone="danger" dot>
          {t("banned")}
        </Badge>
      ) : null}
      {user.role === "superadmin" ? <Badge tone="accent">{t("platformAdmin")}</Badge> : null}
      {user.emailVerified ? null : (
        <Badge tone="warn" dot>
          {t("unverified")}
        </Badge>
      )}
      {!user.banned && user.emailVerified && user.role !== "superadmin" ? (
        <Badge tone="success" dot>
          {t("active")}
        </Badge>
      ) : null}
    </span>
  );
}

export function UsersTable({ rows, currentUserId }: { rows: AdminUserView[]; currentUserId: string }) {
  const locale = useLocale();
  const t = useTranslations("admin.users");
  const tNav = useTranslations("admin.nav");

  return (
    <Table label={t("metaTitle")}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>{tNav("user")}</TableHeaderCell>
          <TableHeaderCell>{tNav("status")}</TableHeaderCell>
          <TableHeaderCell numeric className="hidden md:table-cell">
            {t("workspacesCard")}
          </TableHeaderCell>
          <TableHeaderCell className="hidden sm:table-cell">{tNav("joined")}</TableHeaderCell>
          <TableHeaderCell className="w-px">
            <span className="sr-only">{tNav("actions")}</span>
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Link
                href={`/admin/users/${row.id}`}
                className="flex min-w-0 items-center gap-3 no-underline hover:no-underline"
              >
                <Avatar size="md" tone={row.role === "superadmin" ? "accent" : "neutral"}>
                  {initialsOf(row.name, row.email)}
                </Avatar>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-ink hover:text-accent-ink">
                    {row.name || row.email}
                  </span>
                  <span className="truncate font-mono text-xs text-fg-muted">{row.email}</span>
                </span>
              </Link>
            </TableCell>
            <TableCell>
              <UserStatusBadges user={row} />
            </TableCell>
            <TableCell numeric className="hidden text-fg-muted md:table-cell">
              {formatNumber(row.workspaces, locale)}
            </TableCell>
            <TableCell className="numeric hidden text-[13px] whitespace-nowrap text-fg-muted sm:table-cell">
              {formatDate(row.createdAt, locale)}
            </TableCell>
            <TableCell align="right">
              <UserActions user={row} currentUserId={currentUserId} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
