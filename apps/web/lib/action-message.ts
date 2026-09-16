"use client";

import { useTranslations } from "next-intl";

export const ERROR_CODES = [
  "generic",
  "validation",
  "quota",
  "quota_teams",
  "quota_members",
  "invite_personal",
  "delete_personal",
  "owner_billing",
  "name_length",
  "workspace_name_length",
  "already_member",
  "invalid_role",
  "member_missing",
  "last_owner",
  "owner_remove",
  "key_name",
  "key_missing",
  "webhook_save",
  "delete_forbidden",
  "billing_disabled",
  "stripe_invalid_secret",
  "stripe_invalid_webhook",
  "stripe_invalid_publishable",
  "stripe_verify_failed",
  "pick_paid_plan",
  "plan_no_price",
  "checkout_url",
  "no_billing_account",
  "self_ban",
  "already_impersonating",
  "self_demote",
  "email_taken",
  "plan_missing",
  "infinity_hidden",
  "invite_invalid",
  "domain_invalid",
  "domain_taken",
  "rewrite_same",
  "rewrite_too_many",
  "handle_taken",
  "portal_failed",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function useActionMessage(): (code: string | undefined | null) => string {
  const t = useTranslations("errors");
  return (code) => {
    if (code && (ERROR_CODES as readonly string[]).includes(code)) {
      return t(code as ErrorCode);
    }
    return t("generic");
  };
}
