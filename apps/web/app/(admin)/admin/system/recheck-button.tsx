"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";

/** Re-runs every probe by re-rendering the (force-dynamic) page in place. */
export function RecheckButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button leadingIcon="rotate-right" loading={pending} onClick={() => startTransition(() => router.refresh())}>
      {label}
    </Button>
  );
}
