"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, EmptyState } from "@/components/ui";

export default function LinksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("links list failed to render", error);
  }, [error]);

  return (
    <PanelShell title="Links" searchable={false}>
      <EmptyState
        icon={<TriangleAlert className="size-5" />}
        eyebrow={error.digest ? `Ref ${error.digest}` : undefined}
        title="This list could not be loaded"
        /*
         * Reassurance first: the instinct on a links screen is that the links
         * themselves are gone, and redirects run from a separate service.
         */
        description="We could not read your links just now. Nothing has been deleted, and the links you have already shared keep redirecting."
        actions={
          <>
            <Button variant="primary" onClick={reset}>
              <RotateCw className="size-4" />
              Try again
            </Button>
            <Button href="/dashboard">Back to dashboard</Button>
          </>
        }
        hint="If this keeps happening, quote the reference above to support."
      />
    </PanelShell>
  );
}
