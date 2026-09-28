"use client";

import { UTM_KEYS, type LinkOpenMode } from "@short/core";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Dropdown,
  EmptyState,
  Field,
  Input,
  Modal,
  SectionCard,
  Select,
  SettingsRow,
  Switch,
} from "@/components/ui";
import { Icon } from "@/components/kit/icon";
import { formatDate } from "@/lib/format";
import type { UtmTemplateView } from "@/lib/utm-templates";
import type { WorkspaceSettings } from "@/lib/workspace-settings";
import { deleteUtmTemplateAction, renameUtmTemplateAction } from "../links/utm-template-actions";
import { saveWorkspaceSettingsAction } from "./defaults-actions";
import { useSettingsAction, useSettingsConfirm } from "./settings-dialogs";

type FolderOption = { id: string; name: string };

type SettingsLinkDefaultsProps = {
  settings: WorkspaceSettings;
  templates: UtmTemplateView[];
  folders: FolderOption[];
  /** Owner/admin: may change the workspace defaults. */
  canManage: boolean;
  /** Any editor: may rename and delete UTM templates. */
  canWrite: boolean;
};

const OPEN_MODES: readonly LinkOpenMode[] = ["auto", "app", "browser"];

export function SettingsLinkDefaults({
  settings,
  templates,
  folders,
  canManage,
  canWrite,
}: SettingsLinkDefaultsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DefaultsCard settings={settings} templates={templates} folders={folders} canManage={canManage} />
      <TemplatesCard templates={templates} defaultId={settings.defaultUtmTemplateId} canWrite={canWrite} />
    </div>
  );
}

type Draft = Pick<
  WorkspaceSettings,
  "defaultOpenMode" | "defaultUtmTemplateId" | "defaultNoIndex" | "defaultForwardQuery" | "defaultFolderId"
>;

function draftFrom(settings: WorkspaceSettings): Draft {
  return {
    defaultOpenMode: settings.defaultOpenMode,
    defaultUtmTemplateId: settings.defaultUtmTemplateId,
    defaultNoIndex: settings.defaultNoIndex,
    defaultForwardQuery: settings.defaultForwardQuery,
    defaultFolderId: settings.defaultFolderId,
  };
}

function DefaultsCard({
  settings,
  templates,
  folders,
  canManage,
}: {
  settings: WorkspaceSettings;
  templates: UtmTemplateView[];
  folders: FolderOption[];
  canManage: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("settings");
  const { pending, run } = useSettingsAction();
  const saved = draftFrom(settings);
  const [draft, setDraft] = useState<Draft>(saved);
  const dirty = (Object.keys(saved) as Array<keyof Draft>).some((key) => saved[key] !== draft[key]);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const modeHint: Record<LinkOpenMode, string> = {
    auto: t("openModeAutoHint"),
    app: t("openModeAppHint"),
    browser: t("openModeBrowserHint"),
  };
  const modeLabel: Record<LinkOpenMode, string> = {
    auto: t("openModeAuto"),
    app: t("openModeApp"),
    browser: t("openModeBrowser"),
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canManage && dirty) {
          void run(() => saveWorkspaceSettingsAction(draft), t("defaultsSaved"));
        }
      }}
    >
      <SectionCard
        id="link-defaults"
        title={t("defaultsTitle")}
        description={t("defaultsDescription")}
        footer={
          <>
            <span className="mr-auto text-[13px] text-fg-subtle">
              {canManage
                ? settings.updatedAt
                  ? t("defaultsUpdated", { date: formatDate(settings.updatedAt, locale) })
                  : t("defaultsNeverSaved")
                : t("defaultsLocked")}
            </span>
            {canManage && dirty ? (
              <Button type="button" variant="ghost" disabled={pending} onClick={() => setDraft(saved)}>
                {t("discardChanges")}
              </Button>
            ) : null}
            {canManage ? (
              <Button type="submit" variant="primary" loading={pending} disabled={!dirty}>
                {t("saveDefaults")}
              </Button>
            ) : null}
          </>
        }
      >
        <SettingsRow
          label={t("defaultOpenMode")}
          description={modeHint[draft.defaultOpenMode]}
          info={t("defaultOpenModeInfo")}
          htmlFor="default-open-mode"
        >
          <Select
            id="default-open-mode"
            value={draft.defaultOpenMode}
            disabled={!canManage}
            onChange={(event) => {
              const next = OPEN_MODES.find((mode) => mode === event.target.value);
              if (next) {
                set("defaultOpenMode", next);
              }
            }}
          >
            {OPEN_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {modeLabel[mode]}
              </option>
            ))}
          </Select>
        </SettingsRow>

        <SettingsRow
          label={t("defaultUtmTemplate")}
          description={t("defaultUtmTemplateDesc")}
          info={t("defaultUtmTemplateInfo")}
          htmlFor="default-utm-template"
        >
          <Select
            id="default-utm-template"
            value={draft.defaultUtmTemplateId ?? ""}
            disabled={!canManage || templates.length === 0}
            onChange={(event) => set("defaultUtmTemplateId", event.target.value || null)}
          >
            <option value="">{t("noDefaultTemplate")}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </Select>
          {templates.length === 0 ? (
            <span className="text-[13px] text-fg-subtle">{t("noTemplatesHint")}</span>
          ) : null}
        </SettingsRow>

        <SettingsRow
          label={t("defaultFolder")}
          description={t("defaultFolderDesc")}
          info={t("defaultFolderInfo")}
          htmlFor="default-folder"
        >
          <Select
            id="default-folder"
            value={draft.defaultFolderId ?? ""}
            disabled={!canManage || folders.length === 0}
            onChange={(event) => set("defaultFolderId", event.target.value || null)}
          >
            <option value="">{t("noDefaultFolder")}</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </Select>
          {folders.length === 0 ? (
            <span className="text-[13px] text-fg-subtle">{t("noFoldersHint")}</span>
          ) : null}
        </SettingsRow>

        <SettingsRow
          label={t("defaultNoIndex")}
          description={t("defaultNoIndexDesc")}
          info={t("defaultNoIndexInfo")}
        >
          <Switch
            checked={draft.defaultNoIndex}
            disabled={!canManage}
            aria-label={t("defaultNoIndex")}
            onCheckedChange={(checked) => set("defaultNoIndex", checked)}
          />
        </SettingsRow>

        <SettingsRow
          label={t("defaultForwardQuery")}
          description={t("defaultForwardQueryDesc")}
          info={t("defaultForwardQueryInfo")}
        >
          <Switch
            checked={draft.defaultForwardQuery}
            disabled={!canManage}
            aria-label={t("defaultForwardQuery")}
            onCheckedChange={(checked) => set("defaultForwardQuery", checked)}
          />
        </SettingsRow>
      </SectionCard>
    </form>
  );
}

