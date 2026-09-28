"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Button,
  Field,
  Input,
  SectionCard,
  Select,
  SettingsRow,
  Switch,
  toast,
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
  const initialRole = user.role === "superadmin" ? "superadmin" : "user";
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);
  const [role, setRole] = useState<"user" | "superadmin">(initialRole);
  const [banned, setBanned] = useState(user.banned);
  const [banReason, setBanReason] = useState(user.banReason ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const isSelf = user.id === currentUserId;

  const dirty =
    name !== user.name ||
    email !== user.email ||
    emailVerified !== user.emailVerified ||
    role !== initialRole ||
    banned !== user.banned ||
    banReason !== (user.banReason ?? "");

  function reset(): void {
    setName(user.name);
    setEmail(user.email);
    setEmailVerified(user.emailVerified);
    setRole(initialRole);
    setBanned(user.banned);
    setBanReason(user.banReason ?? "");
    setFieldErrors({});
  }

  function save(): void {
    setFieldErrors({});
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
        if (result.error === "validation" && result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
          return;
        }
        toast.error(t("saveFailed"), actionMessage(result.error));
        return;
      }
      // Match what the server stored (trimmed, lower-case email) so the form reads clean.
      setName(name.trim());
      setEmail(email.trim().toLowerCase());
      setBanReason(banReason.trim());
      toast.success(t("savedToast"));
      router.refresh();
    });
  }

  return (
    <SectionCard
      title={t("account")}
      description={t("accountDesc")}
      footer={
        <>
          {isSelf ? <span className="mr-auto text-[13px] text-fg-subtle">{t("selfHint")}</span> : null}
          <Button variant="ghost" onClick={reset} disabled={!dirty || pending}>
            {tc("discard")}
          </Button>
          <Button variant="primary" onClick={save} loading={pending} disabled={!dirty}>
            {tc("save")}
          </Button>
        </>
      }
    >
      <SettingsRow label={tNav("name")} description={t("nameDesc")} info={t("nameInfo")} htmlFor="admin-user-name">
        <Field error={fieldErrors.name ? t("nameInvalid") : undefined}>
          <Input id="admin-user-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
        </Field>
      </SettingsRow>

      <SettingsRow label={tNav("email")} description={t("emailDesc")} info={t("emailInfo")} htmlFor="admin-user-email">
        <Field error={fieldErrors.email ? t("emailInvalid") : undefined}>
          <Input
            id="admin-user-email"
            type="email"
            value={email}
            autoComplete="off"
            className="font-mono"
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
      </SettingsRow>

      <SettingsRow
        label={t("platformRole")}
        description={isSelf ? t("roleSelf") : t("roleDesc")}
        info={t("platformRoleInfo")}
        htmlFor="admin-user-role"
      >
        <Select
          id="admin-user-role"
          value={role}
          disabled={isSelf}
          onChange={(event) => setRole(event.target.value === "superadmin" ? "superadmin" : "user")}
        >
          <option value="user">{t("member")}</option>
          <option value="superadmin">{t("platformAdmin")}</option>
        </Select>
      </SettingsRow>

      <SettingsRow label={t("emailVerified")} description={t("emailVerifiedHint")} info={t("emailVerifiedInfo")}>
        <div className="flex md:justify-end">
          <Switch checked={emailVerified} onCheckedChange={setEmailVerified} aria-label={t("emailVerified")} />
        </div>
      </SettingsRow>

      <SettingsRow
        label={t("banned")}
        description={isSelf ? t("cannotBanSelf") : t("bannedHint")}
        info={t("bannedInfo")}
      >
        <div className="flex md:justify-end">
          <Switch checked={banned} disabled={isSelf} onCheckedChange={setBanned} aria-label={t("banned")} />
        </div>
      </SettingsRow>

      {banned ? (
        <SettingsRow
          label={t("banReason")}
          description={t("reasonHint")}
          info={t("banReasonInfo")}
          htmlFor="admin-user-ban-reason"
        >
          <Input
            id="admin-user-ban-reason"
            value={banReason}
            maxLength={240}
            onChange={(event) => setBanReason(event.target.value)}
            placeholder={t("banReasonPlaceholder")}
          />
        </SettingsRow>
      ) : null}
    </SectionCard>
  );
}
