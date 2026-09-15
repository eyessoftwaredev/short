"use client";

import { SOCIAL_PLATFORMS, type BioBlock } from "@short/core";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { SOCIAL_LABELS } from "@/components/bio/bio-icons";

type BlockFieldsProps = {
  block: BioBlock;
  onChange: (next: BioBlock) => void;
};

/** Per-type editor body. The wrapper row owns reordering, visibility and deletion. */
export function BlockFields({ block, onChange }: BlockFieldsProps) {
  if (block.type === "link") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label">
          <Input
            value={block.label}
            maxLength={120}
            onChange={(event) => onChange({ ...block, label: event.target.value })}
          />
        </Field>
        <Field label="Destination">
          <Input
            value={block.destination}
            placeholder="https://acme.com/shop"
            onChange={(event) => onChange({ ...block, destination: event.target.value })}
          />
        </Field>
        <Field label="Icon URL" hint="Optional 24px square image shown before the label.">
          <Input
            value={block.iconUrl ?? ""}
            placeholder="https://cdn.acme.com/icon.png"
            onChange={(event) =>
              onChange({ ...block, iconUrl: event.target.value === "" ? null : event.target.value })
            }
          />
        </Field>
        <Field label="Emphasis">
          <Select
            value={block.highlighted ? "highlight" : "normal"}
            onChange={(event) =>
              onChange({ ...block, highlighted: event.target.value === "highlight" })
            }
          >
            <option value="normal">Normal</option>
            <option value="highlight">Highlighted</option>
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
            <Field label={index === 0 ? "Platform" : undefined} className="w-40">
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
                    {SOCIAL_LABELS[platform] ?? platform}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={index === 0 ? "URL or handle" : undefined}
              className="min-w-48 flex-1"
              hint={
                index === 0
                  ? "Email addresses and phone numbers are turned into mailto: and wa.me links."
                  : undefined
              }
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
              aria-label="Remove profile"
              disabled={block.items.length <= 1}
              onClick={() =>
                onChange({ ...block, items: block.items.filter((_, i) => i !== index) })
              }
            >
              <Trash2 className="size-4" />
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
          <Plus className="size-4" />
          Add profile
        </Button>
      </div>
    );
  }

  if (block.type === "text") {
    return (
      <div className="flex flex-col gap-4">
        <Field label="Body">
          <Textarea
            rows={4}
            maxLength={2000}
            value={block.body}
            onChange={(event) => onChange({ ...block, body: event.target.value })}
          />
        </Field>
        <Field label="Alignment" className="max-w-40">
          <Select
            value={block.align}
            onChange={(event) =>
              onChange({ ...block, align: event.target.value as "left" | "center" })
            }
          >
            <option value="center">Center</option>
            <option value="left">Left</option>
          </Select>
        </Field>
      </div>
    );
  }

  if (block.type === "header") {
    return (
      <Field label="Heading">
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
        <Field label="Image URL">
          <Input
            value={block.url}
            placeholder="https://cdn.acme.com/banner.jpg"
            onChange={(event) => onChange({ ...block, url: event.target.value })}
          />
        </Field>
        <Field label="Alt text" hint="Describe the image for screen readers.">
          <Input
            value={block.alt}
            maxLength={255}
            onChange={(event) => onChange({ ...block, alt: event.target.value })}
          />
        </Field>
        <Field label="Links to" className="sm:col-span-2" hint="Leave empty for a plain image.">
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
        <Field label="Provider">
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
        <Field label="Share URL" hint="Paste the normal watch or track link.">
          <Input
            value={block.url}
            onChange={(event) => onChange({ ...block, url: event.target.value })}
          />
        </Field>
      </div>
    );
  }

  return <p className="m-0 text-sm text-fg-muted">A divider has no settings.</p>;
}
