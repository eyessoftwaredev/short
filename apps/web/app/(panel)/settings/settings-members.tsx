"use client";

import { Icon } from "@/components/kit/icon";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { initials } from "@/components/providers/session-provider";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  InfoTip,
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
import { SettingsCard } from "./settings-card";
import { DangerButton } from "./settings-dialogs";
import {
  ROLE_COPY,
  isRoleId,
  type InviteView,
  type MemberView,
  type RequestConfirm,
  type RoleId,
  type RunAction,
} from "./settings-types";

type SettingsMembersProps = {
  currentUserId: string;
  members: MemberView[];
  invites: InviteView[];
  canManage: boolean;
  isOwner: boolean;
  memberLimit: number;
  memberUsed: number;
  pending: boolean;
  run: RunAction;
  requestConfirm: RequestConfirm;
};

function RoleGuide() {
  const t = useTranslations("settings");
  return (
    <InfoTip label={t("rolesHint")}>
      <dl className="m-0 flex min-w-0 flex-col gap-2.5">
        {(["owner", "admin", "member"] as const).map((role) => (
          <div key={role} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-sm font-medium">{t(ROLE_COPY[role].label)}</dt>
            <dd className="m-0 text-xs leading-relaxed text-fg-muted">{t(ROLE_COPY[role].summary)}</dd>
          </div>
        ))}
      </dl>
    </InfoTip>
  );
}

