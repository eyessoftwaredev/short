"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ChangeEvent } from "react";
import type { PlatformAssetKind } from "@short/db/constants";
import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  SaveBar,
  SectionCard,
  Segmented,
  SettingsRow,
  Switch,
  toast,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import type { PlatformBrand } from "@/lib/brand-fallback";
import { cn } from "@/lib/cx";
import { removeBrandAssetAction, updateBrandAction, uploadBrandAssetAction } from "./actions";

export type BrandAssetView = {
  kind: PlatformAssetKind;
  present: boolean;
  /** Versioned URL, or null when the fallback is in use. */
  src: string | null;
};

const ASSET_KEYS: Record<PlatformAssetKind, "logo" | "logoDark" | "wordmark" | "wordmarkDark" | "favicon" | "og"> = {
  logo: "logo",
  logo_dark: "logoDark",
  wordmark: "wordmark",
  wordmark_dark: "wordmarkDark",
  favicon: "favicon",
  og: "og",
};

const BRAND_ERROR_KEYS = [
  "errorUnknownAsset",
  "errorChooseImage",
  "errorFileTooLarge",
  "errorFileTooLargeOg",
  "errorInvalidType",
  "errorUploadFailed",
] as const;

type BrandErrorKey = (typeof BRAND_ERROR_KEYS)[number];

const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico";
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);
const MAX_ASSET_BYTES = 512 * 1024;
const MAX_OG_BYTES = 1024 * 1024;

function isWordmarkKind(kind: PlatformAssetKind): boolean {
  return kind === "wordmark" || kind === "wordmark_dark";
}

type BrandEditorProps = {
  brand: PlatformBrand;
  assets: BrandAssetView[];
};

/** The square mark as the product renders it: the upload, or the brand's initial. */
function Mark({ src, name, size = "md", inverse = false }: { src: string | null; name: string; size?: "sm" | "md"; inverse?: boolean }) {
  const box = size === "sm" ? "size-4 text-[9px]" : "size-8 text-sm";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- preview from our brand API
    return <img src={src} alt="" className={cn(box, "shrink-0 rounded-sm object-contain")} />;
  }
  return (
    <span
      className={cn(
        box,
        "flex shrink-0 items-center justify-center rounded-sm font-semibold",
        inverse ? "bg-bg text-ink" : "bg-inverse text-on-inverse",
      )}
      aria-hidden="true"
    >
      {(name.trim()[0] ?? "S").toUpperCase()}
    </span>
  );
}

