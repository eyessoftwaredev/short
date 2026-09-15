"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Pagination } from "@/components/ui";

type QueryPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
};

/** URL-driven pagination so server components can render a list without client state. */
export function QueryPagination({ page, pageSize, total }: QueryPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  return (
    <Pagination
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={(next) => {
        const params = new URLSearchParams(searchParams.toString());
        if (next <= 1) {
          params.delete("page");
        } else {
          params.set("page", String(next));
        }
        const query = params.toString();
        startTransition(() => router.push(query === "" ? pathname : `${pathname}?${query}`));
      }}
    />
  );
}
