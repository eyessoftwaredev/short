"use client";

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
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ExternalLink,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { BioPageView } from "@/components/bio/bio-page-view";
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
import {
  BLOCK_LABELS,
  BUTTON_STYLE_LABELS,
  THEME_LABELS,
  bioFormSchema,
  describeBlock,
  newBlock,
  type BioFormValues,
} from "@/lib/bio-form";
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

const TABS: readonly TabItem<TabId>[] = [
  { id: "blocks", label: "Blocks" },
  { id: "profile", label: "Profile" },
  { id: "design", label: "Design" },
  { id: "seo", label: "SEO" },
];

const ADDABLE: BioBlockType[] = ["link", "social", "header", "text", "image", "embed", "divider"];

type BlockRowProps = {
  block: BioBlock;
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: BioBlock) => void;
  onRemove: () => void;
};

function BlockRow({ block, expanded, onToggle, onChange, onRemove }: BlockRowProps) {
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
          aria-label="Reorder block"
          className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-default border-0 bg-transparent text-fg-subtle hover:bg-surface"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2.5 border-0 bg-transparent text-left"
        >
          <Badge tone="muted">{BLOCK_LABELS[block.type]}</Badge>
          <span className="min-w-0 flex-1 truncate text-sm">{describeBlock(block)}</span>
        </button>

        <Button
          size="sm"
          icon
          aria-label={block.visible ? "Hide block" : "Show block"}
          onClick={() => onChange({ ...block, visible: !block.visible })}
        >
          {block.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </Button>
        <Button size="sm" icon aria-label="Remove block" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
        <Button
          size="sm"
          icon
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={onToggle}
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
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
  const [tab, setTab] = useState<TabId>("blocks");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      setFormError(result.error);
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
    if (!biopageId || !window.confirm("Delete this bio page? This cannot be undone.")) {
      return;
    }
    setDeleting(true);
    const result = await deleteBiopageAction(biopageId);
    if (!result.ok) {
      setFormError(result.error);
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
          <Tabs items={TABS} value={tab} onChange={setTab} />

          <TabPanel active={tab === "blocks"}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {ADDABLE.map((type) => (
                  <Chip key={type} onClick={() => addBlock(type)}>
                    <Plus className="size-3.5" />
                    {BLOCK_LABELS[type]}
                  </Chip>
                ))}
              </div>

              {values.blocks.length === 0 ? (
                <p className="m-0 rounded-default border border-dashed border-border px-5 py-10 text-center text-sm text-fg-muted">
                  No blocks yet. Add a link button to get started.
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
                label="Handle"
                error={errors.handle?.message}
                hint={`Your page will live at ${publicUrl}`}
              >
                <Input placeholder="acme" {...register("handle")} />
              </Field>

              <Field label="Domain" hint="Custom domains must be verified first.">
                <Select {...register("domainId")}>
                  <option value="">{platformHostname}</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.hostname}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Display name" error={errors.displayName?.message}>
                <Input placeholder="Acme Studio" {...register("displayName")} />
              </Field>

              <Field label="Avatar URL" error={errors.avatarUrl?.message}>
                <Input placeholder="https://cdn.acme.com/avatar.jpg" {...register("avatarUrl")} />
              </Field>

              <Field label="Bio" className="sm:col-span-2" error={errors.bio?.message}>
                <Textarea rows={3} maxLength={500} {...register("bio")} />
              </Field>

              <Card staticHover className="flex-row items-center justify-between gap-4 sm:col-span-2">
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Published</span>
                  <span className="block text-sm text-fg-muted">
                    Unpublished pages return 404 to visitors but stay editable here.
                  </span>
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
              <Section title="Theme" description="Palette applied to the whole page.">
                <div className="flex flex-wrap gap-2">
                  {BIOPAGE_THEMES.map((theme) => (
                    <Chip
                      key={theme}
                      active={values.theme === theme}
                      onClick={() => setValue("theme", theme, { shouldDirty: true })}
                    >
                      {THEME_LABELS[theme]}
                    </Chip>
                  ))}
                </div>
              </Section>

              <Section title="Button style" description="Applies to every link block.">
                <div className="flex flex-wrap gap-2">
                  {BIOPAGE_BUTTON_STYLES.map((style) => (
                    <Chip
                      key={style}
                      active={values.buttonStyle === style}
                      onClick={() => setValue("buttonStyle", style, { shouldDirty: true })}
                    >
                      {BUTTON_STYLE_LABELS[style]}
                    </Chip>
                  ))}
                </div>
              </Section>
            </div>
          </TabPanel>

          <TabPanel active={tab === "seo"}>
            <div className="flex flex-col gap-4">
              <Field
                label="SEO title"
                hint="Falls back to the display name."
                error={errors.seoTitle?.message}
              >
                <Input maxLength={120} {...register("seoTitle")} />
              </Field>
              <Field
                label="SEO description"
                hint="Falls back to the bio."
                error={errors.seoDescription?.message}
              >
                <Textarea rows={3} maxLength={300} {...register("seoDescription")} />
              </Field>
            </div>
          </TabPanel>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
          <Card staticHover className="items-center gap-4">
            <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
              Live preview
            </span>
            {/* Phone frame follows the Sec25Mobile pattern: fixed aspect, scrollable body. */}
            <div className="h-144 w-full max-w-80 overflow-y-auto rounded-default border border-border-strong bg-bg">
              <BioPageView
                page={{
                  id: biopageId ?? "preview",
                  handle: values.handle,
                  displayName: values.displayName || "Your name",
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
              <CopyButton value={publicUrl} label="Copy URL" />
              {mode === "edit" && values.published ? (
                <Button size="sm" href={publicUrl}>
                  <ExternalLink className="size-4" />
                  Open
                </Button>
              ) : null}
            </div>
          </Card>

          {mode === "edit" && biopageId ? (
            <Card staticHover className="gap-3">
              <Badge tone="danger">Danger zone</Badge>
              <p className="m-0 text-sm text-fg-muted">
                Deleting the page frees the handle and removes every block.
              </p>
              <Button
                size="sm"
                disabled={deleting}
                onClick={() => {
                  void remove();
                }}
              >
                <Trash2 className="size-4" />
                {deleting ? "Deleting…" : "Delete bio page"}
              </Button>
            </Card>
          ) : null}
        </div>
      </div>

      {formError ? <p className="m-0 text-sm text-danger">{formError}</p> : null}

      <SaveBar
        dirty={isDirty || mode === "create"}
        saving={isSubmitting}
        message={mode === "create" ? "Ready to create" : "Unsaved changes"}
        actions={
          <>
            {mode === "edit" ? (
              <Button size="sm" onClick={() => reset(defaultValues)} disabled={isSubmitting}>
                Discard
              </Button>
            ) : null}
            <Button size="sm" type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : mode === "create" ? "Create bio page" : "Save changes"}
            </Button>
          </>
        }
      />
    </form>
  );
}
