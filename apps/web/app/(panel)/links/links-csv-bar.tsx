"use client";

import { Icon } from "@/components/kit/icon";
import { Button } from "@/components/ui";
import { useTranslations } from "next-intl";
import { useRef, useTransition } from "react";
import { exportLinksCsvAction, importLinksCsvAction } from "./csv-actions";

export function LinksCsvBar() {
  const t = useTranslations("links");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) {
            return;
          }
          startTransition(async () => {
            const text = await file.text();
            await importLinksCsvAction(text);
          });
        }}
      />
      <Button
        size="sm"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="cloud-up" className="text-sm" />
        {t("importCsv")}
      </Button>
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await exportLinksCsvAction();
            if (!result.ok) {
              return;
            }
            const blob = new Blob([result.data], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "links.csv";
            anchor.click();
            URL.revokeObjectURL(url);
          });
        }}
      >
        <Icon name="export" className="text-sm" />
        {t("exportCsv")}
      </Button>
    </>
  );
}
