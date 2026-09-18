"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import { PLATFORM_ASSET_KINDS, type PlatformAssetKind } from "@short/db/constants";
import { Button, Field, Input, SaveBar, Section, Select, Switch } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import type { PlatformBrand } from "@/lib/brand-fallback";
import { updateBrandAction, uploadBrandAssetAction } from "./actions";

const ASSET_KEYS: Record<
  PlatformAssetKind,
  "logo" | "logoDark" | "wordmark" | "wordmarkDark" | "favicon" | "og"
> = {
  logo: "logo",
  logo_dark: "logoDark",
  wordmark: "wordmark",
  wordmark_dark: "wordmarkDark",
  favicon: "favicon",
  og: "og",
};

function isWordmarkKind(kind: PlatformAssetKind): boolean {
  return kind === "wordmark" || kind === "wordmark_dark";
}

const BRAND_ERROR_KEYS = [
  "errorUnknownAsset",
  "errorChooseImage",
  "errorFileTooLarge",
  "errorFileTooLargeOg",
  "errorInvalidType",
  "errorUploadFailed",
] as const;

type BrandErrorKey = (typeof BRAND_ERROR_KEYS)[number];

type BrandEditorProps = {
  brand: PlatformBrand;
  presentAssets: PlatformAssetKind[];
};

export function BrandEditor({ brand, presentAssets }: BrandEditorProps) {
  const router = useRouter();
  const t = useTranslations("admin.brand");
  const tNav = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const [name, setName] = useState(brand.name);
  const [tagline, setTagline] = useState(brand.tagline ?? "");
  const [defaultLocale, setDefaultLocale] = useState(brand.defaultLocale);
  const [localeSwitcherEnabled, setLocaleSwitcherEnabled] = useState(brand.localeSwitcherEnabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<PlatformAssetKind | null>(null);

  const dirty = useMemo(
    () =>
      name !== brand.name ||
      tagline !== (brand.tagline ?? "") ||
      defaultLocale !== brand.defaultLocale ||
      localeSwitcherEnabled !== brand.localeSwitcherEnabled,
    [brand, defaultLocale, localeSwitcherEnabled, name, tagline],
  );

  function brandMessage(code: string | undefined): string {
    if (code && (BRAND_ERROR_KEYS as readonly string[]).includes(code)) {
      return t(code as BrandErrorKey);
    }
    return actionMessage(code);
  }

  const save = (): void => {
    startTransition(async () => {
      setError(null);
      const result = await updateBrandAction({
        name,
        tagline: tagline.trim() === "" ? null : tagline,
        defaultLocale,
        localeSwitcherEnabled,
      });
      if (!result.ok) {
        setError(brandMessage(result.error));
        return;
      }
      router.refresh();
    });
  };

  const reset = (): void => {
    setName(brand.name);
    setTagline(brand.tagline ?? "");
    setDefaultLocale(brand.defaultLocale);
    setLocaleSwitcherEnabled(brand.localeSwitcherEnabled);
    setError(null);
  };

  const upload = async (kind: PlatformAssetKind, event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setUploading(kind);
    setError(null);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const result = await uploadBrandAssetAction(form);
      if (!result.ok) {
        setError(brandMessage(result.error));
        return;
      }
      router.refresh();
    } catch {
      setError(t("errorUploadFailed"));
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}

      <Section title={t("identity")} description={t("identityDesc")}>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field label={tNav("name")}>
            <Input value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label={t("tagline")} hint={t("taglineHint")}>
            <Input
              value={tagline}
              maxLength={160}
              onChange={(event) => setTagline(event.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title={t("locale")} description={t("localeDesc")}>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field label={t("defaultLanguage")}>
            <Select
              value={defaultLocale}
              onChange={(event) => setDefaultLocale(event.target.value === "tr" ? "tr" : "en")}
            >
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
            </Select>
          </Field>
          <Field label={t("languageSwitcher")} hint={t("languageSwitcherHint")}>
            <div className="flex min-h-10 items-center">
              <Switch
                checked={localeSwitcherEnabled}
                onCheckedChange={setLocaleSwitcherEnabled}
                aria-label={t("showSwitcher")}
              />
            </div>
          </Field>
        </div>
      </Section>

      <Section title={t("assets")} description={t("assetsDesc")}>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
          {PLATFORM_ASSET_KINDS.map((kind) => {
            const present = presentAssets.includes(kind);
            const label = t(ASSET_KEYS[kind]);
            return (
              <li
                key={kind}
                className="flex min-w-0 items-center gap-3 rounded-default border border-border bg-bg p-4"
              >
                <span
                  className={
                    isWordmarkKind(kind)
                      ? "relative flex h-12 w-28 shrink-0 items-center justify-center overflow-hidden rounded-default bg-surface-subtle px-2"
                      : "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-default bg-surface-subtle"
                  }
                >
                  {present || !isWordmarkKind(kind) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- preview from our brand API
                    <img
                      src={`/api/brand/${kind}?v=${present ? "1" : "0"}`}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="truncate text-xs font-semibold">{name}</span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-fg-subtle">
                    {present ? t("uploaded") : isWordmarkKind(kind) ? t("fallbackName") : t("fallback")}
                  </span>
                </span>
                <label className="inline-flex cursor-pointer">
                  <span className="sr-only">{t("uploadAria", { label })}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico"
                    className="sr-only"
                    disabled={uploading === kind}
                    onChange={(event) => {
                      void upload(kind, event);
                    }}
                  />
                  <span className="inline-flex items-center rounded-default border border-border-strong bg-bg px-3 py-1.5 text-xs font-medium">
                    {uploading === kind ? t("uploading") : t("upload")}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Section>

      <SaveBar
        dirty={dirty}
        saving={pending}
        message={t("unsaved")}
        actions={
          <>
            <Button size="sm" onClick={reset} disabled={pending}>
              {tc("cancel")}
            </Button>
            <Button size="sm" variant="primary" onClick={save} disabled={pending}>
              {pending ? tc("working") : tc("save")}
            </Button>
          </>
        }
      />
    </div>
  );
}
