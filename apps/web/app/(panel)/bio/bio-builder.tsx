"use client";

import {
  BIOPAGE_BUTTON_STYLES,
  BIOPAGE_FONTS,
  BIOPAGE_TEMPLATE_PRESETS,
  BIOPAGE_TEMPLATES,
  BIOPAGE_THEMES,
  GOOGLE_FONT_HREF,
  type BioBlock,
  type BioBlockType,
  type BiopageTemplateId,
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
import { useForm, type FieldErrors } from "react-hook-form";
import { BioPageView } from "@/components/bio/bio-page-view";
import { BioThumbnail } from "@/components/bio/bio-thumbnail";
import { Icon } from "@/components/kit/icon";
import { ImageUpload } from "@/components/media/image-upload";
import {
  Badge,
  Button,
  Callout,
  Card,
  Chip,
  ConfirmDialog,
  CopyField,
  DateTimePicker,
  Disclosure,
  Dropdown,
  EmptyState,
  Field,
  InfoTip,
  Input,
  PageHeader,
  SaveBar,
  SecretInput,
  SectionCard,
  Segmented,
  Select,
  SettingsRow,
  Switch,
  TabPanel,
  Tabs,
  Textarea,
  toast,
  type TabItem,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { bioFormSchema, newBlock, type BioFormValues } from "@/lib/bio-form";
import { cn } from "@/lib/cx";
import {
  deleteBiopageAction,
  updateBiopageAction,
  updateBiopagePublishedAction,
} from "./actions";
import { BlockFields, type BlockErrors } from "./block-fields";
import { BLOCK_ICONS } from "./block-meta";
import { BlockGrid, BlockPicker } from "./block-picker";
import { BioStatusBadge } from "./bio-status";
import { HandleField } from "./handle-field";
import type { BioDomainChoice } from "./new/new-bio-flow";
import { PhoneFrame } from "./phone-frame";
import { previewPage } from "./preview";
import { bioStatusOf } from "./status";

type BioBuilderProps = {
  biopageId: string;
  defaultValues: BioFormValues;
  domains: BioDomainChoice[];
  platformHostname: string;
  canCustomCss?: boolean;
  canForms?: boolean;
  canPassword?: boolean;
  initialTab?: TabId;
  welcome?: boolean;
};

export type TabId = "content" | "profile" | "design" | "settings";

/** Which tab renders each form field, so a validation error can bring its tab into view. */
const FIELD_TABS: Partial<Record<keyof BioFormValues, TabId>> = {
  blocks: "content",
  displayName: "profile",
  bio: "profile",
  avatarUrl: "profile",
  profileMode: "profile",
  logoUrl: "profile",
  profileText: "profile",
  coverUrl: "profile",
  theme: "design",
  buttonStyle: "design",
  templateId: "design",
  bgType: "design",
  bgColor: "design",
  bgGradient: "design",
  bgImageUrl: "design",
  buttonColor: "design",
  buttonTextColor: "design",
  textColor: "design",
  fontFamily: "design",
  customCss: "design",
  handle: "settings",
  domainId: "settings",
  adsEnabled: "settings",
  adMobileImage: "settings",
  adMobileHref: "settings",
  adLeftImage: "settings",
  adLeftHref: "settings",
  adRightImage: "settings",
  adRightHref: "settings",
  sensitive: "settings",
  password: "settings",
  removePassword: "settings",
  hasPassword: "settings",
  publishAt: "settings",
  unpublishAt: "settings",
  published: "settings",
  seoTitle: "settings",
  seoDescription: "settings",
  ogImageUrl: "settings",
};

/** Fields that live inside a collapsed Disclosure; an error there must open it. */
const COLOR_FIELDS = new Set(["buttonColor", "buttonTextColor", "textColor"]);
const BANNER_FIELDS = new Set([
  "adsEnabled",
  "adMobileImage",
  "adMobileHref",
  "adLeftImage",
  "adLeftHref",
  "adRightImage",
  "adRightHref",
]);
const SCHEDULE_FIELDS = new Set(["publishAt", "unpublishAt"]);

function tabForField(path: string): TabId {
  const root = path.split(".")[0] as keyof BioFormValues;
  return FIELD_TABS[root] ?? "profile";
}

/** Dotted paths of every leaf error, in field order (`blocks.2.destination`, `bgColor`). */
function errorPaths(node: unknown, prefix = ""): string[] {
  if (!node || typeof node !== "object") {
    return [];
  }
  const record = node as Record<string, unknown>;
  if (typeof record.type === "string" && prefix !== "") {
    return [prefix];
  }
  const out: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (key === "ref" || key === "types") {
      continue;
    }
    const path = key === "root" ? prefix : prefix === "" ? key : `${prefix}.${key}`;
    out.push(...errorPaths(value, path));
  }
  return out;
}

/** Error codes of one block, keyed by the field path inside the block. */
function blockErrorsAt(errors: FieldErrors<BioFormValues>, index: number): BlockErrors {
  const node = (errors.blocks as unknown as Record<number, unknown> | undefined)?.[index];
  const result: BlockErrors = {};
  for (const path of errorPaths(node)) {
    let cursor: unknown = node;
    for (const part of path.split(".")) {
      cursor = (cursor as Record<string, unknown> | undefined)?.[part];
    }
    const message = (cursor as { message?: string } | undefined)?.message;
    result[path] = message || "invalid";
  }
  return result;
}

function hexToPicker(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return /^#[0-9a-fA-F]{6}$/.test(fallback) ? fallback : "#000000";
}

function ColorField({
  label,
  info,
  value,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  info: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} info={info} error={error}>
      <Input
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        maxLength={7}
        aria-invalid={Boolean(error) || undefined}
        className="font-mono"
        suffix={
          <input
            type="color"
            value={hexToPicker(value, placeholder)}
            aria-label={label}
            className="-mr-1 size-6 cursor-pointer rounded-xs border-0 bg-transparent p-0 shadow-none [&::-webkit-color-swatch]:rounded-xs [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
            onChange={(event) => onChange(event.target.value)}
          />
        }
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

const GRADIENT_PRESETS = [
  "linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #334155 100%)",
  "linear-gradient(135deg, #fde68a 0%, #f472b6 100%)",
  "linear-gradient(135deg, #a7f3d0 0%, #38bdf8 100%)",
  "linear-gradient(180deg, #fff7ed 0%, #fed7aa 100%)",
  "linear-gradient(135deg, #312e81 0%, #7c3aed 50%, #db2777 100%)",
];

function describeBlock(
  block: BioBlock,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  switch (block.type) {
    case "link":
      return block.label || t("untitledLink");
    case "social":
      return t("profilesCount", { count: block.items.length });
    case "text":
      return block.body.trim().slice(0, 60) || t("emptyText");
    case "header":
      return block.text || t("untitledHeading");
    case "image":
      return block.alt || (block.url ? t("editor.imageAdded") : t("editor.noImage"));
    case "embed":
      return block.url || t("editor.noEmbed");
    case "form":
      return block.title || (block.mode === "whatsapp" ? t("formModeWhatsapp") : t("formModeEmail"));
    default:
      return t("block.divider");
  }
}

type BlockRowProps = {
  block: BioBlock;
  index: number;
  count: number;
  expanded: boolean;
  errors: BlockErrors;
  canForms: boolean;
  onToggle: () => void;
  onChange: (next: BioBlock) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (delta: -1 | 1) => void;
};

function BlockRow({
  block,
  index,
  count,
  expanded,
  errors,
  canForms,
  onToggle,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
}: BlockRowProps) {
  const t = useTranslations("bio");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const hasError = Object.keys(errors).length > 0;
  const summary = describeBlock(block, t);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "list-none rounded-md border bg-bg transition-[border-color,box-shadow] duration-150",
        isDragging ? "relative z-10 border-accent shadow-lift" : "border-border",
        hasError && !isDragging && "border-danger-border",
        expanded && !isDragging && !hasError && "border-border-strong shadow-xs",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5 py-1.5 pr-1.5 pl-1">
        <button
          type="button"
          aria-label={t("reorderNamed", { name: summary })}
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-default border-0 bg-transparent text-fg-subtle hover:bg-surface hover:text-ink active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <Icon name="grip" className="text-sm" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-default border-0 bg-transparent py-1 text-left"
        >
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-default",
              hasError ? "bg-danger-surface text-danger" : "bg-surface text-fg-muted",
            )}
            aria-hidden="true"
          >
            <Icon name={BLOCK_ICONS[block.type]} className="text-[13px]" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span
              className={cn(
                "truncate text-sm font-medium",
                block.visible ? "text-ink" : "text-fg-subtle line-through decoration-fg-faint",
              )}
            >
              {summary}
            </span>
            <span className="truncate text-xs text-fg-subtle">{t(`block.${block.type}`)}</span>
          </span>
          {hasError ? (
            <Badge tone="danger" size="sm" className="hidden sm:inline-flex">
              {t("editor.needsAttention")}
            </Badge>
          ) : !block.visible ? (
            <Badge tone="muted" size="sm" className="hidden sm:inline-flex">
              {t("editor.hidden")}
            </Badge>
          ) : null}
        </button>

        <Button
          size="sm"
          variant="ghost"
          icon
          aria-label={block.visible ? t("hideBlock") : t("showBlock")}
          title={block.visible ? t("hideBlock") : t("showBlock")}
          onClick={() => onChange({ ...block, visible: !block.visible })}
        >
          <Icon name={block.visible ? "eye" : "eye-slash"} className="text-sm" />
        </Button>
        <Dropdown
          align="end"
          label={t("editor.blockActions")}
          trigger={
            <Button size="sm" variant="ghost" icon aria-label={t("editor.blockActions")}>
              <Icon name="ellipsis" className="text-sm" />
            </Button>
          }
          items={[
            {
              id: "up",
              label: t("editor.moveUp"),
              icon: <Icon name="arrow-up" className="text-xs" />,
              disabled: index === 0,
              onSelect: () => onMove(-1),
            },
            {
              id: "down",
              label: t("editor.moveDown"),
              icon: <Icon name="arrow-down" className="text-xs" />,
              disabled: index === count - 1,
              onSelect: () => onMove(1),
            },
            {
              id: "duplicate",
              label: t("editor.duplicate"),
              icon: <Icon name="copy" className="text-xs" />,
              disabled: block.type === "form" && !canForms,
              onSelect: onDuplicate,
            },
            {
              id: "remove",
              label: t("removeBlock"),
              icon: <Icon name="trash" className="text-xs" />,
              danger: true,
              separated: true,
              onSelect: onRemove,
            },
          ]}
        />
        <Button
          size="sm"
          variant="ghost"
          icon
          aria-label={expanded ? t("collapse") : t("expand")}
          onClick={onToggle}
        >
          <Icon name={expanded ? "chevron-up" : "chevron-down"} className="text-xs" />
        </Button>
      </div>

      {expanded ? (
        <div className="border-t border-border-subtle px-4 py-4 sm:px-5">
          <BlockFields block={block} onChange={onChange} errors={errors} canForms={canForms} />
        </div>
      ) : null}
    </li>
  );
}

