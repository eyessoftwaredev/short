import Link from "next/link";
import { Compass } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { brandName } from "@/lib/nav";

export default function NotFoundPage() {
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
          icon={<Compass className="size-5" />}
          eyebrow="404"
          title="This page is not here"
          description="The address is wrong, the link expired, or this screen was never built. Your workspace is still where you left it."
          actions={
            <>
              <Button variant="primary" href="/dashboard">
                Go to dashboard
              </Button>
              <Button href="/login">Sign in</Button>
            </>
          }
          hint="If you followed a link from an email, try opening it again or request a new one."
        />
      </main>
    </div>
  );
}
