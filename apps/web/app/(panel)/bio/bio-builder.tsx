"use client";

import { Icon } from "@/components/kit/icon";

import {
  BIOPAGE_BUTTON_STYLES,
  BIOPAGE_FONTS,
  BIOPAGE_TEMPLATE_PRESETS,
  BIOPAGE_TEMPLATES,
  BIOPAGE_THEMES,
  isBiopageLive,
  type BioBlock,
  type BioBlockType,
} from "@short/core";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useActionMessage } from "@/lib/action-message";
import { useForm } from "react-hook-form";
import { BioPageView } from "@/components/bio/bio-page-view";
import { ImageUpload } from "@/components/media/image-upload";
import {
  Badge,
  Button,
  Card,
  Chip,
  CopyButton,
  DateTimePicker,
  Field,
  Input,
  SaveBar,
  SecretInput,
  Section,
  Select,
  Switch,
  TabPanel,
  Tabs,
  Textarea,
  type TabItem,
} from "@/components/ui";
import { cn } from "@/lib/cx";
import { bioFormSchema, newBlock, type BioFormValues } from "@/lib/bio-form";
import { BlockFields } from "./block-fields";
import {
  createBiopageAction,
  deleteBiopageAction,
  updateBiopageAction,
  updateBiopagePublishedAction,
} from "./actions";

export type BioDomainOption = { id: string; hostname: string };

type BioBuilderProps = {
  mode: "create" | "edit";
  biopageId?: string;
  defaultValues: BioFormValues;
  domains: BioDomainOption[];
  platformHostname: string;
  canCustomCss?: boolean;
  canForms?: boolean;
};

type TabId = "blocks" | "profile" | "design" | "ads" | "access" | "seo";

const ADDABLE: BioBlockType[] = [
  "link",
  "social",
  "header",
  "text",
  "image",
  "embed",
  "form",
  "divider",
];

const BLOCK_KEYS = {
  link: "block.link",
  social: "block.social",
  text: "block.text",
  header: "block.header",
  image: "block.image",
  embed: "block.embed",
  form: "block.form",
  divider: "block.divider",
} as const;

const THEME_KEYS = {
  minimal: "themeName.minimal",
  midnight: "themeName.midnight",
  sunset: "themeName.sunset",
  forest: "themeName.forest",
  mono: "themeName.mono",
  candy: "themeName.candy",
} as const;

const BUTTON_STYLE_KEYS = {
  solid: "buttonStyleName.solid",
  outline: "buttonStyleName.outline",
  soft: "buttonStyleName.soft",
  pill: "buttonStyleName.pill",
} as const;

const TEMPLATE_KEYS = {
  minimal: "templateName.minimal",
  midnight: "templateName.midnight",
  sunset: "templateName.sunset",
  forest: "templateName.forest",
  mono: "templateName.mono",
  candy: "templateName.candy",
  glass: "templateName.glass",
  neon: "templateName.neon",
} as const;

const FONT_KEYS = {
  sans: "fontName.sans",
  serif: "fontName.serif",
  mono: "fontName.mono",
  inter: "fontName.inter",
  poppins: "fontName.poppins",
  playfair: "fontName.playfair",
  space: "fontName.space",
} as const;

function bioFieldError(
  message: string | undefined,
  t: (key: string) => string,
  te: (key: string) => string,
): string | undefined {
  if (!message) {
    return undefined;
  }
  if (message === "displayNameRequired") {
    return t("displayNameRequired");
  }
  if (message === "handleReserved") {
    return t("handleReserved");
  }
  if (message === "handlePattern") {
    return t("handlePattern");
  }
  return te("validation");
}

function hexToPicker(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return /^#[0-9a-fA-F]{6}$/.test(fallback) ? fallback : "#000000";
}

function ColorField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex min-w-0 items-center gap-2">
        <input
          type="color"
          value={hexToPicker(value, placeholder)}
          aria-label={label}
          className="size-10 shrink-0 cursor-pointer rounded-default border border-border bg-bg p-1"
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          value={value}
          placeholder={placeholder}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </Field>
  );
}

