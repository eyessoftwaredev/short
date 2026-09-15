"use client";

import { MailPlus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { initials } from "@/components/providers/session-provider";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  QuotaMeter,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { cancelInviteAction, inviteMemberAction, removeMemberAction, updateMemberRoleAction } from "./actions";
import { DangerButton } from "./settings-dialogs";
import { ROLE_COPY, type InviteView, type MemberView, type RequestConfirm, type RunAction } from "./settings-types";

type SettingsMembersProps = {
  currentUserId: string;
  members: MemberView[];
  invites: InviteView[];
  canManage: boolean;
  isOwner: boolean;
  memberLimit: number;
  pending: boolean;
  run: RunAction;
  requestConfirm: RequestConfirm;
};

export function SettingsMembers({
  currentUserId,
  members,
  invites,
  canManage,
  isOwner,
  memberLimit,
  pending,
  run,
  requestConfirm,
}: SettingsMembersProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const seatsFull = memberLimit !== -1 && members.length + invites.length >= memberLimit;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid min-w-0 gap-4 *:min-w-0 lg:grid-cols-3">
        <Card staticHover className="gap-4">
          <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">Seats</span>
          <QuotaMeter label="Members" used={members.length} limit={memberLimit} />
          {invites.length > 0 ? (
            <p className="m-0 text-xs text-fg-subtle">
              {invites.length} pending {invites.length === 1 ? "invitation" : "invitations"} also
              count against this limit once accepted.
            </p>
          ) : null}
        </Card>

        <Card staticHover className="gap-3 lg:col-span-2">
          <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-fg-subtle uppercase">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            What each role can do
          </span>
          <dl className="m-0 grid min-w-0 gap-2.5 *:min-w-0 sm:grid-cols-3">
            {(["owner", "admin", "member"] as const).map((role) => (
              <div key={role} className="flex min-w-0 flex-col gap-1">
                <dt>
                  <Badge tone={role === "owner" ? "accent" : "muted"}>{ROLE_COPY[role].label}</Badge>
                </dt>
                <dd className="m-0 text-xs leading-relaxed text-fg-muted">
                  {ROLE_COPY[role].summary}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {canManage ? (
        <Card staticHover className="gap-4">
          <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-fg-subtle uppercase">
            <UserPlus className="size-3.5" aria-hidden="true" />
            Invite a teammate
          </span>
          <div className="flex min-w-0 flex-wrap items-end gap-3">
            <Field label="Email address" className="min-w-56 flex-1">
              <Input
                type="email"
                autoComplete="off"
                placeholder="teammate@acme.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </Field>
            <Field
              label="Role"
              className="min-w-40"
              hint={ROLE_COPY[inviteRole]?.summary}
            >
              <Select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                {isOwner ? <option value="owner">Owner</option> : null}
              </Select>
            </Field>
            <Button
              variant="primary"
              className="shrink-0"
              disabled={pending || seatsFull || inviteEmail.trim() === ""}
              onClick={() => {
                run(() => inviteMemberAction(inviteEmail, inviteRole), "Invitation sent.");
                setInviteEmail("");
              }}
            >
              <MailPlus className="size-4" aria-hidden="true" />
              Send invite
            </Button>
          </div>
          {seatsFull ? (
            <p className="m-0 text-sm text-warn-ink">
              Every seat on this plan is taken. Remove a member or upgrade to invite more.
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="m-0 text-sm font-semibold">
          Members{" "}
          <span className="font-mono text-xs font-normal text-fg-subtle tabular-nums">
            {members.length}
          </span>
        </h3>
        <Table>
          <caption className="sr-only">Workspace members and their roles</caption>
          <TableHead>
            <TableRow>
              <TableHeaderCell scope="col">Member</TableHeaderCell>
              <TableHeaderCell scope="col">Role</TableHeaderCell>
              <TableHeaderCell scope="col">Joined</TableHeaderCell>
              <TableHeaderCell scope="col" className="text-right">
                Actions
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((row) => {
              const isSelf = row.userId === currentUserId;
              const removable = canManage && row.role !== "owner" && !isSelf;

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar aria-hidden="true">{initials(row.name, row.email)}</Avatar>
                      <span className="flex min-w-0 flex-col">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium">{row.name}</span>
                          {isSelf ? <Badge tone="muted">You</Badge> : null}
                        </span>
                        <span className="truncate font-mono text-xs text-fg-muted">
                          {row.email}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    {isOwner && !isSelf ? (
                      <Select
                        aria-label={`Role for ${row.email}`}
                        value={row.role}
                        disabled={pending}
                        onChange={(event) =>
                          run(
                            () => updateMemberRoleAction(row.id, event.target.value),
                            "Role updated.",
                          )
                        }
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </Select>
                    ) : (
                      <Badge tone={row.role === "owner" ? "accent" : "muted"}>
                        {ROLE_COPY[row.role]?.label ?? row.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap text-fg-muted tabular-nums">
                    {formatDate(row.joinedAt)}
                  </TableCell>
                  <TableCell>
                    <span className="flex justify-end">
                      {removable ? (
                        <DangerButton
                          size="sm"
                          icon
                          aria-label={`Remove ${row.email} from the workspace`}
                          disabled={pending}
                          onClick={() =>
                            requestConfirm({
                              title: `Remove ${row.name}?`,
                              description: `${row.email} loses access to this workspace immediately.`,
                              consequences: [
                                "Their links, QR codes and bio pages stay in the workspace.",
                                "Any API keys they created keep working until revoked separately.",
                                "They can be invited back at any time.",
                              ],
                              confirmLabel: "Remove member",
                              onConfirm: () =>
                                run(() => removeMemberAction(row.id), "Member removed."),
                            })
                          }
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </DangerButton>
                      ) : (
                        <span className="text-xs text-fg-disabled">
                          {isSelf ? "—" : row.role === "owner" ? "Protected" : "—"}
                        </span>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="m-0 text-sm font-semibold">
          Pending invitations{" "}
          <span className="font-mono text-xs font-normal text-fg-subtle tabular-nums">
            {invites.length}
          </span>
        </h3>
        {invites.length === 0 ? (
          <EmptyState
            icon={<MailPlus className="size-5" />}
            eyebrow="Invitations"
            title="Nobody is waiting"
            description="Invitations you send appear here until they are accepted or expire."
            className="py-10"
          />
        ) : (
          <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-default border border-dashed border-border px-4 py-3"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-sm">{invite.email}</span>
                <Badge tone="muted">{ROLE_COPY[invite.role]?.label ?? invite.role}</Badge>
                <span className="shrink-0 text-xs text-fg-subtle tabular-nums">
                  Expires {formatDate(invite.expiresAt)}
                </span>
                {canManage ? (
                  <DangerButton
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      requestConfirm({
                        title: "Cancel this invitation?",
                        description: `The link sent to ${invite.email} stops working right away.`,
                        confirmLabel: "Cancel invitation",
                        onConfirm: () =>
                          run(() => cancelInviteAction(invite.id), "Invitation cancelled."),
                      })
                    }
                  >
                    Cancel
                  </DangerButton>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
