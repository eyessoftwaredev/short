"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { brandName } from "@/lib/nav";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("app render failed", error);
  }, [error]);

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg">
      <header className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
        <Link
          href="/"
          className="inline-flex min-w-0 items-center gap-2.5 text-ink no-underline hover:no-underline"
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-default bg-inverse font-mono text-sm font-semibold text-on-inverse"
            aria-hidden="true"
          >
            S
          </span>
          <span className="truncate text-base font-semibold tracking-tight">{brandName}</span>
        </Link>
      </header>

      <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-16">
        <EmptyState
          className="w-full max-w-lg"
          icon={<TriangleAlert className="size-5" />}
          eyebrow={error.digest ? `Ref ${error.digest}` : "Error"}
          title="Something went wrong"
          description="This screen failed to render. Your links and click data are unaffected."
          actions={
            <>
              <Button variant="primary" onClick={reset}>
                <RotateCw className="size-4" />
                Try again
              </Button>
              <Button href="/dashboard">Go to dashboard</Button>
            </>
          }
          hint="If this keeps happening, quote the reference above to support."
        />
      </main>
    </div>
  );
}
