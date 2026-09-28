"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/kit/icon";
import { Button, Dropdown, Modal, toast } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { exportLinksCsvAction, importLinksCsvAction } from "./csv-actions";
import { RewriteDestinationsDialog } from "./rewrite-destinations-dialog";

/** Mirrors the server cap so an oversized file fails fast without an upload. */
const MAX_IMPORT_BYTES = 1_000_000;

type ImportReport = { created: number; skipped: number; errors: string[] };

function downloadCsv(text: string, filename: string): void {
  // BOM so Excel opens UTF-8 titles correctly.
  const blob = new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Admin tools for the whole list, tucked behind one "More" menu so the page keeps a
 * single primary action: CSV import/export and the bulk destination rewrite.
 */
export function LinksToolsMenu() {
  const t = useTranslations("links");
  const actionMessage = useActionMessage();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  function importFile(file: File): void {
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error(t("list.importTooBig"));
      return;
    }
    startTransition(async () => {
      try {
        const text = await file.text();
        const result = await importLinksCsvAction(text);
        if (!result.ok) {
          toast.error(actionMessage(result.error));
          return;
        }
        const { created, skipped, errors } = result.data;
        // Partial imports are normal (bad rows, taken slugs); say what happened.
        if (errors.length > 0 || skipped > 0) {
          setReport(result.data);
        } else {
          toast.success(t("list.imported", { count: created }));
        }
        router.refresh();
      } catch (error) {
        console.error("CSV import failed", error);
        toast.error(actionMessage("generic"));
      }
    });
  }

  function exportAll(): void {
    startTransition(async () => {
      try {
        const result = await exportLinksCsvAction();
        if (!result.ok) {
          toast.error(actionMessage(result.error));
          return;
        }
        downloadCsv(result.data, "links.csv");
        toast.success(t("list.exported"));
      } catch (error) {
        console.error("CSV export failed", error);
        toast.error(actionMessage("generic"));
      }
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            importFile(file);
          }
        }}
      />
      <Dropdown
        label={t("list.moreTools")}
        items={[
          {
            id: "import",
            label: t("importCsv"),
            description: t("list.importHint"),
            icon: <Icon name="cloud-up" className="text-xs" />,
            onSelect: () => inputRef.current?.click(),
          },
          {
            id: "export",
            label: t("exportCsv"),
            description: t("list.exportHint"),
            icon: <Icon name="download" className="text-xs" />,
            onSelect: exportAll,
          },
          {
            id: "rewrite",
            label: t("rewriteDestinations"),
            description: t("list.rewriteHint"),
            icon: <Icon name="globe" className="text-xs" />,
            separated: true,
            onSelect: () => setRewriteOpen(true),
          },
        ]}
        trigger={
          <Button leadingIcon="ellipsis" trailingIcon="chevron-down" loading={pending}>
            {t("list.moreTools")}
          </Button>
        }
      />

      <RewriteDestinationsDialog open={rewriteOpen} onClose={() => setRewriteOpen(false)} />

      <Modal
        open={report != null}
        icon="file-lines"
        title={t("list.importReportTitle")}
        description={t("list.importReportBody", {
          created: report?.created ?? 0,
          skipped: report?.skipped ?? 0,
        })}
        onClose={() => setReport(null)}
        footer={
          <Button variant="primary" onClick={() => setReport(null)}>
            {t("list.importReportDone")}
          </Button>
        }
      >
        {report && report.errors.length > 0 ? (
          <ul className="m-0 flex max-h-72 list-none flex-col gap-1 overflow-y-auto rounded-md border border-border bg-surface-subtle p-3 font-mono text-xs text-fg-muted">
            {report.errors.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </Modal>
    </>
  );
}
