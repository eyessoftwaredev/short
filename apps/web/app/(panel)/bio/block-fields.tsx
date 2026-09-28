"use client";

import { BIOPAGE_LINK_ICONS, SOCIAL_PLATFORMS, type BioBlock } from "@short/core";
import { useTranslations } from "next-intl";
import { embedSrc } from "@/components/bio/bio-page-view";
import { SOCIAL_LABELS, socialIcon } from "@/components/bio/bio-icons";
import { Icon, type IconName } from "@/components/kit/icon";
import { ImageUpload } from "@/components/media/image-upload";
import {
  Button,
  Callout,
  Disclosure,
  Field,
  InfoTip,
  Input,
  Segmented,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/cx";

/** Field path inside the block (e.g. `destination`, `items.2.url`) → error code. */
export type BlockErrors = Record<string, string | undefined>;

type BlockFieldsProps = {
  block: BioBlock;
  onChange: (next: BioBlock) => void;
  errors?: BlockErrors;
  canForms?: boolean;
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

function platformLabel(platform: string, t: Translate): string {
  if (platform === "email") {
    return t("socialEmail");
  }
  if (platform === "website") {
    return t("socialWebsite");
  }
  return SOCIAL_LABELS[platform] ?? platform;
}

/**
 * Turns a schema failure on a block field into a sentence that says what to do.
 * Server messages are raw Zod text, so the field decides the wording, not the message.
 */
export function blockErrorMessage(
  blockType: BioBlock["type"],
  field: string,
  code: string | undefined,
  t: Translate,
): string | undefined {
  if (!code) {
    return undefined;
  }
  const leaf = field.split(".").pop() ?? field;
  if (code === "imageRequired") {
    return t("blockError.imageRequired");
  }
  if (blockType === "link" && leaf === "label") {
    return t("blockError.linkLabel");
  }
  if (leaf === "destination" || leaf === "href") {
    return t("blockError.url");
  }
  if (blockType === "social" && field.startsWith("items") && leaf === "url") {
    return t("blockError.socialUrl");
  }
  if (blockType === "social" && field === "items") {
    return t("blockError.socialEmpty");
  }
  if (blockType === "header") {
    return t("blockError.heading");
  }
  if (blockType === "image" && leaf === "url") {
    return t("blockError.imageRequired");
  }
  if (blockType === "embed") {
    return t("blockError.embed");
  }
  if (leaf === "whatsappNumber") {
    return t("blockError.whatsapp");
  }
  if (leaf === "buttonLabel") {
    return t("blockError.buttonLabel");
  }
  return t("blockError.generic");
}

const EMBED_HOSTS: { provider: "youtube" | "spotify" | "vimeo"; pattern: RegExp }[] = [
  { provider: "youtube", pattern: /(^|\.)youtu(\.be|be\.com|be-nocookie\.com)$/i },
  { provider: "spotify", pattern: /(^|\.)spotify\.com$/i },
  { provider: "vimeo", pattern: /(^|\.)vimeo\.com$/i },
];

/** Picks the provider from a pasted link, so nobody has to match the dropdown by hand. */
function detectProvider(url: string): "youtube" | "spotify" | "vimeo" | null {
  try {
    const host = new URL(url.trim()).hostname;
    return EMBED_HOSTS.find((entry) => entry.pattern.test(host))?.provider ?? null;
  } catch {
    return null;
  }
}

/** Per-type editor body. The wrapper row owns reordering, visibility and deletion. */
export function BlockFields({ block, onChange, errors = {}, canForms = true }: BlockFieldsProps) {
  const t = useTranslations("bio");
  const err = (field: string) => blockErrorMessage(block.type, field, errors[field], t);

  if (block.type === "link") {
    const optionsSet = Boolean(
      block.iconName || block.iconUrl || block.highlighted || block.newTab === false,
    );
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("label")} info={t("labelInfo")} error={err("label")} required>
            <Input
              value={block.label}
              maxLength={120}
              placeholder={t("editor.linkLabelPlaceholder")}
              aria-invalid={Boolean(errors.label) || undefined}
              onChange={(event) => onChange({ ...block, label: event.target.value })}
            />
          </Field>
          <Field
            label={t("destination")}
            info={t("destinationInfo")}
            error={err("destination")}
            required
          >
            <Input
              value={block.destination}
              type="url"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://example.com"
              aria-invalid={Boolean(errors.destination) || undefined}
              onChange={(event) => onChange({ ...block, destination: event.target.value })}
            />
          </Field>
        </div>

        <Disclosure
          variant="plain"
          title={t("editor.linkOptions")}
          description={t("editor.linkOptionsDesc")}
          defaultOpen={optionsSet}
          contentClassName="flex flex-col gap-4"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
              {t("iconName")}
              <InfoTip inline label={t("iconName")}>
                {t("iconNameInfo")}
              </InfoTip>
            </span>
            <div role="radiogroup" aria-label={t("iconName")} className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={!block.iconName}
                onClick={() => onChange({ ...block, iconName: null })}
                className={cn(
                  "flex h-9 items-center justify-center rounded-default border px-3 text-[13px] font-medium transition-colors duration-150",
                  !block.iconName
                    ? "border-accent bg-accent-surface text-accent-on-surface"
                    : "border-border bg-bg text-fg-muted hover:bg-surface hover:text-ink",
                )}
              >
                {t("iconNone")}
              </button>
              {BIOPAGE_LINK_ICONS.map((name) => {
                const active = block.iconName === name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={name}
                    title={name}
                    onClick={() => onChange({ ...block, iconName: name })}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-default border transition-colors duration-150",
                      active
                        ? "border-accent bg-accent-surface text-accent-on-surface"
                        : "border-border bg-bg text-fg-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    <Icon name={name as IconName} className="text-sm" />
                  </button>
                );
              })}
            </div>
            <span className="text-[13px] text-fg-subtle">{t("iconNameHint")}</span>
          </div>

          <Field label={t("icon")} info={t("iconInfo")} hint={t("iconHint")}>
            <ImageUpload
              value={block.iconUrl ?? ""}
              onChange={(url) => onChange({ ...block, iconUrl: url === "" ? null : url })}
            />
          </Field>

          <div className="flex min-w-0 items-center justify-between gap-4 rounded-default border border-border-subtle bg-surface-subtle px-4 py-3">
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                {t("editor.highlight")}
                <InfoTip inline label={t("editor.highlight")}>
                  {t("emphasisInfo")}
                </InfoTip>
              </span>
              <span className="text-[13px] text-fg-muted">{t("editor.highlightDesc")}</span>
            </span>
            <Switch
              checked={block.highlighted}
              aria-label={t("editor.highlight")}
              onCheckedChange={(checked) => onChange({ ...block, highlighted: checked })}
            />
          </div>

          <div className="flex min-w-0 items-center justify-between gap-4 rounded-default border border-border-subtle bg-surface-subtle px-4 py-3">
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                {t("editor.newTab")}
                <InfoTip inline label={t("editor.newTab")}>
                  {t("newTabInfo")}
                </InfoTip>
              </span>
              <span className="text-[13px] text-fg-muted">{t("editor.newTabDesc")}</span>
            </span>
            <Switch
              checked={block.newTab !== false}
              aria-label={t("editor.newTab")}
              onCheckedChange={(checked) => onChange({ ...block, newTab: checked })}
            />
          </div>
        </Disclosure>
      </div>
    );
  }

  if (block.type === "social") {
    const itemsError = err("items");
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 flex items-center gap-1.5 text-[13px] text-fg-muted">
          {t("editor.socialIntro")}
          <InfoTip inline label={t("urlOrHandle")}>
            {t("urlOrHandleInfo")}
          </InfoTip>
        </p>
        {block.items.map((item, index) => {
          const itemError = err(`items.${index}.url`);
          return (
            <div key={index} className="flex min-w-0 flex-col gap-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="flex size-9.5 shrink-0 items-center justify-center rounded-default bg-surface text-fg-muted"
                  aria-hidden="true"
                >
                  <Icon name={socialIcon(item.platform)} className="text-sm" />
                </span>
                <Select
                  value={item.platform}
                  aria-label={t("platform")}
                  className="w-36 shrink-0"
                  onChange={(event) => {
                    const items = [...block.items];
                    items[index] = {
                      ...item,
                      platform: event.target.value as (typeof SOCIAL_PLATFORMS)[number],
                    };
                    onChange({ ...block, items });
                  }}
                >
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <option key={platform} value={platform}>
                      {platformLabel(platform, t)}
                    </option>
                  ))}
                </Select>
                <Input
                  value={item.url}
                  aria-label={t("urlOrHandle")}
                  placeholder={t(`editor.socialPlaceholder.${item.platform}`)}
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={Boolean(itemError) || undefined}
                  wrapperClassName="flex-1"
                  className="flex-1"
                  onChange={(event) => {
                    const items = [...block.items];
                    items[index] = { ...item, url: event.target.value };
                    onChange({ ...block, items });
                  }}
                />
                <Button
                  size="md"
                  variant="ghost"
                  icon
                  aria-label={t("removeProfile")}
                  disabled={block.items.length <= 1}
                  onClick={() =>
                    onChange({ ...block, items: block.items.filter((_, i) => i !== index) })
                  }
                >
                  <Icon name="xmark" className="text-sm" />
                </Button>
              </div>
              {itemError ? (
                <span role="alert" className="flex items-start gap-1.5 pl-11.5 text-[13px] text-danger">
                  <Icon name="circle-xmark" className="mt-0.5 text-xs" />
                  {itemError}
                </span>
              ) : null}
            </div>
          );
        })}

        {itemsError ? (
          <span role="alert" className="text-[13px] text-danger">
            {itemsError}
          </span>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            leadingIcon="plus"
            disabled={block.items.length >= 12}
            onClick={() =>
              onChange({ ...block, items: [...block.items, { platform: "website", url: "" }] })
            }
          >
            {t("addProfile")}
          </Button>
          <span className="text-[13px] text-fg-subtle">{t("urlOrHandleHint")}</span>
        </div>
      </div>
    );
  }

  if (block.type === "text") {
    return (
      <div className="flex flex-col gap-4">
        <Field
          label={t("body")}
          info={t("bodyInfo")}
          hint={t("editor.charCount", { count: block.body.length, max: 2000 })}
        >
          <Textarea
            rows={4}
            maxLength={2000}
            value={block.body}
            placeholder={t("editor.textPlaceholder")}
            onChange={(event) => onChange({ ...block, body: event.target.value })}
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
            {t("alignment")}
            <InfoTip inline label={t("alignment")}>
              {t("alignmentInfo")}
            </InfoTip>
          </span>
          <Segmented
            label={t("alignment")}
            value={block.align}
            onChange={(align) => onChange({ ...block, align })}
            items={[
              { id: "center", label: t("alignCenter") },
              { id: "left", label: t("alignLeft") },
            ]}
            className="self-start"
          />
        </div>
      </div>
    );
  }

  if (block.type === "header") {
    return (
      <Field label={t("heading")} info={t("headingInfo")} error={err("text")} required>
        <Input
          value={block.text}
          maxLength={120}
          placeholder={t("editor.headingPlaceholder")}
          aria-invalid={Boolean(errors.text) || undefined}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
        />
      </Field>
    );
  }

  if (block.type === "image") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("image")} info={t("imageInfo")} error={err("url")} required className="sm:col-span-2">
          <ImageUpload value={block.url} onChange={(url) => onChange({ ...block, url })} />
        </Field>
        <Field label={t("altText")} info={t("altTextInfo")} hint={t("altHint")}>
          <Input
            value={block.alt}
            maxLength={255}
            onChange={(event) => onChange({ ...block, alt: event.target.value })}
          />
        </Field>
        <Field
          label={t("linksTo")}
          info={t("linksToInfo")}
          hint={t("linksToHint")}
          error={err("href")}
          optional={t("editor.optional")}
        >
          <Input
            value={block.href ?? ""}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://example.com"
            aria-invalid={Boolean(errors.href) || undefined}
            onChange={(event) =>
              onChange({ ...block, href: event.target.value === "" ? null : event.target.value })
            }
          />
        </Field>
      </div>
    );
  }

  if (block.type === "embed") {
    const unsupported = block.url.trim() !== "" && !errors.url && embedSrc(block.provider, block.url) === null;
    return (
      <div className="flex flex-col gap-4">
        <Field
          label={t("shareUrl")}
          info={t("shareUrlInfo")}
          hint={unsupported ? undefined : t("shareUrlHint")}
          error={err("url") ?? (unsupported ? t("blockError.embedUnsupported") : undefined)}
          required
        >
          <Input
            value={block.url}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t("editor.embedPlaceholder")}
            aria-invalid={Boolean(errors.url) || unsupported || undefined}
            onChange={(event) => {
              const url = event.target.value;
              const detected = detectProvider(url);
              onChange({ ...block, url, provider: detected ?? block.provider });
            }}
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
            {t("provider")}
            <InfoTip inline label={t("provider")}>
              {t("providerInfo")}
            </InfoTip>
          </span>
          <Segmented
            label={t("provider")}
            value={block.provider}
            onChange={(provider) => onChange({ ...block, provider })}
            items={[
              { id: "youtube", label: "YouTube", icon: "youtube" },
              { id: "spotify", label: "Spotify" },
              { id: "vimeo", label: "Vimeo" },
            ]}
            className="self-start"
          />
        </div>
      </div>
    );
  }

  if (block.type === "form") {
    return (
      <div className="flex flex-col gap-4">
        {!canForms ? (
          <Callout
            tone="warn"
            title={t("editor.formsLocked")}
            actions={
              <Button size="sm" href="/billing" leadingIcon="rocket">
                {t("editor.seePlans")}
              </Button>
            }
          >
            {t("editor.formsLockedBody")}
          </Callout>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
            {t("formMode")}
            <InfoTip inline label={t("formMode")}>
              {t("formModeInfo")}
            </InfoTip>
          </span>
          <Segmented
            label={t("formMode")}
            value={block.mode}
            onChange={(mode) => onChange({ ...block, mode })}
            items={[
              { id: "email", label: t("formModeEmail"), icon: "envelope" },
              { id: "whatsapp", label: t("formModeWhatsapp"), icon: "whatsapp" },
            ]}
            className="self-start"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("formTitle")} info={t("formTitleInfo")} optional={t("editor.optional")}>
            <Input
              value={block.title}
              maxLength={120}
              placeholder={
                block.mode === "email"
                  ? t("editor.formTitlePlaceholder")
                  : t("editor.formTitlePlaceholderWhatsapp")
              }
              onChange={(event) => onChange({ ...block, title: event.target.value })}
            />
          </Field>
          <Field
            label={t("formButton")}
            info={t("formButtonInfo")}
            error={err("buttonLabel")}
            required
          >
            <Input
              value={block.buttonLabel}
              maxLength={40}
              aria-invalid={Boolean(errors.buttonLabel) || undefined}
              onChange={(event) => onChange({ ...block, buttonLabel: event.target.value })}
            />
          </Field>
          {block.mode === "whatsapp" ? (
            <Field
              label={t("formWhatsapp")}
              info={t("formWhatsappInfo")}
              hint={t("formWhatsappHint")}
              error={err("whatsappNumber")}
              required
              className="sm:col-span-2"
            >
              <Input
                value={block.whatsappNumber ?? ""}
                type="tel"
                inputMode="tel"
                placeholder="+905551112233"
                aria-invalid={Boolean(errors.whatsappNumber) || undefined}
                onChange={(event) =>
                  onChange({
                    ...block,
                    whatsappNumber: event.target.value === "" ? null : event.target.value,
                  })
                }
              />
            </Field>
          ) : (
            <Field
              label={t("formSuccess")}
              info={t("formSuccessInfo")}
              optional={t("editor.optional")}
              className="sm:col-span-2"
            >
              <Input
                value={block.successMessage ?? ""}
                maxLength={200}
                placeholder={t("editor.formSuccessPlaceholder")}
                onChange={(event) => onChange({ ...block, successMessage: event.target.value })}
              />
            </Field>
          )}
        </div>
        {block.mode === "email" ? (
          <p className="m-0 text-[13px] text-fg-subtle">{t("editor.formLeadsNote")}</p>
        ) : null}
      </div>
    );
  }

  return <p className="m-0 text-sm text-fg-muted">{t("dividerNoSettings")}</p>;
}
