"use client";

import { Button, Field, Input, Switch } from "@/components/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { savePixelAction } from "./pixel-actions";
import { SettingsCard } from "./settings-card";
import type { RunAction } from "./settings-types";

export type PixelView = {
  provider: "meta" | "google" | "tiktok";
  pixelId: string;
  enabled: boolean;
};

export function SettingsPixels({
  pixels,
  canManage,
  run,
  pending,
}: {
  pixels: PixelView[];
  canManage: boolean;
  run: RunAction;
  pending: boolean;
}) {
  const t = useTranslations("settings");
  const meta = pixels.find((row) => row.provider === "meta");
  const [pixelId, setPixelId] = useState(meta?.pixelId ?? "");
  const [token, setToken] = useState("");
  const [enabled, setEnabled] = useState(meta?.enabled ?? true);

  return (
    <SettingsCard
      title={t("pixelsTitle")}
      description={t("pixelsDesc")}
      footer={
        canManage ? (
          <Button
            disabled={pending || pixelId.trim() === ""}
            onClick={() =>
              run(
                () =>
                  savePixelAction({
                    provider: "meta",
                    pixelId,
                    accessToken: token,
                    enabled,
                  }),
                t("pixelsSaved"),
              )
            }
          >
            {t("savePixels")}
          </Button>
        ) : undefined
      }
    >
      <Field label={t("metaPixelId")}>
        <Input value={pixelId} onChange={(event) => setPixelId(event.target.value)} disabled={!canManage} />
      </Field>
      <Field label={t("metaCapiToken")} hint={t("metaCapiHint")}>
        <Input
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          disabled={!canManage}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={enabled} disabled={!canManage} onCheckedChange={setEnabled} />
        {t("pixelsEnabled")}
      </label>
    </SettingsCard>
  );
}