function FlagRow({
  title,
  hint,
  checked,
  onCheckedChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-default border border-border bg-surface px-4 py-3.5">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-fg-muted">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function hostLabel(value: string): string {
  return value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/.*$/, "").split(":")[0] ?? value;
}

function describeBlock(block: BioBlock, t: (key: string, values?: { count: number }) => string): string {
  switch (block.type) {
    case "link":
      return block.label || t("untitledLink");
    case "social":
      return t("profilesCount", { count: block.items.length });
    case "text":
      return block.body.slice(0, 48) || t("emptyText");
    case "header":
      return block.text || t("untitledHeading");
    case "image":
      return block.alt || block.url;
    case "embed":
      return `${block.provider} · ${block.url}`;
    case "form":
      return block.title || t("block.form");
    default:
      return t("block.divider");
  }
}

type BlockRowProps = {
  block: BioBlock;
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: BioBlock) => void;
  onRemove: () => void;
};

function BlockRow({ block, expanded, onToggle, onChange, onRemove }: BlockRowProps) {
  const t = useTranslations("bio");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={
        isDragging
          ? "rounded-default border border-accent bg-bg shadow-lift"
          : "rounded-default border border-border bg-bg"
      }
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          aria-label={t("reorder")}
          className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-default border-0 bg-transparent text-fg-subtle hover:bg-surface"
          {...attributes}
          {...listeners}
        >
          <Icon name="grip" className="text-sm" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2.5 border-0 bg-transparent text-left"
        >
          <Badge tone="muted">{t(BLOCK_KEYS[block.type])}</Badge>
          <span className="min-w-0 flex-1 truncate text-sm">{describeBlock(block, t)}</span>
        </button>

        <Button
          size="sm"
          icon
          aria-label={block.visible ? t("hideBlock") : t("showBlock")}
          onClick={() => onChange({ ...block, visible: !block.visible })}
        >
          {block.visible ? <Icon name="eye" className="text-sm" /> : <Icon name="eye-slash" className="text-sm" />}
        </Button>
        <Button size="sm" icon aria-label={t("removeBlock")} onClick={onRemove}>
          <Icon name="trash" className="text-sm" />
        </Button>
        <Button size="sm" icon aria-label={expanded ? t("collapse") : t("expand")} onClick={onToggle}>
          {expanded ? <Icon name="chevron-up" className="text-sm" /> : <Icon name="chevron-down" className="text-sm" />}
        </Button>
      </div>

      {expanded ? (
        <div className="border-t border-border-subtle px-4 py-4">
          <BlockFields block={block} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}

export function BioBuilder({
  mode,
  biopageId,
  defaultValues,
  domains,
  platformHostname,
  canCustomCss = false,
  canForms = false,
}: BioBuilderProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("bio");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const [tab, setTab] = useState<TabId>("blocks");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const tabs: TabItem<TabId>[] = [
    { id: "blocks", label: t("tabBlocks") },
    { id: "profile", label: t("tabProfile") },
    { id: "design", label: t("tabDesign") },
    { id: "ads", label: t("tabAds") },
    { id: "access", label: t("tabAccess") },
    { id: "seo", label: t("tabSeo") },
  ];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<BioFormValues>({
    resolver: zodResolver(bioFormSchema),
    defaultValues,
  });

  const passwordField = register("password");
  const values = watch();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const hostname = useMemo(
    () =>
      hostLabel(
        domains.find((domain) => domain.id === values.domainId)?.hostname ?? platformHostname,
      ),
    [domains, platformHostname, values.domainId],
  );
  const publicUrl = `https://${hostname}/${values.handle || "handle"}`;
  const pageIsLive = isBiopageLive({
    published: values.published,
    publishAt: values.publishAt || null,
    unpublishAt: values.unpublishAt || null,
  });
  const liveTone = !values.published ? "draft" : pageIsLive ? "live" : "scheduled";

  function setBlocks(next: BioBlock[]): void {
    setValue(
      "blocks",
      next.map((block, index) => ({ ...block, position: index })),
      { shouldDirty: true },
    );
  }

  function onDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const from = values.blocks.findIndex((block) => block.id === active.id);
    const to = values.blocks.findIndex((block) => block.id === over.id);
    if (from === -1 || to === -1) {
      return;
    }
    setBlocks(arrayMove(values.blocks, from, to));
  }

  function addBlock(type: BioBlockType): void {
    const block = newBlock(type, values.blocks.length);
    if (block.type === "link") {
      block.label = t("newLinkLabel");
    } else if (block.type === "header") {
      block.text = t("section");
    }
    setBlocks([...values.blocks, block]);
    setExpanded(block.id);
    setTab("blocks");
  }

  const onSubmit = handleSubmit(async (formValues) => {
    setFormError(null);
    const result =
      mode === "create"
        ? await createBiopageAction(formValues)
        : await updateBiopageAction(biopageId ?? "", formValues);

    if (!result.ok) {
      setFormError(
        result.error === "handle_taken"
          ? te("handle_taken", { handle: formValues.handle })
          : actionMessage(result.error),
      );
      return;
    }

    if (mode === "create") {
      router.push(`/bio/${result.data.id}/edit`);
      return;
    }
    reset(formValues);
    router.refresh();
  });

  async function remove(): Promise<void> {
    if (!biopageId || !window.confirm(t("deleteConfirm"))) {
      return;
    }
    setDeleting(true);
    const result = await deleteBiopageAction(biopageId);
    if (!result.ok) {
      setFormError(actionMessage(result.error));
      setDeleting(false);
      return;
    }
    router.push("/bio");
  }

  return (
    <form
      className="flex min-w-0 flex-col gap-6"
      autoComplete="off"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Tabs items={tabs} value={tab} onChange={setTab} />

          <TabPanel active={tab === "blocks"}>
            <Card staticHover className="gap-5">
              <Section headingLevel={3} title={t("tabBlocks")} description={t("blocksDesc")}>
                <div className="flex flex-wrap gap-2">
                  {ADDABLE.filter((type) => type !== "form" || canForms).map((type) => (
                    <Chip key={type} onClick={() => addBlock(type)}>
                      <Icon name="plus" className="text-xs" />
                      {t(BLOCK_KEYS[type])}
                    </Chip>
                  ))}
                </div>
              </Section>
              {values.blocks.length === 0 ? (
                <p className="m-0 rounded-default border border-dashed border-border px-5 py-12 text-center text-sm text-fg-muted">
                  {t("noBlocks")}
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={values.blocks.map((block) => block.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-2">
                      {values.blocks.map((block) => (
                        <BlockRow
                          key={block.id}
                          block={block}
                          expanded={expanded === block.id}
                          onToggle={() => setExpanded(expanded === block.id ? null : block.id)}
                          onChange={(next) =>
                            setBlocks(
                              values.blocks.map((item) => (item.id === block.id ? next : item)),
                            )
                          }
                          onRemove={() =>
                            setBlocks(values.blocks.filter((item) => item.id !== block.id))
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </Card>
          </TabPanel>

          <TabPanel active={tab === "profile"} className="flex flex-col gap-4">
            <Card staticHover className="gap-5">
              <Section headingLevel={3} title={t("identity")} description={t("identityDesc")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t("handle")}
                    error={bioFieldError(errors.handle?.message, t, te)}
                    hint={t("handleHint", { url: publicUrl })}
                  >
                    <Input placeholder="acme" {...register("handle")} />
                  </Field>
                  <Field label={t("domain")} hint={t("domainHint")}>
                    <Select {...register("domainId")}>
                      <option value="">{hostLabel(platformHostname)}</option>
                      {domains.map((domain) => (
                        <option key={domain.id} value={domain.id}>
                          {hostLabel(domain.hostname)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t("displayName")} error={bioFieldError(errors.displayName?.message, t, te)}>
                    <Input placeholder="Acme Studio" {...register("displayName")} />
                  </Field>
                  <Field
                    label={t("bio")}
                    className="sm:col-span-2"
                    error={bioFieldError(errors.bio?.message, t, te)}
                  >
                    <Textarea rows={3} maxLength={500} {...register("bio")} />
                  </Field>
                </div>
              </Section>
            </Card>

            <Card staticHover className="gap-5">
              <Section headingLevel={3} title={t("profileMedia")} description={t("profileMediaDesc")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("profileMode")} className="sm:col-span-2">
                    <Select
                      value={values.profileMode}
                      onChange={(event) =>
                        setValue(
                          "profileMode",
                          event.target.value as BioFormValues["profileMode"],
                          { shouldDirty: true },
                        )
                      }
                    >
                      <option value="photo">{t("profilePhoto")}</option>
                      <option value="text">{t("profileTextMode")}</option>
                      <option value="logo">{t("profileLogo")}</option>
                    </Select>
                  </Field>
                  {values.profileMode === "photo" ? (
                    <Field label={t("avatar")} error={bioFieldError(errors.avatarUrl?.message, t, te)}>
                      <ImageUpload
                        value={values.avatarUrl}
                        onChange={(url) => setValue("avatarUrl", url, { shouldDirty: true })}
                      />
                    </Field>
                  ) : null}
                  {values.profileMode === "logo" ? (
                    <Field label={t("logo")}>
                      <ImageUpload
                        value={values.logoUrl}
                        onChange={(url) => setValue("logoUrl", url, { shouldDirty: true })}
                      />
                    </Field>
                  ) : null}
                  {values.profileMode === "text" ? (
                    <Field label={t("profileTextLabel")}>
                      <Input maxLength={40} {...register("profileText")} />
                    </Field>
                  ) : null}
                  <Field label={t("cover")}>
                    <ImageUpload
                      value={values.coverUrl}
                      onChange={(url) => setValue("coverUrl", url, { shouldDirty: true })}
                    />
                  </Field>
                </div>
              </Section>
            </Card>
          </TabPanel>

          <TabPanel active={tab === "design"} className="flex flex-col gap-4">
            <Card staticHover className="gap-5">
              <Section headingLevel={3} title={t("templates")} description={t("templatesDesc")}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {BIOPAGE_TEMPLATES.map((id) => {
                    const active = values.templateId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          const preset = BIOPAGE_TEMPLATE_PRESETS[id];
                          setValue("templateId", id, { shouldDirty: true });
                          setValue("theme", preset.theme, { shouldDirty: true });
                          setValue("buttonStyle", preset.buttonStyle, { shouldDirty: true });
                          setValue("fontFamily", preset.fontFamily, { shouldDirty: true });
                          setValue("bgType", preset.bgType, { shouldDirty: true });
                          setValue("bgColor", preset.bgColor ?? "", { shouldDirty: true });
                          setValue("bgGradient", preset.bgGradient ?? "", { shouldDirty: true });
                          setValue("buttonColor", preset.buttonColor ?? "", { shouldDirty: true });
                          setValue("buttonTextColor", preset.buttonTextColor ?? "", {
                            shouldDirty: true,
                          });
                          setValue("textColor", preset.textColor ?? "", { shouldDirty: true });
                        }}
                        className={cn(
                          "rounded-default border px-3 py-3 text-left text-sm font-medium transition duration-150",
                          active
                            ? "border-accent bg-accent-tint text-accent-ink"
                            : "border-border bg-bg text-ink hover:bg-surface",
                        )}
                      >
                        {t(TEMPLATE_KEYS[id])}
                      </button>
                    );
                  })}
                </div>
              </Section>
            </Card>

            <Card staticHover className="gap-5">
              <Section headingLevel={3} title={t("theme")} description={t("themeDesc")}>
                <div className="flex flex-wrap gap-2">
                  {BIOPAGE_THEMES.map((theme) => (
                    <Chip
                      key={theme}
                      active={values.theme === theme}
                      onClick={() => setValue("theme", theme, { shouldDirty: true })}
                    >
                      {t(THEME_KEYS[theme])}
                    </Chip>
                  ))}
                </div>
              </Section>
              <Section headingLevel={3} title={t("buttonStyle")} description={t("buttonStyleDesc")}>
                <div className="flex flex-wrap gap-2">
                  {BIOPAGE_BUTTON_STYLES.map((style) => (
                    <Chip
                      key={style}
                      active={values.buttonStyle === style}
                      onClick={() => setValue("buttonStyle", style, { shouldDirty: true })}
                    >
                      {t(BUTTON_STYLE_KEYS[style])}
                    </Chip>
                  ))}
                </div>
              </Section>
              <Field label={t("fontFamily")}>
                <Select {...register("fontFamily")}>
                  {BIOPAGE_FONTS.map((font) => (
                    <option key={font} value={font}>
                      {t(FONT_KEYS[font])}
                    </option>
                  ))}
                </Select>
              </Field>
            </Card>

            <Card staticHover className="gap-5">
              <Section headingLevel={3} title={t("background")} description={t("backgroundDesc")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("bgType")}>
                    <Select
                      value={values.bgType}
                      onChange={(event) =>
                        setValue("bgType", event.target.value as BioFormValues["bgType"], {
                          shouldDirty: true,
                        })
                      }
                    >
                      <option value="theme">{t("bgTheme")}</option>
                      <option value="color">{t("bgColor")}</option>
                      <option value="gradient">{t("bgGradient")}</option>
                      <option value="image">{t("bgImage")}</option>
                    </Select>
                  </Field>
                  {values.bgType === "color" ? (
                    <ColorField
                      label={t("bgColorValue")}
                      value={values.bgColor}
                      placeholder="#111111"
                      onChange={(value) => setValue("bgColor", value, { shouldDirty: true })}
                    />
                  ) : null}
                  {values.bgType === "gradient" ? (
                    <Field label={t("bgGradientValue")} className="sm:col-span-2">
                      <Input {...register("bgGradient")} />
                    </Field>
                  ) : null}
                  {values.bgType === "image" ? (
                    <Field label={t("bgImage")} className="sm:col-span-2">
                      <ImageUpload
                        value={values.bgImageUrl}
                        onChange={(url) => setValue("bgImageUrl", url, { shouldDirty: true })}
                      />
                    </Field>
                  ) : null}
                  <ColorField
                    label={t("buttonColor")}
                    value={values.buttonColor}
                    placeholder="#0f766e"
                    onChange={(value) => setValue("buttonColor", value, { shouldDirty: true })}
                  />
                  <ColorField
                    label={t("buttonTextColor")}
                    value={values.buttonTextColor}
                    placeholder="#ffffff"
                    onChange={(value) => setValue("buttonTextColor", value, { shouldDirty: true })}
                  />
                  <ColorField
                    label={t("textColor")}
                    value={values.textColor}
                    placeholder="#171717"
                    onChange={(value) => setValue("textColor", value, { shouldDirty: true })}
                  />
                </div>
              </Section>
            </Card>

            <Card staticHover className="gap-5">
              {canCustomCss ? (
                <Field label={t("customCss")} hint={t("customCssHint")}>
                  <Textarea rows={5} maxLength={4000} {...register("customCss")} />
                </Field>
              ) : (
                <p className="m-0 text-sm text-fg-muted">{t("customCssPaywall")}</p>
              )}
            </Card>
          </TabPanel>

          <TabPanel active={tab === "ads"} className="flex flex-col gap-4">
            <Card staticHover className="gap-5">
              <FlagRow
                title={t("adsEnabled")}
                hint={t("adsEnabledHint")}
                checked={values.adsEnabled}
                onCheckedChange={(checked) => setValue("adsEnabled", checked, { shouldDirty: true })}
              />
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="flex min-w-0 flex-col gap-3 rounded-default border border-border px-4 py-4">
                  <span className="text-sm font-medium">{t("adMobile")}</span>
                  <ImageUpload
                    value={values.adMobileImage}
                    onChange={(url) => setValue("adMobileImage", url, { shouldDirty: true })}
                  />
                  <Field label={t("adMobileHref")}>
                    <Input {...register("adMobileHref")} />
                  </Field>
                </div>
                <div className="flex min-w-0 flex-col gap-3 rounded-default border border-border px-4 py-4">
                  <span className="text-sm font-medium">{t("adLeft")}</span>
                  <ImageUpload
                    value={values.adLeftImage}
                    onChange={(url) => setValue("adLeftImage", url, { shouldDirty: true })}
                  />
                  <Field label={t("adLeftHref")}>
                    <Input {...register("adLeftHref")} />
                  </Field>
                </div>
                <div className="flex min-w-0 flex-col gap-3 rounded-default border border-border px-4 py-4">
                  <span className="text-sm font-medium">{t("adRight")}</span>
                  <ImageUpload
                    value={values.adRightImage}
                    onChange={(url) => setValue("adRightImage", url, { shouldDirty: true })}
                  />
                  <Field label={t("adRightHref")}>
                    <Input {...register("adRightHref")} />
                  </Field>
                </div>
              </div>
            </Card>
          </TabPanel>

          <TabPanel active={tab === "access"} className="flex flex-col gap-4">
            <Card staticHover className="gap-5">
              <div
                className={cn(
                  "flex items-center justify-between gap-3 rounded-default border px-4 py-3",
                  liveTone === "live" && "border-accent bg-accent-tint",
                  liveTone === "scheduled" && "border-border-strong bg-surface",
                  liveTone === "draft" && "border-border bg-surface",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {liveTone === "live"
                      ? t("statusLive")
                      : liveTone === "scheduled"
                        ? t("statusScheduled")
                        : t("statusDraft")}
                  </span>
                  <span className="block text-sm text-fg-muted">{t("publishedHint")}</span>
                </span>
                <Badge tone={liveTone === "live" ? "accent" : liveTone === "scheduled" ? "warn" : "muted"}>
                  {liveTone === "live" ? t("published") : liveTone === "scheduled" ? t("scheduled") : t("draft")}
                </Badge>
              </div>
              <FlagRow
                title={t("published")}
                hint={t("publishedNowHint")}
                checked={values.published}
                onCheckedChange={(checked) => {
                  setValue("published", checked, { shouldDirty: true });
                  if (checked) {
                    setValue("publishAt", "", { shouldDirty: true });
                    setValue("unpublishAt", "", { shouldDirty: true });
                  }
                  if (mode !== "edit" || !biopageId) {
                    return;
                  }
                  void updateBiopagePublishedAction(biopageId, checked).then((result) => {
                    if (!result.ok) {
                      setValue("published", !checked, { shouldDirty: true });
                      setFormError(actionMessage(result.error));
                    }
                  });
                }}
              />
            </Card>

            <Card staticHover className="gap-5">
              <Section headingLevel={3} title={t("schedule")} description={t("scheduleDesc")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-sm font-medium">{t("publishAt")}</span>
                    <DateTimePicker
                      value={values.publishAt}
                      onChange={(next) => setValue("publishAt", next, { shouldDirty: true })}
                      locale={locale}
                      placeholder={t("pickDateTime")}
                      clearLabel={t("clearSchedule")}
                      prevLabel={t("prevMonth")}
                      nextLabel={t("nextMonth")}
                      hourLabel={t("hour")}
                      minuteLabel={t("minute")}
                    />
                    <span className="text-xs text-fg-subtle">{t("publishAtHint")}</span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-sm font-medium">{t("unpublishAt")}</span>
                    <DateTimePicker
                      value={values.unpublishAt}
                      onChange={(next) => setValue("unpublishAt", next, { shouldDirty: true })}
                      locale={locale}
                      placeholder={t("pickDateTime")}
                      clearLabel={t("clearSchedule")}
                      prevLabel={t("prevMonth")}
                      nextLabel={t("nextMonth")}
                      hourLabel={t("hour")}
                      minuteLabel={t("minute")}
                    />
                  </div>
                </div>
              </Section>
            </Card>

            <Card staticHover className="gap-5">
              <Section headingLevel={3} title={t("gates")} description={t("gatesDesc")}>
                <div className="flex flex-col gap-4">
                  <FlagRow
                    title={t("sensitive")}
                    hint={t("sensitiveHint")}
                    checked={values.sensitive}
                    onCheckedChange={(checked) => setValue("sensitive", checked, { shouldDirty: true })}
                  />
                  <Field
                    label={values.hasPassword ? t("passwordReplace") : t("password")}
                    hint={t("passwordHint")}
                  >
                    <SecretInput
                      domName="bio-gate-password"
                      ref={passwordField.ref}
                      onChange={passwordField.onChange}
                      onBlur={passwordField.onBlur}
                    />
                  </Field>
                  {values.hasPassword ? (
                    <FlagRow
                      title={t("removePassword")}
                      hint={t("removePasswordHint")}
                      checked={values.removePassword}
                      onCheckedChange={(checked) =>
                        setValue("removePassword", checked, { shouldDirty: true })
                      }
                    />
                  ) : null}
                </div>
              </Section>
            </Card>
          </TabPanel>

          <TabPanel active={tab === "seo"}>
            <Card staticHover className="gap-5">
              <Section headingLevel={3} title={t("tabSeo")} description={t("seoDesc")}>
                <div className="flex flex-col gap-4">
                  <Field
                    label={t("seoTitle")}
                    hint={t("seoTitleHint")}
                    error={bioFieldError(errors.seoTitle?.message, t, te)}
                  >
                    <Input maxLength={120} {...register("seoTitle")} />
                  </Field>
                  <Field
                    label={t("seoDescription")}
                    hint={t("seoDescriptionHint")}
                    error={bioFieldError(errors.seoDescription?.message, t, te)}
                  >
                    <Textarea rows={3} maxLength={300} {...register("seoDescription")} />
                  </Field>
                  <Field label={t("ogImage")} hint={t("ogImageHint")}>
                    <ImageUpload
                      value={values.ogImageUrl}
                      onChange={(url) => setValue("ogImageUrl", url, { shouldDirty: true })}
                    />
                  </Field>
                </div>
              </Section>
            </Card>
          </TabPanel>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
          <Card staticHover className="items-center gap-4">
            <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
              {t("livePreview")}
            </span>
            {/* Phone frame follows the Sec25Mobile pattern: fixed aspect, scrollable body. */}
            <div className="h-144 w-full max-w-80 overflow-y-auto rounded-default border border-border-strong">
              <BioPageView
                embedded
                page={{
                  id: biopageId ?? "preview",
                  handle: values.handle,
                  displayName: values.displayName || t("yourName"),
                  bio: values.bio,
                  avatarUrl: values.avatarUrl === "" ? null : values.avatarUrl,
                  theme: values.theme,
                  buttonStyle: values.buttonStyle,
                  blocks: values.blocks,
                  bgType: values.bgType,
                  bgColor: values.bgColor || null,
                  bgGradient: values.bgGradient || null,
                  bgImageUrl: values.bgImageUrl || null,
                  buttonColor: values.buttonColor || null,
                  buttonTextColor: values.buttonTextColor || null,
                  textColor: values.textColor || null,
                  fontFamily: values.fontFamily,
                  profileMode: values.profileMode,
                  logoUrl: values.logoUrl || null,
                  profileText: values.profileText,
                  coverUrl: values.coverUrl || null,
                  adsEnabled: values.adsEnabled,
                  adMobileImage: values.adMobileImage || null,
                  adMobileHref: values.adMobileHref || null,
                  adLeftImage: values.adLeftImage || null,
                  adLeftHref: values.adLeftHref || null,
                  adRightImage: values.adRightImage || null,
                  adRightHref: values.adRightHref || null,
                  customCss: values.customCss,
                }}
                interactive={false}
                showBranding={false}
              />
            </div>
            <div className="flex w-full flex-wrap items-center justify-center gap-2">
              <CopyButton value={publicUrl} label={t("copyUrl")} />
              {mode === "edit" && values.published ? (
                <Button size="sm" href={publicUrl}>
                  <Icon name="external-link" className="text-sm" />
                  {t("open")}
                </Button>
              ) : null}
            </div>
          </Card>

          {mode === "edit" && biopageId ? (
            <Card staticHover className="gap-3">
              <Badge tone="danger">{t("dangerZone")}</Badge>
              <p className="m-0 text-sm text-fg-muted">{t("deleteHint")}</p>
              <Button
                size="sm"
                disabled={deleting}
                onClick={() => {
                  void remove();
                }}
              >
                <Icon name="trash" className="text-sm" />
                {deleting ? t("deleting") : t("deletePage")}
              </Button>
            </Card>
          ) : null}
        </div>
      </div>

      {formError ? <p className="m-0 text-sm text-danger">{formError}</p> : null}

      <SaveBar
        dirty={isDirty || mode === "create"}
        saving={isSubmitting}
        message={mode === "create" ? t("readyToCreate") : tc("unsavedChanges")}
        actions={
          <>
            {mode === "edit" ? (
              <Button size="sm" onClick={() => reset(defaultValues)} disabled={isSubmitting}>
                {t("discard")}
              </Button>
            ) : null}
            <Button size="sm" type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? t("saving") : mode === "create" ? t("createPage") : t("saveChanges")}
            </Button>
          </>
        }
      />
    </form>
  );
}
