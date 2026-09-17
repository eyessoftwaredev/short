"use client";

import { Icon } from "@/components/kit/icon";

import {
  BIOPAGE_BUTTON_STYLES,
  BIOPAGE_THEMES,
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
import { useTranslations } from "next-intl";
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
  Field,
  Input,
  SaveBar,
  Section,
  Select,
  Switch,
  TabPanel,
  Tabs,
  Textarea,
  type TabItem,
} from "@/components/ui";
import { bioFormSchema, newBlock, type BioFormValues } from "@/lib/bio-form";
import { BlockFields } from "./block-fields";
import { createBiopageAction, deleteBiopageAction, updateBiopageAction } from "./actions";

export type BioDomainOption = { id: string; hostname: string };

type BioBuilderProps = {
  mode: "create" | "edit";
  biopageId?: string;
  defaultValues: BioFormValues;
  domains: BioDomainOption[];
  platformHostname: string;
};

type TabId = "blocks" | "profile" | "design" | "seo";

const ADDABLE: BioBlockType[] = ["link", "social", "header", "text", "image", "embed", "divider"];

const BLOCK_KEYS = {
  link: "block.link",
  social: "block.social",
  text: "block.text",
  header: "block.header",
  image: "block.image",
  embed: "block.embed",
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
}: BioBuilderProps) {
  const router = useRouter();
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

  const values = watch();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const hostname = useMemo(
    () => domains.find((domain) => domain.id === values.domainId)?.hostname ?? platformHostname,
    [domains, platformHostname, values.domainId],
  );
  const publicUrl = `https://${hostname}/${values.handle || "handle"}`;

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
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Tabs items={tabs} value={tab} onChange={setTab} />

          <TabPanel active={tab === "blocks"}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {ADDABLE.map((type) => (
                  <Chip key={type} onClick={() => addBlock(type)}>
                    <Icon name="plus" className="text-xs" />
                    {t(BLOCK_KEYS[type])}
                  </Chip>
                ))}
              </div>

              {values.blocks.length === 0 ? (
                <p className="m-0 rounded-default border border-dashed border-border px-5 py-10 text-center text-sm text-fg-muted">
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
                    <div className="flex flex-col gap-2.5">
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
            </div>
          </TabPanel>

          <TabPanel active={tab === "profile"}>
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
                  <option value="">{platformHostname}</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.hostname}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={t("displayName")} error={bioFieldError(errors.displayName?.message, t, te)}>
                <Input placeholder="Acme Studio" {...register("displayName")} />
              </Field>

              <Field label={t("avatar")} error={bioFieldError(errors.avatarUrl?.message, t, te)}>
                <ImageUpload
                  value={values.avatarUrl}
                  onChange={(url) => setValue("avatarUrl", url, { shouldDirty: true })}
                />
              </Field>

              <Field label={t("bio")} className="sm:col-span-2" error={bioFieldError(errors.bio?.message, t, te)}>
                <Textarea rows={3} maxLength={500} {...register("bio")} />
              </Field>

              <Card staticHover className="flex-row items-center justify-between gap-4 sm:col-span-2">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t("published")}</span>
                  <span className="block text-sm text-fg-muted">{t("publishedHint")}</span>
                </span>
                <Switch
                  checked={values.published}
                  onCheckedChange={(checked) =>
                    setValue("published", checked, { shouldDirty: true })
                  }
                />
              </Card>
            </div>
          </TabPanel>

          <TabPanel active={tab === "design"}>
            <div className="flex flex-col gap-6">
              <Section title={t("theme")} description={t("themeDesc")}>
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

              <Section title={t("buttonStyle")} description={t("buttonStyleDesc")}>
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
            </div>
          </TabPanel>

          <TabPanel active={tab === "seo"}>
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
            </div>
          </TabPanel>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
          <Card staticHover className="items-center gap-4">
            <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
              {t("livePreview")}
            </span>
            {/* Phone frame follows the Sec25Mobile pattern: fixed aspect, scrollable body. */}
            <div className="h-144 w-full max-w-80 overflow-y-auto rounded-default border border-border-strong bg-bg">
              <BioPageView
                page={{
                  id: biopageId ?? "preview",
                  handle: values.handle,
                  displayName: values.displayName || t("yourName"),
                  bio: values.bio,
                  avatarUrl: values.avatarUrl === "" ? null : values.avatarUrl,
                  theme: values.theme,
                  buttonStyle: values.buttonStyle,
                  blocks: values.blocks,
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
