"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PlanKey } from "@short/core";
import { ConfirmDialog, Select, toast } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { setWorkspacePlanAction } from "./actions";

/**
 * Plan changes here bypass Stripe and apply to everything the owner has, so the new
 * plan is confirmed before it is written rather than on the first change event.
 */
export function WorkspacePlanSelect({
  userId,
  workspaceId,
  planKey,
  options,
}: {
  userId: string;
  workspaceId: string;
  planKey: PlanKey;
  options: Array<{ key: PlanKey; name: string }>;
}) {
  const router = useRouter();
  const t = useTranslations("admin.users");
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [next, setNext] = useState<PlanKey | null>(null);
  const nextName = options.find((option) => option.key === next)?.name ?? "";

  function apply(): void {
    if (!next) {
      return;
    }
    startTransition(async () => {
      const result = await setWorkspacePlanAction(userId, workspaceId, next);
      setNext(null);
      if (!result.ok) {
        toast.error(t("planChangeFailed"), actionMessage(result.error));
        return;
      }
      toast.success(t("planChanged", { plan: nextName }));
      router.refresh();
    });
  }

  return (
    <>
      <Select
        aria-label={t("workspacePlan")}
        value={planKey}
        disabled={pending}
        className="min-w-32"
        onChange={(event) => {
          const value = event.target.value as PlanKey;
          if (value !== planKey) {
            setNext(value);
          }
        }}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.name}
          </option>
        ))}
      </Select>
      <ConfirmDialog
        open={next !== null}
        tone="default"
        title={t("planChangeTitle", { plan: nextName })}
        description={t("planChangeDesc")}
        confirmLabel={t("planChangeConfirm", { plan: nextName })}
        loading={pending}
        onConfirm={apply}
        onClose={() => setNext(null)}
      />
    </>
  );
}
