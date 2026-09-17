"use client";

import { Icon } from "@/components/kit/icon";

import { SOCIAL_PLATFORMS, type BioBlock } from "@short/core";
import { useTranslations } from "next-intl";
import { ImageUpload } from "@/components/media/image-upload";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { SOCIAL_LABELS } from "@/components/bio/bio-icons";

type BlockFieldsProps = {
  block: BioBlock;
  onChange: (next: BioBlock) => void;
};

function platformLabel(
  platform: string,
  t: (key: string) => string,
): string {
  if (platform === "email") {
    return t("socialEmail");
  }
  if (platform === "website") {
    return t("socialWebsite");
  }
  return SOCIAL_LABELS[platform] ?? platform;
}

/** Per-type editor body. The wrapper row owns reordering, visibility and deletion. */
export function BlockFields({ block, onChange }: BlockFieldsProps) {
  const t = useTranslations("bio");

  if (block.type === "link") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("label")}>
          <Input
            value={block.label}
            maxLength={120}
            onChange={(event) => onChange({ ...block, label: event.target.value })}
          />
        </Field>
        <Field label={t("destination")}>
          <Input
            value={block.destination}
            placeholder="https://acme.com/shop"
            onChange={(event) => onChange({ ...block, destination: event.target.value })}
          />
        </Field>
        <Field label={t("icon")} hint={t("iconHint")}>
          <ImageUpload
            value={block.iconUrl ?? ""}
            onChange={(url) => onChange({ ...block, iconUrl: url === "" ? null : url })}
          />
        </Field>
        <Field label={t("emphasis")}>
          <Select
            value={block.highlighted ? "highlight" : "normal"}
            onChange={(event) =>
              onChange({ ...block, highlighted: event.target.value === "highlight" })
            }
          >
            <option value="normal">{t("normal")}</option>
            <option value="highlight">{t("highlighted")}</option>
          </Select>
        </Field>
      </div>
    );
  }

  if (block.type === "social") {
    return (
      <div className="flex flex-col gap-3">
        {block.items.map((item, index) => (
          <div key={`${item.platform}-${index}`} className="flex flex-wrap items-end gap-2">
            <Field label={index === 0 ? t("platform") : undefined} className="w-40">
              <Select
                value={item.platform}
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
            </Field>
            <Field
              label={index === 0 ? t("urlOrHandle") : undefined}
              className="min-w-48 flex-1"
              hint={index === 0 ? t("urlOrHandleHint") : undefined}
            >
              <Input
                value={item.url}
                onChange={(event) => {
                  const items = [...block.items];
                  items[index] = { ...item, url: event.target.value };
                  onChange({ ...block, items });
                }}
              />
            </Field>
            <Button
              size="sm"
              icon
              aria-label={t("removeProfile")}
              disabled={block.items.length <= 1}
              onClick={() =>
                onChange({ ...block, items: block.items.filter((_, i) => i !== index) })
              }
            >
              <Icon name="trash" className="text-sm" />
            </Button>
          </div>
        ))}

        <Button
          size="sm"
          className="self-start"
          disabled={block.items.length >= 12}
          onClick={() =>
            onChange({ ...block, items: [...block.items, { platform: "website", url: "" }] })
          }
        >
          <Icon name="plus" className="text-sm" />
          {t("addProfile")}
        </Button>
      </div>
    );
  }

  if (block.type === "text") {
    return (
      <div className="flex flex-col gap-4">
        <Field label={t("body")}>
          <Textarea
            rows={4}
            maxLength={2000}
            value={block.body}
            onChange={(event) => onChange({ ...block, body: event.target.value })}
          />
        </Field>
        <Field label={t("alignment")} className="max-w-40">
          <Select
            value={block.align}
            onChange={(event) =>
              onChange({ ...block, align: event.target.value as "left" | "center" })
            }
          >
            <option value="center">{t("alignCenter")}</option>
            <option value="left">{t("alignLeft")}</option>
          </Select>
        </Field>
      </div>
    );
  }

  if (block.type === "header") {
    return (
      <Field label={t("heading")}>
        <Input
          value={block.text}
          maxLength={120}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
        />
      </Field>
    );
  }

  if (block.type === "image") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("image")}>
          <ImageUpload
            value={block.url}
            onChange={(url) => onChange({ ...block, url })}
          />
        </Field>
        <Field label={t("altText")} hint={t("altHint")}>
          <Input
            value={block.alt}
            maxLength={255}
            onChange={(event) => onChange({ ...block, alt: event.target.value })}
          />
        </Field>
        <Field label={t("linksTo")} className="sm:col-span-2" hint={t("linksToHint")}>
          <Input
            value={block.href ?? ""}
            placeholder="https://acme.com/campaign"
            onChange={(event) =>
              onChange({ ...block, href: event.target.value === "" ? null : event.target.value })
            }
          />
        </Field>
      </div>
    );
  }

  if (block.type === "embed") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("provider")}>
          <Select
            value={block.provider}
            onChange={(event) =>
              onChange({
                ...block,
                provider: event.target.value as "youtube" | "spotify" | "vimeo",
              })
            }
          >
            <option value="youtube">YouTube</option>
            <option value="spotify">Spotify</option>
            <option value="vimeo">Vimeo</option>
          </Select>
        </Field>
        <Field label={t("shareUrl")} hint={t("shareUrlHint")}>
          <Input
            value={block.url}
            onChange={(event) => onChange({ ...block, url: event.target.value })}
          />
        </Field>
      </div>
    );
  }

  return <p className="m-0 text-sm text-fg-muted">{t("dividerNoSettings")}</p>;
}