const DESIGN_KEYS = [
  "templateId",
  "theme",
  "buttonStyle",
  "fontFamily",
  "bgType",
  "bgColor",
  "bgGradient",
  "buttonColor",
  "buttonTextColor",
  "textColor",
] as const;

export function BioBuilder({
  biopageId,
  defaultValues,
  domains,
  platformHostname,
  canCustomCss = false,
  canForms = false,
  canPassword = false,
  initialTab = "content",
  welcome = false,
}: BioBuilderProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("bio");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(welcome);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [bannersOpen, setBannersOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(
    Boolean(defaultValues.publishAt || defaultValues.unpublishAt),
  );
  const [cssOpen, setCssOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    reset,
    resetField,
    getValues,
    formState: { errors, isDirty, isSubmitting, isSubmitted, defaultValues: saved },
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
    () => domains.find((domain) => domain.id === values.domainId)?.hostname ?? platformHostname,
    [domains, platformHostname, values.domainId],
  );
  const savedHandle = saved?.handle ?? defaultValues.handle;
  const savedDomainId = saved?.domainId ?? defaultValues.domainId;
  const savedHost =
    domains.find((domain) => domain.id === savedDomainId)?.hostname ?? platformHostname;
  const publicUrl = `https://${savedHost}/${savedHandle}`;
  // The header reflects what visitors get now (the saved state); the Visibility row
  // describes what the unsaved values would do once saved.
  const status = bioStatusOf({
    published: saved?.published ?? defaultValues.published,
    publishAt: saved?.publishAt || null,
    unpublishAt: saved?.unpublishAt || null,
  });
  const pendingStatus = bioStatusOf({
    published: values.published,
    publishAt: values.publishAt || null,
    unpublishAt: values.unpublishAt || null,
  });
  const isLive = status === "live";
  const addressChanged = values.handle !== savedHandle || values.domainId !== savedDomainId;
  const fontHref = GOOGLE_FONT_HREF[values.fontFamily];
  const hasColorError = Boolean(errors.buttonColor || errors.buttonTextColor || errors.textColor);
  const hasBannerError = Boolean(
    errors.adMobileHref || errors.adLeftHref || errors.adRightHref || errors.adMobileImage,
  );
  const hasScheduleError = Boolean(errors.publishAt || errors.unpublishAt);

  /** Friendly text for a top-level field error code (client or server). */
  function fieldError(field: keyof BioFormValues): string | undefined {
    const message = errors[field]?.message as string | undefined;
    if (!message && !errors[field]) {
      return undefined;
    }
    switch (message) {
      case "displayNameRequired":
        return t("displayNameRequired");
      case "handleReserved":
        return t("handleField.reserved");
      case "handlePattern":
        return t("handleField.invalid");
      case "handle_taken":
        return te("handle_taken", { handle: getValues("handle") });
      case "handle_too_short":
      case "handle_premium":
        return actionMessage(message);
      case "hexColor":
        return t("fieldError.hexColor");
      case "gradientLength":
        return t("fieldError.gradientLength");
      case "passwordLength":
        return t("fieldError.passwordLength");
      default:
        break;
    }
    if (field === "adMobileHref" || field === "adLeftHref" || field === "adRightHref") {
      return t("blockError.url");
    }
    if (field === "password") {
      return t("fieldError.passwordLength");
    }
    if (field === "bgColor" || field === "buttonColor" || field === "buttonTextColor" || field === "textColor") {
      return t("fieldError.hexColor");
    }
    return te("validation");
  }

  function revealErrors(paths: string[]): void {
    const first = paths[0];
    if (!first) {
      return;
    }
    setTab(tabForField(first));
    setMobileView("edit");
    const root = first.split(".")[0] ?? "";
    if (root === "blocks") {
      const index = Number(first.split(".")[1]);
      const block = Number.isInteger(index) ? getValues("blocks")[index] : undefined;
      if (block) {
        setExpanded(block.id);
      }
    }
    if (COLOR_FIELDS.has(root)) {
      setColorsOpen(true);
    }
    if (BANNER_FIELDS.has(root)) {
      setBannersOpen(true);
    }
    if (SCHEDULE_FIELDS.has(root)) {
      setScheduleOpen(true);
    }
    if (root === "customCss") {
      setCssOpen(true);
    }
  }

  function setBlocks(next: BioBlock[]): void {
    // After the first save attempt, re-check blocks as they change so "Needs attention"
    // clears the moment a block is fixed (and follows blocks when they are reordered).
    setValue(
      "blocks",
      next.map((block, index) => ({ ...block, position: index })),
      { shouldDirty: true, shouldValidate: isSubmitted },
    );
  }

  function onDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const current = getValues("blocks");
    const from = current.findIndex((block) => block.id === active.id);
    const to = current.findIndex((block) => block.id === over.id);
    if (from === -1 || to === -1) {
      return;
    }
    setBlocks(arrayMove(current, from, to));
  }

  function addBlock(type: BioBlockType): void {
    const current = getValues("blocks");
    const block = newBlock(type, current.length, {
      linkLabel: t("newLinkLabel"),
      heading: t("section"),
      formButton: t("editor.formButtonDefault"),
    });
    setBlocks([...current, block]);
    setExpanded(block.id);
    setTab("content");
    setShowWelcome(false);
  }

  function removeBlock(id: string): void {
    const current = getValues("blocks");
    const index = current.findIndex((block) => block.id === id);
    const removed = current[index];
    if (!removed) {
      return;
    }
    setBlocks(current.filter((block) => block.id !== id));
    toast({
      title: t("editor.blockRemoved"),
      tone: "info",
      action: {
        label: t("editor.undo"),
        onClick: () => {
          const now = getValues("blocks");
          const restored = [...now];
          restored.splice(Math.min(index, now.length), 0, removed);
          setBlocks(restored);
        },
      },
    });
  }

  function duplicateBlock(id: string): void {
    const current = getValues("blocks");
    const index = current.findIndex((block) => block.id === id);
    const source = current[index];
    if (!source) {
      return;
    }
    const copy: BioBlock = { ...structuredClone(source), id: crypto.randomUUID() };
    const next = [...current];
    next.splice(index + 1, 0, copy);
    setBlocks(next);
    setExpanded(copy.id);
  }

  function moveBlock(id: string, delta: -1 | 1): void {
    const current = getValues("blocks");
    const from = current.findIndex((block) => block.id === id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= current.length) {
      return;
    }
    setBlocks(arrayMove(current, from, to));
  }

  function applyTemplate(id: BiopageTemplateId): void {
    const before = Object.fromEntries(DESIGN_KEYS.map((key) => [key, getValues(key)])) as Pick<
      BioFormValues,
      (typeof DESIGN_KEYS)[number]
    >;
    const preset = BIOPAGE_TEMPLATE_PRESETS[id];
    const next: Pick<BioFormValues, (typeof DESIGN_KEYS)[number]> = {
      templateId: id,
      theme: preset.theme,
      buttonStyle: preset.buttonStyle,
      fontFamily: preset.fontFamily,
      bgType: preset.bgType,
      bgColor: preset.bgColor ?? "",
      bgGradient: preset.bgGradient ?? "",
      buttonColor: preset.buttonColor ?? "",
      buttonTextColor: preset.buttonTextColor ?? "",
      textColor: preset.textColor ?? "",
    };
    for (const key of DESIGN_KEYS) {
      setValue(key, next[key] as never, { shouldDirty: true });
    }
    toast({
      title: t("editor.templateApplied", { name: t(`templateName.${id}`) }),
      tone: "success",
      action: {
        label: t("editor.undo"),
        onClick: () => {
          for (const key of DESIGN_KEYS) {
            setValue(key, before[key] as never, { shouldDirty: true });
          }
        },
      },
    });
  }

  const save = handleSubmit(
    async (formValues) => {
      setFormError(null);
      const wasLive = bioStatusOf({
        published: saved?.published ?? false,
        publishAt: saved?.publishAt || null,
        unpublishAt: saved?.unpublishAt || null,
      });
      const result = await updateBiopageAction(biopageId, formValues);

      if (!result.ok) {
        const failed = Object.entries(result.fieldErrors ?? {}).filter(
          ([path]) => path !== "_form" && path.split(".")[0] in FIELD_TABS,
        );
        for (const [path, messages] of failed) {
          setError(path as keyof BioFormValues, { type: "server", message: messages[0] });
        }
        const handleProblem = result.error.startsWith("handle_");
        if (handleProblem) {
          setError("handle", { type: "server", message: result.error });
        }
        revealErrors(handleProblem ? ["handle"] : failed.map(([path]) => path));
        setFormError(
          result.error === "handle_taken"
            ? te("handle_taken", { handle: formValues.handle })
            : actionMessage(result.error),
        );
        return;
      }

      // The gate password is write-only: clear it and reflect whether one is now stored,
      // otherwise the next save would re-hash it and "remove" would stay ticked.
      reset({
        ...formValues,
        password: "",
        removePassword: false,
        hasPassword: formValues.removePassword
          ? false
          : formValues.hasPassword || formValues.password.trim() !== "",
      });
      const nowStatus = bioStatusOf({
        published: formValues.published,
        publishAt: formValues.publishAt || null,
        unpublishAt: formValues.unpublishAt || null,
      });
      if (nowStatus === "live" && wasLive !== "live") {
        toast.success(t("editor.nowLive"), t("editor.nowLiveBody"));
      } else {
        toast.success(t("editor.saved"));
      }
      router.refresh();
    },
    (invalid) => {
      // Client-side validation failed. The offending field is often on another tab
      // (e.g. a block's link on Content), so bring it into view instead of failing silently.
      revealErrors(errorPaths(invalid));
      setFormError(te("validation"));
    },
  );

  function publishNow(): void {
    setValue("published", true, { shouldDirty: true });
    setValue("publishAt", "", { shouldDirty: true });
    setValue("unpublishAt", "", { shouldDirty: true });
    setPublishing(true);
    void save().finally(() => setPublishing(false));
  }

  async function togglePublished(checked: boolean): Promise<void> {
    setValue("published", checked, { shouldDirty: true });
    if (checked) {
      setValue("publishAt", "", { shouldDirty: true });
      setValue("unpublishAt", "", { shouldDirty: true });
    }
    const result = await updateBiopagePublishedAction(biopageId, checked);
    if (!result.ok) {
      setValue("published", !checked, { shouldDirty: true });
      toast.error(actionMessage(result.error));
      return;
    }
    // Already stored: move the saved baseline too, so "Discard" does not bring back the
    // old state and the switch alone does not leave the form dirty.
    resetField("published", { defaultValue: checked });
    if (checked) {
      resetField("publishAt", { defaultValue: "" });
      resetField("unpublishAt", { defaultValue: "" });
    }
    toast.success(checked ? t("editor.nowLive") : t("editor.nowDraft"));
    router.refresh();
  }

  async function removePage(): Promise<void> {
    setDeleting(true);
    const result = await deleteBiopageAction(biopageId);
    if (!result.ok) {
      setDeleting(false);
      toast.error(actionMessage(result.error));
      return;
    }
    toast.success(t("list.deleted", { name: saved?.displayName ?? values.displayName }));
    router.push("/bio");
  }

  const tabs: TabItem<TabId>[] = [
    {
      id: "content",
      label: t("editor.tabContent"),
      count: values.blocks.length > 0 ? values.blocks.length : undefined,
    },
    { id: "profile", label: t("tabProfile") },
    { id: "design", label: t("tabDesign") },
    { id: "settings", label: t("editor.tabSettings") },
  ];

  const tabErrors = new Set(errorPaths(errors).map((path) => tabForField(path)));

  const preview = (
    <PhoneFrame label={t("livePreview")}>
      {fontHref ? <link rel="stylesheet" href={fontHref} /> : null}
      <BioPageView
        embedded
        interactive={false}
        showBranding={false}
        page={previewPage(values, biopageId, t("yourName"))}
      />
    </PhoneFrame>
  );

  return (
    <form
      className="flex min-w-0 flex-col gap-6"
      autoComplete="off"
      noValidate
      onSubmit={(event) => {
        void save(event);
      }}
    >
      <PageHeader
        back={{ href: "/bio", label: t("title") }}
        title={values.displayName.trim() || saved?.displayName || t("yourName")}
        meta={<BioStatusBadge status={status} />}
        description={
          isLive ? (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="font-mono text-[13px]">
              {savedHost}/{savedHandle}
            </a>
          ) : (
            <span className="font-mono text-[13px]">
              {savedHost}/{savedHandle}
            </span>
          )
        }
        secondaryActions={
          <>
            <Button leadingIcon="chart-line" href={`/bio/${biopageId}/stats`}>
              {t("stats")}
            </Button>
            <Button leadingIcon="inbox" href={`/bio/${biopageId}/leads`}>
              {t("leadsTitle")}
            </Button>
            {isLive ? (
              <Button leadingIcon="external-link" href={publicUrl} external>
                {t("editor.viewPage")}
              </Button>
            ) : null}
          </>
        }
        actions={
          status === "draft" ? (
            <Button variant="primary" leadingIcon="rocket" loading={publishing} onClick={publishNow}>
              {t("editor.publish")}
            </Button>
          ) : null
        }
      />

      {showWelcome ? (
        <Callout
          tone="accent"
          icon="sparkles"
          title={t("editor.welcomeTitle")}
          onDismiss={() => {
            setShowWelcome(false);
            router.replace(`/bio/${biopageId}/edit`, { scroll: false });
          }}
        >
          {t("editor.welcomeBody")}
        </Callout>
      ) : status === "draft" ? (
        <Callout tone="neutral" title={t("editor.draftTitle")}>
          {t("editor.draftBody")}
        </Callout>
      ) : status === "scheduled" ? (
        <Callout tone="info" title={t("editor.scheduledTitle")}>
          {t("editor.scheduledBody")}
        </Callout>
      ) : status === "ended" ? (
        <Callout tone="warn" title={t("editor.endedTitle")}>
          {t("editor.endedBody")}
        </Callout>
      ) : null}

      <Segmented
        className="lg:hidden"
        block
        label={t("editor.viewToggle")}
        value={mobileView}
        onChange={setMobileView}
        items={[
          { id: "edit", label: t("editor.viewEdit"), icon: "pen" },
          { id: "preview", label: t("editor.viewPreview"), icon: "mobile-screen" },
        ]}
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className={cn("min-w-0 flex-col gap-5", mobileView === "preview" ? "hidden lg:flex" : "flex")}>
          <Tabs
            items={tabs.map((item) =>
              tabErrors.has(item.id)
                ? {
                    ...item,
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        {item.label}
                        <span className="size-1.5 rounded-pill bg-danger" aria-hidden="true" />
                        <span className="sr-only">{t("editor.tabHasErrors")}</span>
                      </span>
                    ),
                  }
                : item,
            )}
            value={tab}
            onChange={setTab}
            label={t("editor.sections")}
          />

          {/* ── Content ─────────────────────────────────────────────── */}
          <TabPanel active={tab === "content"} className="flex flex-col gap-4">
            <Card
              title={t("editor.blocksTitle")}
              description={t("editor.blocksDesc")}
              actions={
                values.blocks.length > 0 ? (
                  <Button size="sm" leadingIcon="plus" onClick={() => setPickerOpen(true)}>
                    {t("editor.addBlock")}
                  </Button>
                ) : null
              }
            >
              {values.blocks.length === 0 ? (
                <div className="flex flex-col gap-4">
                  <EmptyState
                    bare
                    size="sm"
                    tone="first-run"
                    icon="layer-group"
                    title={t("editor.emptyTitle")}
                    description={t("editor.emptyBody")}
                    className="pb-2"
                  />
                  <BlockGrid canForms={canForms} onPick={addBlock} />
                </div>
              ) : (
                <>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext
                      items={values.blocks.map((block) => block.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ol className="m-0 flex flex-col gap-2 p-0">
                        {values.blocks.map((block, index) => (
                          <BlockRow
                            key={block.id}
                            block={block}
                            index={index}
                            count={values.blocks.length}
                            expanded={expanded === block.id}
                            errors={blockErrorsAt(errors, index)}
                            canForms={canForms}
                            onToggle={() => setExpanded(expanded === block.id ? null : block.id)}
                            onChange={(next) =>
                              setBlocks(
                                getValues("blocks").map((item) => (item.id === block.id ? next : item)),
                              )
                            }
                            onRemove={() => removeBlock(block.id)}
                            onDuplicate={() => duplicateBlock(block.id)}
                            onMove={(delta) => moveBlock(block.id, delta)}
                          />
                        ))}
                      </ol>
                    </SortableContext>
                  </DndContext>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-transparent text-sm font-medium text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-accent-tint hover:text-accent-ink"
                  >
                    <Icon name="plus" className="text-xs" />
                    {t("editor.addBlock")}
                  </button>
                  <p className="m-0 text-[13px] text-fg-subtle">{t("editor.dragHint")}</p>
                </>
              )}
            </Card>
          </TabPanel>

          {/* ── Profile ─────────────────────────────────────────────── */}
          <TabPanel active={tab === "profile"} className="flex flex-col gap-4">
            <Card title={t("editor.aboutTitle")} description={t("editor.aboutDesc")} className="gap-4">
              <Field
                label={t("displayName")}
                info={t("displayNameInfo")}
                error={fieldError("displayName")}
                required
              >
                <Input
                  maxLength={80}
                  placeholder={t("yourName")}
                  aria-invalid={Boolean(errors.displayName) || undefined}
                  {...register("displayName")}
                />
              </Field>
              <Field
                label={t("bio")}
                info={t("bioInfo")}
                hint={t("editor.charCount", { count: values.bio.length, max: 500 })}
                error={errors.bio ? fieldError("bio") : undefined}
              >
                <Textarea
                  rows={3}
                  maxLength={500}
                  placeholder={t("editor.bioPlaceholder")}
                  {...register("bio")}
                />
              </Field>
            </Card>

            <Card title={t("editor.pictureTitle")} description={t("editor.pictureDesc")} className="gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {t("profileMode")}
                  <InfoTip inline label={t("profileMode")}>
                    {t("profileModeInfo")}
                  </InfoTip>
                </span>
                <Segmented
                  label={t("profileMode")}
                  value={values.profileMode}
                  onChange={(mode) => setValue("profileMode", mode, { shouldDirty: true })}
                  items={[
                    { id: "photo", label: t("profilePhoto"), icon: "circle-user" },
                    { id: "logo", label: t("profileLogo"), icon: "building" },
                    { id: "text", label: t("profileTextMode"), icon: "file-lines" },
                  ]}
                  className="self-start"
                />
              </div>
              {values.profileMode === "photo" ? (
                <Field label={t("avatar")} info={t("avatarInfo")} hint={t("editor.avatarHint")}>
                  <ImageUpload
                    value={values.avatarUrl}
                    onChange={(url) => setValue("avatarUrl", url, { shouldDirty: true })}
                  />
                </Field>
              ) : null}
              {values.profileMode === "logo" ? (
                <Field label={t("logo")} info={t("logoInfo")} hint={t("editor.logoHint")}>
                  <ImageUpload
                    value={values.logoUrl}
                    onChange={(url) => setValue("logoUrl", url, { shouldDirty: true })}
                  />
                </Field>
              ) : null}
              {values.profileMode === "text" ? (
                <Field label={t("profileTextLabel")} info={t("profileTextInfo")}>
                  <Input maxLength={40} placeholder="AS" {...register("profileText")} />
                </Field>
              ) : null}
              <Field
                label={t("cover")}
                info={t("coverInfo")}
                hint={t("editor.coverHint")}
                optional={t("editor.optional")}
              >
                <ImageUpload
                  value={values.coverUrl}
                  onChange={(url) => setValue("coverUrl", url, { shouldDirty: true })}
                />
              </Field>
            </Card>
          </TabPanel>

          {/* ── Design ──────────────────────────────────────────────── */}
          <TabPanel active={tab === "design"} className="flex flex-col gap-4">
            <Card
              title={
                <span className="inline-flex items-center gap-1.5">
                  {t("templates")}
                  <InfoTip label={t("templates")}>{t("templatesInfo")}</InfoTip>
                </span>
              }
              description={t("editor.templatesDesc")}
            >
              <div
                role="radiogroup"
                aria-label={t("templates")}
                className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
              >
                {BIOPAGE_TEMPLATES.map((id) => {
                  const preset = BIOPAGE_TEMPLATE_PRESETS[id];
                  const active = values.templateId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => applyTemplate(id)}
                      className={cn(
                        "group flex min-w-0 flex-col overflow-hidden rounded-md border bg-bg p-0 text-left transition-[border-color,box-shadow] duration-150",
                        active ? "border-accent ring-2 ring-accent" : "border-border hover:border-border-strong",
                      )}
                    >
                      <span className="block h-28 overflow-hidden">
                        <BioThumbnail
                          displayName={values.displayName || t("yourName")}
                          avatarUrl={values.avatarUrl || null}
                          buttons={2}
                          theme={preset.theme}
                          buttonStyle={preset.buttonStyle}
                          fontFamily={preset.fontFamily}
                          bgType={preset.bgType}
                          bgColor={preset.bgColor}
                          bgGradient={preset.bgGradient}
                          buttonColor={preset.buttonColor}
                          buttonTextColor={preset.buttonTextColor}
                          textColor={preset.textColor}
                          className="px-4 pt-4"
                        />
                      </span>
                      <span className="flex items-center justify-between gap-2 border-t border-border-subtle px-2.5 py-2 text-[13px] font-medium text-ink">
                        <span className="truncate">{t(`templateName.${id}`)}</span>
                        {active ? <Icon name="circle-check" className="shrink-0 text-accent" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card title={t("editor.styleTitle")} description={t("editor.styleDesc")} className="gap-5">
              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {t("theme")}
                  <InfoTip inline label={t("theme")}>
                    {t("themeInfo")}
                  </InfoTip>
                </span>
                <div className="flex flex-wrap gap-2">
                  {BIOPAGE_THEMES.map((theme) => (
                    <Chip
                      key={theme}
                      active={values.theme === theme}
                      onClick={() => setValue("theme", theme, { shouldDirty: true })}
                    >
                      <span
                        className={cn(
                          `bio-theme-${theme}`,
                          "flex size-4 items-center justify-center rounded-full bg-bio-bg ring-1 ring-border-strong",
                        )}
                        aria-hidden="true"
                      >
                        <span className="size-2 rounded-full bg-bio-accent" />
                      </span>
                      {t(`themeName.${theme}`)}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {t("buttonStyle")}
                  <InfoTip inline label={t("buttonStyle")}>
                    {t("buttonStyleInfo")}
                  </InfoTip>
                </span>
                <Segmented
                  label={t("buttonStyle")}
                  value={values.buttonStyle}
                  onChange={(style) => setValue("buttonStyle", style, { shouldDirty: true })}
                  items={BIOPAGE_BUTTON_STYLES.map((style) => ({
                    id: style,
                    label: t(`buttonStyleName.${style}`),
                  }))}
                  className="self-start"
                />
              </div>

              <Field label={t("fontFamily")} info={t("fontFamilyInfo")} className="max-w-sm">
                <Select {...register("fontFamily")}>
                  {BIOPAGE_FONTS.map((font) => (
                    <option key={font} value={font}>
                      {t(`fontName.${font}`)}
                    </option>
                  ))}
                </Select>
              </Field>
            </Card>

            <Card title={t("background")} description={t("editor.backgroundDesc")} className="gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {t("bgType")}
                  <InfoTip inline label={t("bgType")}>
                    {t("bgTypeInfo")}
                  </InfoTip>
                </span>
                <Segmented
                  label={t("bgType")}
                  value={values.bgType}
                  onChange={(bgType) => setValue("bgType", bgType, { shouldDirty: true })}
                  items={[
                    { id: "theme", label: t("bgTheme") },
                    { id: "color", label: t("bgColor") },
                    { id: "gradient", label: t("bgGradient") },
                    { id: "image", label: t("bgImage") },
                  ]}
                  className="max-w-full self-start overflow-x-auto"
                />
              </div>
              {values.bgType === "color" ? (
                <div className="max-w-xs">
                  <ColorField
                    label={t("bgColorValue")}
                    info={t("bgColorValueInfo")}
                    value={values.bgColor}
                    placeholder="#111111"
                    error={errors.bgColor ? fieldError("bgColor") : undefined}
                    onChange={(value) => setValue("bgColor", value, { shouldDirty: true, shouldValidate: Boolean(errors.bgColor) })}
                  />
                </div>
              ) : null}
              {values.bgType === "gradient" ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2" role="list" aria-label={t("editor.gradientPresets")}>
                    {GRADIENT_PRESETS.map((gradient) => (
                      <button
                        key={gradient}
                        type="button"
                        role="listitem"
                        aria-label={t("editor.useGradient")}
                        title={t("editor.useGradient")}
                        onClick={() => setValue("bgGradient", gradient, { shouldDirty: true })}
                        className={cn(
                          "size-9 rounded-full border-2 transition-transform duration-150 hover:scale-105",
                          values.bgGradient === gradient ? "border-accent" : "border-bg ring-1 ring-border-strong",
                        )}
                        style={{ backgroundImage: gradient }}
                      />
                    ))}
                  </div>
                  <Field
                    label={t("bgGradientValue")}
                    info={t("bgGradientValueInfo")}
                    error={errors.bgGradient ? fieldError("bgGradient") : undefined}
                  >
                    <Input className="font-mono text-[13px]" spellCheck={false} {...register("bgGradient")} />
                  </Field>
                </div>
              ) : null}
              {values.bgType === "image" ? (
                <Field label={t("bgImage")} info={t("bgImageInfo")}>
                  <ImageUpload
                    value={values.bgImageUrl}
                    onChange={(url) => setValue("bgImageUrl", url, { shouldDirty: true })}
                  />
                </Field>
              ) : null}
            </Card>

            <Disclosure
              title={t("editor.colorsTitle")}
              description={t("editor.colorsDesc")}
              open={colorsOpen || hasColorError}
              onOpenChange={setColorsOpen}
              badge={
                values.buttonColor || values.buttonTextColor || values.textColor ? (
                  <Badge tone="accent" size="sm">
                    {t("editor.customised")}
                  </Badge>
                ) : null
              }
            >
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <ColorField
                    label={t("buttonColor")}
                    info={t("buttonColorInfo")}
                    value={values.buttonColor}
                    placeholder="#0f766e"
                    error={errors.buttonColor ? fieldError("buttonColor") : undefined}
                    onChange={(value) => setValue("buttonColor", value, { shouldDirty: true, shouldValidate: Boolean(errors.buttonColor) })}
                  />
                  <ColorField
                    label={t("buttonTextColor")}
                    info={t("buttonTextColorInfo")}
                    value={values.buttonTextColor}
                    placeholder="#ffffff"
                    error={errors.buttonTextColor ? fieldError("buttonTextColor") : undefined}
                    onChange={(value) => setValue("buttonTextColor", value, { shouldDirty: true, shouldValidate: Boolean(errors.buttonTextColor) })}
                  />
                  <ColorField
                    label={t("textColor")}
                    info={t("textColorInfo")}
                    value={values.textColor}
                    placeholder="#171717"
                    error={errors.textColor ? fieldError("textColor") : undefined}
                    onChange={(value) => setValue("textColor", value, { shouldDirty: true, shouldValidate: Boolean(errors.textColor) })}
                  />
                </div>
                {values.buttonColor || values.buttonTextColor || values.textColor ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    leadingIcon="rotate-right"
                    className="self-start"
                    onClick={() => {
                      setValue("buttonColor", "", { shouldDirty: true });
                      setValue("buttonTextColor", "", { shouldDirty: true });
                      setValue("textColor", "", { shouldDirty: true });
                    }}
                  >
                    {t("editor.resetColors")}
                  </Button>
                ) : null}
              </div>
            </Disclosure>

            <Disclosure
              title={t("customCss")}
              description={t("editor.cssDesc")}
              open={cssOpen || Boolean(errors.customCss)}
              onOpenChange={setCssOpen}
            >
              {canCustomCss ? (
                <Field label={t("customCss")} info={t("customCssInfo")} hint={t("customCssHint")}>
                  <Textarea
                    rows={5}
                    maxLength={4000}
                    className="font-mono text-[13px]"
                    spellCheck={false}
                    placeholder="border-radius: 24px; letter-spacing: .01em;"
                    {...register("customCss")}
                  />
                </Field>
              ) : (
                <Callout
                  tone="neutral"
                  title={t("customCssPaywall")}
                  actions={
                    <Button size="sm" href="/billing" leadingIcon="rocket">
                      {tc("seePlans")}
                    </Button>
                  }
                />
              )}
            </Disclosure>
          </TabPanel>

          {/* ── Settings ────────────────────────────────────────────── */}
          <TabPanel active={tab === "settings"} className="flex flex-col gap-4">
            <SectionCard title={t("editor.visibilityTitle")} description={t("editor.visibilityDesc")} headingLevel={3}>
              <SettingsRow
                label={t("published")}
                description={
                  pendingStatus === "live"
                    ? t("statusLive")
                    : pendingStatus === "scheduled"
                      ? t("statusScheduled")
                      : pendingStatus === "ended"
                        ? t("editor.statusEnded")
                        : t("statusDraft")
                }
                info={t("publishedInfo")}
              >
                <Switch
                  checked={values.published}
                  aria-label={t("published")}
                  onCheckedChange={(checked) => {
                    void togglePublished(checked);
                  }}
                  className="md:self-end"
                />
              </SettingsRow>
              <div className="py-4">
                <Disclosure
                  variant="plain"
                  title={t("schedule")}
                  description={t("editor.scheduleDesc")}
                  open={scheduleOpen || hasScheduleError}
                  onOpenChange={setScheduleOpen}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                        {t("publishAt")}
                        <InfoTip inline label={t("publishAt")}>
                          {t("publishAtInfo")}
                        </InfoTip>
                      </span>
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
                      <span className="text-[13px] text-fg-subtle">{t("editor.publishAtHint")}</span>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                        {t("unpublishAt")}
                        <InfoTip inline label={t("unpublishAt")}>
                          {t("unpublishAtInfo")}
                        </InfoTip>
                      </span>
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
                      <span className="text-[13px] text-fg-subtle">{t("editor.unpublishAtHint")}</span>
                    </div>
                  </div>
                  {!values.published && (values.publishAt || values.unpublishAt) ? (
                    <Callout tone="warn" className="mt-4">
                      {t("editor.scheduleNeedsPublish")}
                    </Callout>
                  ) : null}
                </Disclosure>
              </div>
            </SectionCard>

            <SectionCard
              title={t("editor.addressTitle")}
              description={t("editor.addressDesc")}
              headingLevel={3}
              divided={false}
            >
              {domains.length > 0 ? (
                <Field label={t("domain")} info={t("domainInfo")} hint={t("domainHint")} className="max-w-sm">
                  <Select {...register("domainId")}>
                    <option value="">{platformHostname}</option>
                    {domains.map((domain) => (
                      <option
                        key={domain.id}
                        value={domain.id}
                        disabled={!domain.ready && domain.id !== savedDomainId}
                      >
                        {domain.ready ? domain.hostname : t("domainNotReady", { host: domain.hostname })}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <HandleField
                value={values.handle}
                onChange={(next) => {
                  setValue("handle", next, { shouldDirty: true });
                  if (errors.handle) {
                    clearErrors("handle");
                  }
                }}
                domainId={values.domainId}
                hostname={hostname}
                pageId={biopageId}
                savedHandle={savedHandle}
                savedDomainId={savedDomainId}
                error={errors.handle ? fieldError("handle") : undefined}
              />
              {addressChanged && status !== "draft" ? (
                <Callout tone="warn" title={t("editor.addressChangeTitle")}>
                  {t("editor.addressChangeBody", { old: `${savedHost}/${savedHandle}` })}
                </Callout>
              ) : null}
              <CopyField
                label={t("editor.yourAddress")}
                value={publicUrl}
                href={isLive ? publicUrl : undefined}
                hint={isLive ? undefined : t("editor.addressNotLive")}
                copyLabel={t("copyUrl")}
              />
            </SectionCard>

            <SectionCard title={t("editor.accessTitle")} description={t("editor.accessDesc")} headingLevel={3}>
              <SettingsRow label={t("sensitive")} description={t("editor.sensitiveDesc")} info={t("sensitiveInfo")}>
                <Switch
                  checked={values.sensitive}
                  aria-label={t("sensitive")}
                  onCheckedChange={(checked) => setValue("sensitive", checked, { shouldDirty: true })}
                  className="md:self-end"
                />
              </SettingsRow>
              <SettingsRow
                label={values.hasPassword ? t("passwordReplace") : t("password")}
                description={values.hasPassword ? t("editor.passwordSet") : t("editor.passwordDesc")}
                info={t("passwordInfo")}
              >
                {canPassword || values.hasPassword ? (
                  <Field
                    hint={t("passwordHint")}
                    error={errors.password ? fieldError("password") : undefined}
                  >
                    <SecretInput
                      domName="bio-gate-password"
                      aria-label={values.hasPassword ? t("passwordReplace") : t("password")}
                      aria-invalid={Boolean(errors.password) || undefined}
                      ref={passwordField.ref}
                      onChange={passwordField.onChange}
                      onBlur={passwordField.onBlur}
                    />
                  </Field>
                ) : (
                  <span className="flex flex-wrap items-center gap-2 text-[13px] text-fg-muted">
                    {t("editor.passwordLocked")}
                    <Button size="sm" href="/billing" leadingIcon="rocket">
                      {tc("seePlans")}
                    </Button>
                  </span>
                )}
              </SettingsRow>
              {values.hasPassword ? (
                <SettingsRow
                  label={t("removePassword")}
                  description={t("removePasswordHint")}
                  info={t("removePasswordInfo")}
                >
                  <Switch
                    checked={values.removePassword}
                    aria-label={t("removePassword")}
                    onCheckedChange={(checked) => setValue("removePassword", checked, { shouldDirty: true })}
                    className="md:self-end"
                  />
                </SettingsRow>
              ) : null}
            </SectionCard>

            <SectionCard
              title={t("editor.seoTitle")}
              description={t("editor.seoDesc")}
              headingLevel={3}
              divided={false}
            >
              <Field
                label={t("seoTitle")}
                info={t("seoTitleInfo")}
                hint={t("seoTitleHint")}
                error={errors.seoTitle ? fieldError("seoTitle") : undefined}
              >
                <Input maxLength={120} placeholder={values.displayName} {...register("seoTitle")} />
              </Field>
              <Field
                label={t("seoDescription")}
                info={t("seoDescriptionInfo")}
                hint={t("seoDescriptionHint")}
                error={errors.seoDescription ? fieldError("seoDescription") : undefined}
              >
                <Textarea rows={3} maxLength={300} placeholder={values.bio} {...register("seoDescription")} />
              </Field>
              <Field label={t("ogImage")} info={t("ogImageInfo")} hint={t("ogImageHint")}>
                <ImageUpload
                  value={values.ogImageUrl}
                  onChange={(url) => setValue("ogImageUrl", url, { shouldDirty: true })}
                />
              </Field>
            </SectionCard>

            <Disclosure
              title={t("editor.bannersTitle")}
              description={t("editor.bannersDesc")}
              open={bannersOpen || hasBannerError}
              onOpenChange={setBannersOpen}
              badge={
                values.adsEnabled ? (
                  <Badge tone="success" size="sm" dot>
                    {t("editor.on")}
                  </Badge>
                ) : null
              }
            >
              <div className="flex flex-col gap-5">
                <div className="flex min-w-0 items-center justify-between gap-4">
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      {t("adsEnabled")}
                      <InfoTip inline label={t("adsEnabled")}>
                        {t("adsEnabledInfo")}
                      </InfoTip>
                    </span>
                    <span className="text-[13px] text-fg-muted">{t("adsEnabledHint")}</span>
                  </span>
                  <Switch
                    checked={values.adsEnabled}
                    aria-label={t("adsEnabled")}
                    onCheckedChange={(checked) => setValue("adsEnabled", checked, { shouldDirty: true })}
                  />
                </div>
                <div className={cn("grid gap-4 lg:grid-cols-3", !values.adsEnabled && "opacity-60")}>
                  {(
                    [
                      ["adMobileImage", "adMobileHref", "adMobile", "adMobileInfo", "adMobileHref"],
                      ["adLeftImage", "adLeftHref", "adLeft", "adLeftInfo", "adLeftHref"],
                      ["adRightImage", "adRightHref", "adRight", "adRightInfo", "adRightHref"],
                    ] as const
                  ).map(([imageKey, hrefKey, labelKey, infoKey, hrefLabelKey]) => (
                    <div
                      key={imageKey}
                      className="flex min-w-0 flex-col gap-3 rounded-md border border-border-subtle bg-surface-subtle p-4"
                    >
                      <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                        {t(labelKey)}
                        <InfoTip inline label={t(labelKey)}>
                          {t(infoKey)}
                        </InfoTip>
                      </span>
                      <ImageUpload
                        value={values[imageKey]}
                        onChange={(url) => setValue(imageKey, url, { shouldDirty: true })}
                      />
                      <Field
                        label={t(hrefLabelKey)}
                        info={t("adHrefInfo")}
                        error={errors[hrefKey] ? fieldError(hrefKey) : undefined}
                      >
                        <Input
                          type="url"
                          inputMode="url"
                          placeholder="https://"
                          aria-invalid={Boolean(errors[hrefKey]) || undefined}
                          {...register(hrefKey)}
                        />
                      </Field>
                    </div>
                  ))}
                </div>
              </div>
            </Disclosure>

            <SectionCard tone="danger" title={t("dangerZone")} headingLevel={3}>
              <SettingsRow label={t("deletePage")} description={t("deleteHint")}>
                <Button
                  variant="danger"
                  leadingIcon="trash"
                  className="md:self-end"
                  onClick={() => setConfirmDelete(true)}
                >
                  {t("deletePage")}
                </Button>
              </SettingsRow>
            </SectionCard>
          </TabPanel>
        </div>

        {/* Mobile: the preview replaces the editor when toggled. Desktop: sticky side column. */}
        {mobileView === "preview" ? <div className="min-w-0 lg:hidden">{preview}</div> : null}
        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-20 flex flex-col gap-3">
            {preview}
            <p className="m-0 text-center text-xs text-fg-subtle">{t("editor.previewNote")}</p>
          </div>
        </aside>
      </div>

      <BlockPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addBlock}
        canForms={canForms}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={t("deleteDialogTitle", { name: saved?.displayName ?? values.displayName })}
        description={t("deleteDialogBody")}
        confirmLabel={t("deletePage")}
        loading={deleting}
        onConfirm={() => {
          void removePage();
        }}
        onClose={() => setConfirmDelete(false)}
      />

      <SaveBar
        dirty={isDirty || formError !== null}
        saving={isSubmitting && !publishing}
        message={
          formError ? (
            <span role="alert" className="text-danger">
              {formError}
            </span>
          ) : (
            tc("unsavedChanges")
          )
        }
        actions={
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                reset();
                setFormError(null);
              }}
              disabled={isSubmitting}
            >
              {t("discard")}
            </Button>
            <Button size="sm" type="submit" variant="primary" loading={isSubmitting && !publishing}>
              {isSubmitting && !publishing ? t("saving") : t("saveChanges")}
            </Button>
          </>
        }
      />
    </form>
  );
}
