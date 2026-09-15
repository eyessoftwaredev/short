"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Chip } from "@/components/ui";
import { RANGE_OPTIONS, type RangeKey } from "@/lib/stats";

/** Writes `?range=` so the server component can re-query without client state. */
export function RangePicker({ value }: { value: RangeKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(next: RangeKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      {RANGE_OPTIONS.map((option) => (
        <Chip
          key={option.value}
          active={option.value === value}
          onClick={() => select(option.value)}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
}