export function SettingsMembers({
  currentUserId,
  members,
  invites,
  canManage,
  isOwner,
  memberLimit,
  memberUsed,
  pending,
  run,
  requestConfirm,
}: SettingsMembersProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleId>("member");

  const seatsFull = memberLimit !== -1 && memberUsed >= memberLimit;

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <SettingsCard
        title={t("inviteHeading")}
        description={
          invites.length > 0 ? t("pendingInvites", { count: invites.length }) : t("membersDescription")
        }
      >
        <QuotaMeter label={t("seats")} used={memberUsed} limit={memberLimit} />
        {canManage ? (
          <div className="flex min-w-0 flex-wrap items-end gap-3">
            <Field label={t("inviteEmail")} className="min-w-56 flex-1">
              <Input
                type="email"
                autoComplete="off"
                placeholder={t("inviteEmailPlaceholder")}
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </Field>
            <div className="flex min-w-40 flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                {t("inviteRole")}
                <RoleGuide />
              </span>
              <Select
                value={inviteRole}
                onChange={(event) => {
                  if (isRoleId(event.target.value)) {
                    setInviteRole(event.target.value);
                  }
                }}
              >
                <option value="member">{t("roleMember")}</option>
                <option value="admin">{t("roleAdmin")}</option>
                {isOwner ? <option value="owner">{t("roleOwner")}</option> : null}
              </Select>
            </div>
            <Button
              variant="primary"
              className="shrink-0"
              disabled={pending || seatsFull || inviteEmail.trim() === ""}
              onClick={() => {
                run(() => inviteMemberAction(inviteEmail, inviteRole), t("inviteSent"));
                setInviteEmail("");
              }}
            >
              <Icon name="envelope" className="text-sm" aria-hidden="true" />
              {t("sendInvite")}
            </Button>
          </div>
        ) : null}
        {seatsFull ? <p className="m-0 text-sm text-warn-ink">{t("seatsFull")}</p> : null}
      </SettingsCard>

      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="m-0 flex items-center gap-2 text-sm font-semibold">
          {t("members")}
          <span className="font-mono text-xs font-normal text-fg-subtle tabular-nums">
            {members.length}
          </span>
        </h3>
        <Table>
          <caption className="sr-only">{t("membersTableCaption")}</caption>
          <TableHead>
            <TableRow>
              <TableHeaderCell scope="col">{t("colMember")}</TableHeaderCell>
              <TableHeaderCell scope="col">
                <span className="inline-flex items-center gap-1.5">
                  {t("colRole")}
                  <RoleGuide />
                </span>
              </TableHeaderCell>
              <TableHeaderCell scope="col">{t("colJoined")}</TableHeaderCell>
              <TableHeaderCell scope="col" className="text-right">
                {t("colActions")}
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((row) => {
              const isSelf = row.userId === currentUserId;
              const removable = canManage && row.role !== "owner" && !isSelf;
              const roleCopy = isRoleId(row.role) ? ROLE_COPY[row.role] : null;

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar aria-hidden="true">{initials(row.name, row.email)}</Avatar>
                      <span className="flex min-w-0 flex-col">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium">{row.name}</span>
                          {isSelf ? <Badge tone="muted">{t("you")}</Badge> : null}
                        </span>
                        <span className="truncate font-mono text-xs text-fg-muted">{row.email}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    {isOwner && !isSelf ? (
                      <Select
                        aria-label={t("roleFor", { email: row.email })}
                        value={row.role}
                        disabled={pending}
                        onChange={(event) =>
                          run(
                            () => updateMemberRoleAction(row.id, event.target.value),
                            t("roleUpdated"),
                          )
                        }
                      >
                        <option value="member">{t("roleMember")}</option>
                        <option value="admin">{t("roleAdmin")}</option>
                        <option value="owner">{t("roleOwner")}</option>
                      </Select>
                    ) : (
                      <Badge tone={row.role === "owner" ? "accent" : "muted"}>
                        {roleCopy ? t(roleCopy.label) : row.role}
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
                          aria-label={t("removeMemberAria", { email: row.email })}
                          disabled={pending}
                          onClick={() =>
                            requestConfirm({
                              title: t("removeMemberTitle", { name: row.name }),
                              description: t("removeMemberBody", { email: row.email }),
                              consequences: [
                                t("removeMemberKeepAssets"),
                                t("removeMemberKeepKeys"),
                                t("removeMemberReinvite"),
                              ],
                              confirmLabel: t("removeMemberConfirm"),
                              onConfirm: () =>
                                run(() => removeMemberAction(row.id), t("memberRemoved")),
                            })
                          }
                        >
                          <Icon name="trash" className="text-sm" aria-hidden="true" />
                        </DangerButton>
                      ) : (
                        <span className="text-xs text-fg-disabled">
                          {isSelf ? "—" : row.role === "owner" ? t("protected") : "—"}
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
          {t("pendingInvitations")}{" "}
          <span className="font-mono text-xs font-normal text-fg-subtle tabular-nums">
            {invites.length}
          </span>
        </h3>
        {invites.length === 0 ? (
          <EmptyState
            icon={<Icon name="envelope" className="text-lg" />}
            eyebrow={t("invitesEmptyEyebrow")}
            title={t("invitesEmptyTitle")}
            description={t("invitesEmptyBody")}
            className="py-10"
          />
        ) : (
          <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
            {invites.map((invite) => {
              const inviteRoleCopy = isRoleId(invite.role) ? ROLE_COPY[invite.role] : null;
              return (
                <li
                  key={invite.id}
                  className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-default border border-dashed border-border bg-surface px-4 py-3"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">{invite.email}</span>
                  <Badge tone="muted">{inviteRoleCopy ? t(inviteRoleCopy.label) : invite.role}</Badge>
                  <span className="shrink-0 text-xs text-fg-subtle tabular-nums">
                    {t("inviteExpires", { date: formatDate(invite.expiresAt) })}
                  </span>
                  {canManage ? (
                    <DangerButton
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        requestConfirm({
                          title: t("cancelInviteTitle"),
                          description: t("cancelInviteBody", { email: invite.email }),
                          confirmLabel: t("cancelInviteConfirm"),
                          onConfirm: () =>
                            run(() => cancelInviteAction(invite.id), t("inviteCancelled")),
                        })
                      }
                    >
                      {tc("cancel")}
                    </DangerButton>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
