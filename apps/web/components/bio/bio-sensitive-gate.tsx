"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

type BioSensitiveGateProps = {
  pageId: string;
  children: ReactNode;
};

export function BioSensitiveGate({ pageId, children }: BioSensitiveGateProps) {
  const t = useTranslations("bio");
  const storageKey = `bio-nsfw:${pageId}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(sessionStorage.getItem(storageKey) === "1");
    } catch {
      setOpen(false);
    }
  }, [storageKey]);

  if (open) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bio-bg px-6 text-center text-bio-fg">
      <p className="m-0 max-w-md text-sm leading-relaxed text-bio-fg-muted">{t("sensitiveHint")}</p>
      <Button
        variant="primary"
        onClick={() => {
          try {
            sessionStorage.setItem(storageKey, "1");
          } catch {
            /* private mode */
          }
          setOpen(true);
        }}
      >
        {t("sensitiveReveal")}
      </Button>
    </div>
  );
}
