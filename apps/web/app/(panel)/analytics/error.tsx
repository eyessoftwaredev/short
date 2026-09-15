"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, EmptyState } from "@/components/ui";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("analytics failed to render", error);
  }, [error]);

  return (
    <PanelShell title="Analytics">
      <EmptyState
        icon={<TriangleAlert className="size-5" />}
        eyebrow={error.digest ? `Ref ${error.digest}` : undefined}
        title="Analytics could not be loaded"
        // Click ingestion is independent of this page, so nothing is lost
        // while the report is unavailable — worth saying explicitly.
        description="We could not build this report. Clicks are still being recorded and will be included once it loads."
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
