"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/kit/icon";
import { Button, ConfirmDialog, Dropdown, Field, Input, toast, type DropdownItem } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import type { ActionResult } from "@/lib/action-result";
import {
  banUserAction,
  impersonateUserAction,
  setSuperadminAction,
  unbanUserAction,
} from "./actions";

export type UserActionTarget = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
};

type Kind = "ban" | "unban" | "promote" | "demote" | "impersonate";

type UserActionsProps = {
  user: UserActionTarget;
  currentUserId: string;
  /** `menu`: one ⋯ button for table rows. `buttons`: Impersonate + ⋯ for the detail header. */
  variant?: "menu" | "buttons";
  /** Hide "Open profile" when already on it. */
  showOpen?: boolean;
};

/**
 * Every account-level admin action goes through a confirmation that says what
 * happens — banning, promoting and impersonating are all hard to notice once done.
 */
export function UserActions({ user, currentUserId, variant = "menu", showOpen = true }: UserActionsProps) {
  const router = useRouter();
  const t = useTranslations("admin.users");
  const actionMessage = useActionMessage();
  const [dialog, setDialog] = useState<Kind | null>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const isSelf = user.id === currentUserId;
  const isAdmin = user.role === "superadmin";
  const canImpersonate = !isSelf && !user.banned && !isAdmin;

  function close(): void {
    if (pending) {
      return;
    }
    setDialog(null);
    setReason("");
  }

  function run(kind: Kind): void {
    startTransition(async () => {
      let result: ActionResult<null>;
      if (kind === "ban") {
        result = await banUserAction(user.id, reason);
      } else if (kind === "unban") {
        result = await unbanUserAction(user.id);
      } else if (kind === "promote" || kind === "demote") {
        result = await setSuperadminAction(user.id, kind === "promote");
      } else {
        result = await impersonateUserAction(user.id);
      }

      if (!result.ok) {
        setDialog(null);
        toast.error(t("actionFailed"), actionMessage(result.error));
        return;
      }
      if (kind === "impersonate") {
        // The session now belongs to the impersonated user, so land in their panel.
        window.location.href = "/dashboard";
        return;
      }
      setDialog(null);
      setReason("");
      const done: Record<Exclude<Kind, "impersonate">, string> = {
        ban: t("bannedToast", { email: user.email }),
        unban: t("unbannedToast", { email: user.email }),
        promote: t("promotedToast", { email: user.email }),
        demote: t("demotedToast", { email: user.email }),
      };
      toast.success(done[kind]);
      router.refresh();
    });
  }

  const items: DropdownItem[] = [];
  if (showOpen) {
    items.push({
      id: "open",
      label: t("openProfile"),
      icon: <Icon name="user-gear" className="text-xs" />,
      href: `/admin/users/${user.id}`,
    });
  }
  if (canImpersonate && variant === "menu") {
    items.push({
      id: "impersonate",
      label: t("impersonate"),
      description: t("impersonateHint"),
      icon: <Icon name="user-check" className="text-xs" />,
      onSelect: () => setDialog("impersonate"),
    });
  }
  if (!isSelf) {
    items.push({
      id: "role",
      label: isAdmin ? t("revokeAdmin") : t("makeAdmin"),
      icon: <Icon name="shield" className="text-xs" />,
      separated: items.length > 0,
      onSelect: () => setDialog(isAdmin ? "demote" : "promote"),
    });
    items.push(
      user.banned
        ? {
            id: "unban",
            label: t("liftBan"),
            icon: <Icon name="unlock" className="text-xs" />,
            onSelect: () => setDialog("unban"),
          }
        : {
            id: "ban",
            label: t("banUser"),
            icon: <Icon name="ban" className="text-xs" />,
            danger: true,
            separated: true,
            onSelect: () => {
              setReason("");
              setDialog("ban");
            },
          },
    );
  }

  const menu =
    items.length > 0 ? (
      <Dropdown
        align="end"
        label={t("actionsFor", { email: user.email })}
        items={items}
        trigger={
          <Button
            size="sm"
            variant={variant === "menu" ? "ghost" : "secondary"}
            icon
            aria-label={t("actionsFor", { email: user.email })}
          >
            <Icon name="ellipsis" className="text-sm" />
          </Button>
        }
      />
    ) : null;

  const config: Record<
    Kind,
    { title: string; description: string; confirm: string; tone: "danger" | "default" }
  > = {
    ban: {
      title: t("banTitle", { email: user.email }),
      description: t("banDesc"),
      confirm: t("banUser"),
      tone: "danger",
    },
    unban: {
      title: t("unbanTitle", { email: user.email }),
      description: t("unbanDesc"),
      confirm: t("liftBan"),
      tone: "default",
    },
    promote: {
      title: t("promoteTitle", { email: user.email }),
      description: t("promoteDesc"),
      confirm: t("makeAdmin"),
      tone: "default",
    },
    demote: {
      title: t("demoteTitle", { email: user.email }),
      description: t("demoteDesc"),
      confirm: t("revokeAdmin"),
      tone: "danger",
    },
    impersonate: {
      title: t("impersonateTitle", { email: user.email }),
      description: t("impersonateDesc"),
      confirm: t("impersonateConfirm"),
      tone: "default",
    },
  };
  const active = dialog ? config[dialog] : null;

  return (
    <>
      {variant === "buttons" ? (
        <>
          {canImpersonate ? (
            <Button leadingIcon="user-check" onClick={() => setDialog("impersonate")}>
              {t("impersonate")}
            </Button>
          ) : null}
          {menu}
        </>
      ) : (
        menu
      )}

      <ConfirmDialog
        open={dialog !== null}
        title={active?.title ?? ""}
        description={active?.description}
        confirmLabel={active?.confirm ?? ""}
        tone={active?.tone ?? "default"}
        loading={pending}
        onConfirm={() => {
          if (dialog) {
            run(dialog);
          }
        }}
        onClose={close}
      >
        {dialog === "ban" ? (
          <Field label={t("reason")} info={t("banReasonInfo")} hint={t("reasonHint")}>
            <Input
              value={reason}
              maxLength={240}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("reasonPlaceholder")}
            />
          </Field>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
