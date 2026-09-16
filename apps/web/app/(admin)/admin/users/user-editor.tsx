"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Field,
  Input,
  SaveBar,
  Select,
  Switch,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { updateUserAction } from "./actions";

export type UserEditorValues = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  banned: boolean;
  banReason: string | null;
};

export function UserEditor({
  user,
  currentUserId,
}: {
  user: UserEditorValues;
  currentUserId: string;
}) {
  const router = useRouter();
  const t = useTranslations("admin.users");
  const tNav = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);
  const [role, setRole] = useState<"user" | "superadmin">(
    user.role === "superadmin" ? "superadmin" : "user",
  );
  const [banned, setBanned] = useState(user.banned);
  const [banReason, setBanReason] = useState(user.banReason ?? "");
  const [error, setError] = useState<string | null>(null);
  const isSelf = user.id === currentUserId;

  const dirty = useMemo(
    () =>
      name !== user.name ||
      email !== user.email ||
      emailVerified !== user.emailVerified ||
      role !== (user.role === "superadmin" ? "superadmin" : "user") ||
      banned !== user.banned ||
      banReason !== (user.banReason ?? ""),
    [banReason, banned, email, emailVerified, name, role, user],
  );

  function reset(): void {
    setName(user.name);
    setEmail(user.email);
    setEmailVerified(user.emailVerified);
    setRole(user.role === "superadmin" ? "superadmin" : "user");
    setBanned(user.banned);
    setBanReason(user.banReason ?? "");
    setError(null);
  }

  function save(): void {
    setError(null);
    startTransition(async () => {
      const result = await updateUserAction({
        userId: user.id,
        name,
        email,
        emailVerified,
        role,
        banned,
        banReason,
      });
      if (!result.ok) {
        setError(actionMessage(result.error));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={tNav("name")}>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label={tNav("email")}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label={t("platformRole")}>
          <Select
            value={role}
            disabled={isSelf}
            onChange={(event) => setRole(event.target.value === "superadmin" ? "superadmin" : "user")}
          >
            <option value="user">{t("member")}</option>
            <option value="superadmin">{t("platformAdmin")}</option>
          </Select>
        </Field>
        <div className="flex min-w-0 flex-col justify-end gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t("emailVerified")}</span>
              <span className="block text-xs text-fg-subtle">{t("emailVerifiedHint")}</span>
            </span>
            <Switch checked={emailVerified} onCheckedChange={setEmailVerified} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t("banned")}</span>
              <span className="block text-xs text-fg-subtle">
                {isSelf ? t("cannotBanSelf") : t("bannedHint")}
              </span>
            </span>
            <Switch checked={banned} disabled={isSelf} onCheckedChange={setBanned} />
          </div>
        </div>
      </div>

      {banned ? (
        <Field label={t("banReason")} hint={t("reasonHint")}>
          <Input
            value={banReason}
            onChange={(event) => setBanReason(event.target.value)}
            placeholder={t("banReasonPlaceholder")}
          />
        </Field>
      ) : null}

      {user.banned ? <Badge tone="danger">{t("currentlyBanned")}</Badge> : null}

      <SaveBar
        dirty={dirty}
        saving={pending}
        message={tc("unsavedChanges")}
        actions={
          <>
            <Button size="sm" onClick={reset} disabled={pending}>
              {tc("cancel")}
            </Button>
            <Button size="sm" variant="primary" onClick={save} disabled={pending}>
              {pending ? tc("working") : tc("save")}
            </Button>
          </>
        }
      />

      {isSelf ? <p className="m-0 text-xs text-fg-subtle">{t("selfHint")}</p> : null}
    </div>
  );
}
