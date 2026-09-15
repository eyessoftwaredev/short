"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, EmptyState } from "@/components/ui";

/**
 * The dashboard reads from Postgres and ClickHouse. The analytics loaders
 * already swallow a ClickHouse outage and degrade to zeroes, so reaching this
 * boundary means the workspace query itself failed — retrying is worth
 * offering, but the copy does not promise it will help.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("dashboard failed to render", error);
  }, [error]);

  return (
    <PanelShell title="Dashboard">
      <EmptyState
        icon={<TriangleAlert className="size-5" />}
        eyebrow={error.digest ? `Ref ${error.digest}` : undefined}
        title="This dashboard could not be loaded"
        description="Something went wrong while reading your workspace. Your links and click data are unaffected."
        actions={
          <>
            <Button variant="primary" onClick={reset}>
              <RotateCw className="size-4" />
              Try again
            </Button>
            <Button href="/links">Go to links</Button>
          </>
        }
        hint="If this keeps happening, quote the reference above to support."
      />
    </PanelShell>
  );
}
