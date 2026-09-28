"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Input,
  SecretInput,
  SectionCard,
  SettingsRow,
  Switch,
} from "@/components/ui";
import { savePixelAction } from "./pixel-actions";
import { useSettingsAction } from "./settings-dialogs";

export type PixelView = {
  provider: "meta" | "google" | "tiktok";
  pixelId: string;
  enabled: boolean;
  /** An access token is stored (never sent to the browser). */
  hasToken: boolean;
};

export function SettingsPixels({ pixels, canManage }: { pixels: PixelView[]; canManage: boolean }) {
  const t = useTranslations("settings");
  const { pending, run } = useSettingsAction();
  const meta = pixels.find((row) => row.provider === "meta");
  const [pixelId, setPixelId] = useState(meta?.pixelId ?? "");
  const [token, setToken] = useState("");
  const [enabled, setEnabled] = useState(meta?.enabled ?? true);

  const dirty =
    pixelId.trim() !== (meta?.pixelId ?? "") || token.trim() !== "" || enabled !== (meta?.enabled ?? true);
  // Without a token Meta rejects every event, so a first save needs one.
  const needsToken = !meta?.hasToken && token.trim() === "";
  const status = !meta
    ? { tone: "muted" as const, label: t("pixelNotSetUp") }
    : !meta.hasToken
      ? { tone: "warn" as const, label: t("pixelMissingToken") }
      : meta.enabled
        ? { tone: "success" as const, label: t("pixelActive") }
        : { tone: "muted" as const, label: t("pixelPaused") };

  async function save(): Promise<void> {
    const ok = await run(
      () => savePixelAction({ provider: "meta", pixelId, accessToken: token, enabled }),
      t("pixelsSaved"),
    );
    if (ok) {
      setToken("");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {canManage ? null : <Callout tone="info">{t("pixelsReadOnly")}</Callout>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canManage && dirty && pixelId.trim() !== "" && !needsToken) {
            void save();
          }
        }}
      >
        <SectionCard
          id="meta-pixel"
          title={t("pixelsTitle")}
          description={t("pixelsDesc")}
          actions={
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
          }
          footer={
            canManage ? (
              <Button
                type="submit"
                variant="primary"
                loading={pending}
                disabled={!dirty || pixelId.trim() === "" || needsToken}
              >
                {t("savePixels")}
              </Button>
            ) : undefined
          }
        >
          <SettingsRow
            label={t("metaPixelId")}
            description={t("metaPixelIdDesc")}
            info={t("metaPixelIdInfo")}
            htmlFor="meta-pixel-id"
          >
            <Input
              id="meta-pixel-id"
              value={pixelId}
              inputMode="numeric"
              autoComplete="off"
              placeholder="123456789012345"
              onChange={(event) => setPixelId(event.target.value)}
              disabled={!canManage}
            />
          </SettingsRow>
          <SettingsRow
            label={t("metaCapiToken")}
            description={meta?.hasToken ? t("metaCapiHint") : t("metaCapiRequired")}
            info={t("metaCapiTokenInfo")}
          >
            <SecretInput
              domName="meta-capi-token"
              blockAutofill={false}
              value={token}
              placeholder={meta?.hasToken ? "••••••••••••" : undefined}
              onChange={(event) => setToken(event.target.value)}
              disabled={!canManage}
            />
          </SettingsRow>
          <SettingsRow
            label={t("pixelsEnabled")}
            description={t("pixelsEnabledDesc")}
            info={t("pixelsEnabledInfo")}
          >
            <Switch
              checked={enabled}
              disabled={!canManage}
              aria-label={t("pixelsEnabled")}
              onCheckedChange={setEnabled}
            />
          </SettingsRow>
        </SectionCard>
      </form>
    </div>
  );
}
