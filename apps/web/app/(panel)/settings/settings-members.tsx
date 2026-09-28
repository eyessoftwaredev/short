"use client";

import { Icon } from "@/components/kit/icon";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { initials } from "@/components/providers/session-provider";
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Input,
  InfoTip,
  QuotaMeter,
  SectionCard,
  Select,
  SettingsRow,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import {
  cancelInviteAction,
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
} from "./actions";
import { useSettingsAction, useSettingsConfirm } from "./settings-dialogs";
import { ROLE_COPY, isRoleId, type InviteView, type MemberView, type RoleId } from "./settings-types";

type SettingsMembersProps = {
  currentUserId: string;
  members: MemberView[];
  invites: InviteView[];
  canManage: boolean;
  isOwner: boolean;
  memberLimit: number;
  memberUsed: number;
};

function RoleTip() {
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
}: SettingsMembersProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { pending, run } = useSettingsAction();
  const { requestConfirm, dialog } = useSettingsConfirm();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleId>("member");

  const seatsFull = memberLimit !== -1 && memberUsed >= memberLimit;
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim());

  async function sendInvite(): Promise<void> {
    if (pending || seatsFull || !emailLooksValid) {
      return;
    }
    const email = inviteEmail;
    const ok = await run(
      () => inviteMemberAction(email, inviteRole),
      t("inviteSentTo", { email: email.trim() }),
    );
    if (ok) {
      setInviteEmail("");
    }
  }

  return (
    <>
      {canManage ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendInvite();
          }}
        >
          <SectionCard
            id="invite"
            title={t("inviteHeading")}
            description={t("inviteDescription")}
            actions={
              <QuotaMeter
                label={t("seats")}
                used={memberUsed}
                limit={memberLimit}
                info={t("seatsInfo")}
                compact
                className="w-48"
              />
            }
            footer={
              <Button
                type="submit"
                variant="primary"
                leadingIcon="envelope"
                loading={pending}
                disabled={seatsFull || !emailLooksValid}
              >
                {t("sendInvite")}
              </Button>
            }
          >
            {seatsFull ? (
              <div className="py-5">
                <Callout
                  tone="warn"
                  title={t("seatsFull")}
                  actions={
                    isOwner ? (
                      <Button size="sm" href="/billing" leadingIcon="rocket">
                        {t("comparePlans")}
                      </Button>
                    ) : null
                  }
                >
                  {invites.length > 0 ? t("pendingInvites", { count: invites.length }) : null}
                </Callout>
              </div>
            ) : null}
            <SettingsRow
              label={t("inviteEmail")}
              description={t("inviteEmailDesc")}
              info={t("inviteEmailInfo")}
              htmlFor="invite-email"
            >
              <Input
                id="invite-email"
                type="email"
                autoComplete="off"
                placeholder={t("inviteEmailPlaceholder")}
                value={inviteEmail}
                disabled={seatsFull}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </SettingsRow>
            <SettingsRow
              label={t("inviteRole")}
              description={t(ROLE_COPY[inviteRole].summary)}
              info={t("inviteRoleInfo")}
              htmlFor="invite-role"
            >
              <Select
                id="invite-role"
                value={inviteRole}
                disabled={seatsFull}
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
            </SettingsRow>
          </SectionCard>
        </form>
      ) : (
        <Callout tone="info">{t("membersReadOnly")}</Callout>
      )}

      <Card
        id="members"
        padding="none"
        title={
          <span className="inline-flex items-center gap-2">
            {t("members")}
            <Badge tone="neutral" size="sm">
              {members.length}
            </Badge>
          </span>
        }
        description={t("membersDescription")}
      >
        <Table bare label={t("membersTableCaption")}>
          <TableHead>
            <TableRow>
              <TableHeaderCell scope="col">{t("colMember")}</TableHeaderCell>
              <TableHeaderCell scope="col">
                <span className="inline-flex items-center gap-1.5">
                  {t("colRole")}
                  <RoleTip />
                </span>
              </TableHeaderCell>
              <TableHeaderCell scope="col">{t("colJoined")}</TableHeaderCell>
              <TableHeaderCell scope="col" align="right">
                <span className="sr-only">{t("colActions")}</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((row) => {
              const isSelf = row.userId === currentUserId;
              // Mirrors removeMemberAction: admins remove members, owners also remove admins.
              const removable =
                canManage && row.role !== "owner" && !isSelf && (isOwner || row.role === "member");
              const roleCopy = isRoleId(row.role) ? ROLE_COPY[row.role] : null;

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar aria-hidden="true">{initials(row.name, row.email)}</Avatar>
                      <span className="flex min-w-0 flex-col">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium">{row.name}</span>
                          {isSelf ? (
                            <Badge tone="muted" size="sm">
                              {t("you")}
                            </Badge>
                          ) : null}
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
                        className="w-32"
                        onChange={(event) =>
                          void run(() => updateMemberRoleAction(row.id, event.target.value), t("roleUpdated"))
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
                  <TableCell align="right">
                    {removable ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon
                        aria-label={t("removeMemberAria", { email: row.email })}
                        title={t("removeMemberConfirm")}
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
                            onConfirm: () => run(() => removeMemberAction(row.id), t("memberRemoved")),
                          })
                        }
                      >
                        <Icon name="trash" className="text-sm text-danger" aria-hidden="true" />
                      </Button>
                    ) : row.role === "owner" && !isSelf ? (
                      <span className="text-xs text-fg-subtle">{t("protected")}</span>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card
        id="invitations"
        padding={invites.length === 0 ? "md" : "none"}
        title={
          <span className="inline-flex items-center gap-2">
            {t("pendingInvitations")}
            <Badge tone="neutral" size="sm">
              {invites.length}
            </Badge>
          </span>
        }
        description={t("pendingInvitationsDesc")}
      >
        {invites.length === 0 ? (
          <EmptyState
            bare
            size="sm"
            icon="envelope"
            title={t("invitesEmptyTitle")}
            description={t("invitesEmptyBody")}
          />
        ) : (
          <ul className="m-0 flex min-w-0 list-none flex-col divide-y divide-border-subtle border-t border-border-subtle p-0">
            {invites.map((invite) => {
              const inviteRoleCopy = isRoleId(invite.role) ? ROLE_COPY[invite.role] : null;
              return (
                <li key={invite.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
                  <Icon name="envelope" className="shrink-0 text-sm text-fg-subtle" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">{invite.email}</span>
                  <Badge tone="muted">{inviteRoleCopy ? t(inviteRoleCopy.label) : invite.role}</Badge>
                  <span className="shrink-0 text-xs text-fg-subtle tabular-nums">
                    {t("inviteExpires", { date: formatDate(invite.expiresAt) })}
                  </span>
                  {canManage ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        requestConfirm({
                          title: t("cancelInviteTitle"),
                          description: t("cancelInviteBody", { email: invite.email }),
                          confirmLabel: t("cancelInviteConfirm"),
                          onConfirm: () => run(() => cancelInviteAction(invite.id), t("inviteCancelled")),
                        })
                      }
                    >
                      {tc("cancel")}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {dialog}
    </>
  );
}
