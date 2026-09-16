"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PlanKey } from "@short/core";
import { Select } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { setWorkspacePlanAction } from "./actions";

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
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="flex min-w-0 flex-col gap-1">
      <Select
        aria-label={t("workspacePlan")}
        value={planKey}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          setError(null);
          startTransition(async () => {
            const result = await setWorkspacePlanAction(userId, workspaceId, next);
            if (!result.ok) {
              setError(actionMessage(result.error));
              return;
            }
            router.refresh();
          });
        }}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.name}
          </option>
        ))}
      </Select>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}