function utmSummary(template: UtmTemplateView): string {
  return UTM_KEYS.filter((key) => template.utm[key])
    .map((key) => `${key.replace("utm_", "")}=${template.utm[key]}`)
    .join(" · ");
}

function TemplatesCard({
  templates,
  defaultId,
  canWrite,
}: {
  templates: UtmTemplateView[];
  defaultId: string | null;
  canWrite: boolean;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { pending, run } = useSettingsAction();
  const { requestConfirm, dialog } = useSettingsConfirm();
  const [renaming, setRenaming] = useState<UtmTemplateView | null>(null);
  const [name, setName] = useState("");
  const trimmed = name.trim();

  function openRename(template: UtmTemplateView): void {
    setName(template.name);
    setRenaming(template);
  }

  async function submitRename(): Promise<void> {
    if (!renaming || trimmed === "" || trimmed.length > 64) {
      return;
    }
    const ok = await run(() => renameUtmTemplateAction(renaming.id, trimmed), t("templateRenamed"));
    if (ok) {
      setRenaming(null);
    }
  }

  return (
    <>
      <SectionCard
        id="utm-templates"
        title={t("templatesTitle")}
        description={t("templatesDescription")}
        actions={
          <Button size="sm" leadingIcon="plus" href="/links/new">
            {t("templatesCreate")}
          </Button>
        }
        divided={templates.length > 0}
      >
        {templates.length === 0 ? (
          <EmptyState
            bare
            size="sm"
            icon="tag"
            title={t("templatesEmptyTitle")}
            description={t("templatesEmptyBody")}
          />
        ) : (
          templates.map((template) => (
            <div key={template.id} className="flex min-w-0 items-center gap-3 py-3.5">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-default bg-surface text-fg-subtle"
                aria-hidden="true"
              >
                <Icon name="tag" className="text-xs" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">{template.name}</span>
                  {template.id === defaultId ? (
                    <Badge tone="accent" size="sm">
                      {t("templateDefault")}
                    </Badge>
                  ) : null}
                </span>
                <span className="truncate font-mono text-xs text-fg-muted">{utmSummary(template)}</span>
              </span>
              {canWrite ? (
                <Dropdown
                  align="end"
                  label={t("templateActions", { name: template.name })}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      icon
                      aria-label={t("templateActions", { name: template.name })}
                    >
                      <Icon name="ellipsis" className="text-sm" />
                    </Button>
                  }
                  items={[
                    {
                      id: "rename",
                      label: t("templateRename"),
                      icon: <Icon name="pen" className="text-xs" />,
                      onSelect: () => openRename(template),
                    },
                    {
                      id: "delete",
                      label: t("templateDelete"),
                      icon: <Icon name="trash" className="text-xs" />,
                      danger: true,
                      separated: true,
                      onSelect: () =>
                        requestConfirm({
                          title: t("templateDeleteTitle", { name: template.name }),
                          description: t("templateDeleteBody"),
                          consequences: template.id === defaultId ? [t("templateDeleteDefault")] : undefined,
                          confirmLabel: t("templateDelete"),
                          onConfirm: () =>
                            run(() => deleteUtmTemplateAction(template.id), t("templateDeleted")),
                        }),
                    },
                  ]}
                />
              ) : null}
            </div>
          ))
        )}
      </SectionCard>

      <Modal
        open={renaming !== null}
        title={t("templateRenameTitle")}
        icon="pen"
        size="sm"
        onClose={() => (pending ? undefined : setRenaming(null))}
        footer={
          <>
            <Button disabled={pending} onClick={() => setRenaming(null)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={pending}
              disabled={trimmed === "" || trimmed.length > 64 || trimmed === renaming?.name}
              onClick={() => void submitRename()}
            >
              {t("templateRenameConfirm")}
            </Button>
          </>
        }
      >
        <Field label={t("templateName")} info={t("templateNameInfo")} hint={t("templateNameHint")}>
          <Input
            value={name}
            maxLength={64}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submitRename();
              }
            }}
          />
        </Field>
      </Modal>
      {dialog}
    </>
  );
}