export function BrandEditor({ brand, assets }: BrandEditorProps) {
  const router = useRouter();
  const t = useTranslations("admin.brand");
  const tNav = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const [name, setName] = useState(brand.name);
  const [tagline, setTagline] = useState(brand.tagline ?? "");
  const [defaultLocale, setDefaultLocale] = useState<"en" | "tr">(brand.defaultLocale === "tr" ? "tr" : "en");
  const [localeSwitcherEnabled, setLocaleSwitcherEnabled] = useState(brand.localeSwitcherEnabled);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<PlatformAssetKind | null>(null);
  const [removing, setRemoving] = useState<PlatformAssetKind | null>(null);
  const [removeTarget, setRemoveTarget] = useState<PlatformAssetKind | null>(null);
  const inputs = useRef<Partial<Record<PlatformAssetKind, HTMLInputElement | null>>>({});

  const byKind = new Map(assets.map((asset) => [asset.kind, asset]));
  const src = (kind: PlatformAssetKind): string | null => byKind.get(kind)?.src ?? null;
  const previewName = name.trim() === "" ? brand.name : name.trim();
  // The dark rail falls back to the regular logo, exactly like the asset route.
  const darkLogo = src("logo_dark") ?? src("logo");

  const dirty =
    name !== brand.name ||
    tagline !== (brand.tagline ?? "") ||
    defaultLocale !== brand.defaultLocale ||
    localeSwitcherEnabled !== brand.localeSwitcherEnabled;

  function brandMessage(code: string | undefined): string {
    if (code && (BRAND_ERROR_KEYS as readonly string[]).includes(code)) {
      return t(code as BrandErrorKey);
    }
    return actionMessage(code);
  }

  function save(): void {
    startTransition(async () => {
      const result = await updateBrandAction({
        name,
        tagline: tagline.trim() === "" ? null : tagline,
        defaultLocale,
        localeSwitcherEnabled,
      });
      if (!result.ok) {
        toast.error(t("saveFailed"), result.error === "validation" ? t("nameRequired") : brandMessage(result.error));
        return;
      }
      // The server trims; match it so the save bar does not linger on whitespace.
      setName(name.trim());
      setTagline(tagline.trim());
      toast.success(t("savedToast"));
      router.refresh();
    });
  }

  function reset(): void {
    setName(brand.name);
    setTagline(brand.tagline ?? "");
    setDefaultLocale(brand.defaultLocale === "tr" ? "tr" : "en");
    setLocaleSwitcherEnabled(brand.localeSwitcherEnabled);
  }

  async function upload(kind: PlatformAssetKind, event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    // Same limits as the server, checked first so a too-big file fails instantly.
    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error(t("errorInvalidType"));
      return;
    }
    const max = kind === "og" ? MAX_OG_BYTES : MAX_ASSET_BYTES;
    if (file.size > max) {
      toast.error(kind === "og" ? t("errorFileTooLargeOg") : t("errorFileTooLarge"));
      return;
    }

    setUploading(kind);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const result = await uploadBrandAssetAction(form);
      if (!result.ok) {
        toast.error(brandMessage(result.error));
        return;
      }
      toast.success(t("uploadedToast", { label: t(ASSET_KEYS[kind]) }));
      router.refresh();
    } catch {
      toast.error(t("errorUploadFailed"));
    } finally {
      setUploading(null);
    }
  }

  function remove(): void {
    const kind = removeTarget;
    if (!kind) {
      return;
    }
    setRemoving(kind);
    startTransition(async () => {
      const result = await removeBrandAssetAction(kind);
      setRemoving(null);
      setRemoveTarget(null);
      if (!result.ok) {
        toast.error(brandMessage(result.error));
        return;
      }
      toast.success(t("removedToast", { label: t(ASSET_KEYS[kind]) }));
      router.refresh();
    });
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        <SectionCard title={t("identity")} description={t("identityDesc")}>
          <SettingsRow label={tNav("name")} description={t("nameDesc")} info={t("nameInfo")} htmlFor="brand-name">
            <Input id="brand-name" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} />
          </SettingsRow>
          <SettingsRow label={t("tagline")} description={t("taglineHint")} info={t("taglineInfo")} htmlFor="brand-tagline">
            <Input
              id="brand-tagline"
              value={tagline}
              maxLength={160}
              onChange={(event) => setTagline(event.target.value)}
            />
          </SettingsRow>
        </SectionCard>

        <SectionCard title={t("locale")} description={t("localeDesc")}>
          <SettingsRow label={t("defaultLanguage")} description={t("defaultLanguageDesc")} info={t("defaultLanguageInfo")}>
            <div className="flex md:justify-end">
              <Segmented
                label={t("defaultLanguage")}
                value={defaultLocale}
                onChange={setDefaultLocale}
                items={[
                  { id: "en", label: "English" },
                  { id: "tr", label: "Türkçe" },
                ]}
              />
            </div>
          </SettingsRow>
          <SettingsRow label={t("languageSwitcher")} description={t("languageSwitcherHint")} info={t("languageSwitcherInfo")}>
            <div className="flex md:justify-end">
              <Switch
                checked={localeSwitcherEnabled}
                onCheckedChange={setLocaleSwitcherEnabled}
                aria-label={t("showSwitcher")}
              />
            </div>
          </SettingsRow>
        </SectionCard>

        <SectionCard title={t("assets")} description={t("assetsDesc")}>
          {assets.map((asset) => {
            const label = t(ASSET_KEYS[asset.kind]);
            const wide = isWordmarkKind(asset.kind) || asset.kind === "og";
            const darkSurface = asset.kind === "logo_dark" || asset.kind === "wordmark_dark";
            return (
              <SettingsRow
                key={asset.kind}
                label={label}
                info={t(`assetInfo.${asset.kind}`)}
                description={
                  asset.present
                    ? t("uploaded")
                    : isWordmarkKind(asset.kind)
                      ? t("fallbackName")
                      : t("fallback")
                }
              >
                <div className="flex min-w-0 flex-wrap items-center gap-3 md:justify-end">
                  <span
                    className={cn(
                      "flex h-12 shrink-0 items-center justify-center overflow-hidden rounded-default border border-border px-2",
                      wide ? "w-28" : "w-12",
                      darkSurface ? "bg-inverse" : "bg-surface-subtle",
                    )}
                  >
                    {asset.src ? (
                      // eslint-disable-next-line @next/next/no-img-element -- preview from our brand API
                      <img src={asset.src} alt="" className="max-h-full max-w-full object-contain" />
                    ) : isWordmarkKind(asset.kind) ? (
                      <span
                        className={cn(
                          "truncate text-xs font-semibold",
                          darkSurface ? "text-on-inverse" : "text-ink",
                        )}
                      >
                        {previewName}
                      </span>
                    ) : (
                      <span className="text-xs text-fg-subtle">{t("none")}</span>
                    )}
                  </span>
                  <input
                    ref={(element) => {
                      inputs.current[asset.kind] = element;
                    }}
                    type="file"
                    accept={ACCEPT}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(event) => {
                      void upload(asset.kind, event);
                    }}
                  />
                  <Button
                    size="sm"
                    leadingIcon="cloud-up"
                    loading={uploading === asset.kind}
                    disabled={uploading !== null && uploading !== asset.kind}
                    aria-label={t("uploadAria", { label })}
                    onClick={() => inputs.current[asset.kind]?.click()}
                  >
                    {asset.present ? t("replace") : t("upload")}
                  </Button>
                  {asset.present ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={removing === asset.kind}
                      aria-label={t("removeAria", { label })}
                      onClick={() => setRemoveTarget(asset.kind)}
                    >
                      {t("remove")}
                    </Button>
                  ) : null}
                </div>
              </SettingsRow>
            );
          })}
        </SectionCard>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-20">
        <Card title={t("previewTitle")} description={t("previewDesc")}>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-subtle">{t("previewTab")}</span>
              <div className="flex min-w-0 items-end rounded-md bg-surface-strong px-2 pt-2">
                <span className="flex max-w-full min-w-0 items-center gap-2 rounded-t-default bg-bg px-3 py-2">
                  <Mark src={src("favicon") ?? src("logo")} name={previewName} size="sm" />
                  <span className="truncate text-xs text-ink">{previewName}</span>
                </span>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-subtle">{t("previewHeader")}</span>
              <div className="flex min-w-0 flex-col gap-1 rounded-md border border-border bg-bg p-4">
                {src("wordmark") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- preview from our brand API
                  <img src={src("wordmark") ?? ""} alt="" className="h-7 max-w-full self-start object-contain" />
                ) : (
                  <span className="flex min-w-0 items-center gap-2">
                    <Mark src={src("logo")} name={previewName} />
                    <span className="truncate text-base font-semibold text-ink">{previewName}</span>
                  </span>
                )}
                {tagline.trim() !== "" ? (
                  <span className="line-clamp-2 text-[13px] text-fg-muted">{tagline}</span>
                ) : null}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-subtle">{t("previewDark")}</span>
              <div className="flex min-w-0 items-center rounded-md bg-inverse p-4">
                {src("wordmark_dark") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- preview from our brand API
                  <img src={src("wordmark_dark") ?? ""} alt="" className="h-7 max-w-full object-contain" />
                ) : (
                  <span className="flex min-w-0 items-center gap-2">
                    <Mark src={darkLogo} name={previewName} inverse />
                    <span className="truncate text-base font-semibold text-on-inverse">{previewName}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-subtle">{t("previewShare")}</span>
              <div className="overflow-hidden rounded-md border border-border bg-bg">
                <div className="flex aspect-[1200/630] items-center justify-center bg-surface-subtle">
                  {src("og") ? (
                    // eslint-disable-next-line @next/next/no-img-element -- preview from our brand API
                    <img src={src("og") ?? ""} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="px-4 text-center text-xs text-fg-subtle">{t("previewNoOg")}</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5 border-t border-border-subtle px-3 py-2">
                  <span className="truncate text-[13px] font-medium text-ink">{previewName}</span>
                  <span className="line-clamp-2 text-xs text-fg-muted">{tagline.trim() || t("previewNoTagline")}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </aside>

      <SaveBar
        dirty={dirty}
        saving={pending && removing === null}
        message={t("unsaved")}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={reset} disabled={pending}>
              {tc("discard")}
            </Button>
            <Button size="sm" variant="primary" onClick={save} loading={pending && removing === null}>
              {tc("save")}
            </Button>
          </>
        }
      />

      <ConfirmDialog
        open={removeTarget !== null}
        title={removeTarget ? t("removeTitle", { label: t(ASSET_KEYS[removeTarget]) }) : ""}
        description={t("removeDesc")}
        confirmLabel={t("remove")}
        loading={removing !== null}
        onConfirm={remove}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  );
}
