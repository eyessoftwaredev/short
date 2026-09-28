"use client";

import { Icon } from "@/components/kit/icon";
import { useTranslations } from "next-intl";
import { useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import {
  bulkArchiveLinksAction,
  bulkDeleteLinksAction,
  bulkMoveLinksAction,
  bulkTagLinksAction,
  exportSelectedLinksCsvAction,
  listLinkFoldersAction,
  type BulkLinkResult,
  type LinkFolderOption,
} from "./actions";
import type { ActionResult } from "@/lib/action-result";

type Dialog = "move" | "tag" | "delete" | null;

type LinksBulkBarProps = {
  selectedIds: string[];
  canDelete: boolean;
  onClear: () => void;
  /** Reports a finished batch; the table shows it, clears the selection and refreshes. */
  onDone: (message: string) => void;
  onError: (message: string) => void;
};

function downloadCsv(text: string, filename: string): void {
  // BOM so Excel opens UTF-8 titles correctly.
  const blob = new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function BarButton({
  label,
  icon,
  danger = false,
  disabled,
  onClick,
}: {
  label: string;
  icon: ComponentProps<typeof Icon>["name"];
  danger?: boolean;
  disabled: boolean;
  onClick: () => void;
}): ReactNode {
  return (
    <Button
      size="sm"
      variant={danger ? "danger" : "ghost"}
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} className="text-sm" aria-hidden="true" />
      {/* Icons alone on phones keep the bar to one or two lines. */}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

export function LinksBulkBar({
  selectedIds,
  canDelete,
  onClear,
  onDone,
  onError,
}: LinksBulkBarProps) {
  const t = useTranslations("links.bulk");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [folders, setFolders] = useState<LinkFolderOption[] | null>(null);
  const [folderId, setFolderId] = useState("");
  const [tag, setTag] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const count = selectedIds.length;
  const tagValid = tag.trim() !== "" && tag.trim().length <= 48 && !tag.includes(",");

  function closeDialog(): void {
    setDialog(null);
    setDialogError(null);
  }

  function run(
    action: () => Promise<ActionResult<BulkLinkResult>>,
    message: (count: number) => string,
  ): void {
    setDialogError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          const text = actionMessage(result.error);
          if (dialog) {
            setDialogError(text);
          } else {
            onError(text);
          }
          return;
        }
        setDialog(null);
        onDone(message(result.data.count));
      } catch (error) {
        console.error("bulk link action failed", error);
        onError(actionMessage("generic"));
      }
    });
  }

  function openMove(): void {
    setDialog("move");
    setDialogError(null);
    setFolderId("");
    if (folders) {
      return;
    }
    startTransition(async () => {
      const result = await listLinkFoldersAction().catch(() => null);
      if (result?.ok) {
        setFolders(result.data);
      } else {
        setFolders([]);
        setDialogError(actionMessage(result?.ok === false ? result.error : "generic"));
      }
    });
  }

  function exportSelected(): void {
    startTransition(async () => {
      try {
        const result = await exportSelectedLinksCsvAction(selectedIds);
        if (!result.ok) {
          onError(actionMessage(result.error));
          return;
        }
        downloadCsv(result.data, "links-selected.csv");
      } catch (error) {
        console.error("CSV export failed", error);
        onError(actionMessage("generic"));
      }
    });
  }

  return (
    <>
      <div
        role="region"
        aria-label={t("actionsLabel")}
        className="sticky bottom-4 z-toast flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-default border border-border-strong bg-bg px-3 py-2 shadow-toast"
      >
        <span className="flex min-w-0 items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon
            aria-label={t("clear")}
            title={t("clear")}
            disabled={pending}
            onClick={onClear}
          >
            <Icon name="xmark" className="text-sm" aria-hidden="true" />
          </Button>
          <span role="status" className="truncate text-sm font-medium">
            {t("selected", { count })}
          </span>
        </span>

        <span className="flex min-w-0 flex-wrap items-center gap-1">
          <BarButton
            label={t("archive")}
            icon="archive"
            disabled={pending}
            onClick={() =>
              run(() => bulkArchiveLinksAction(selectedIds, true), (n) => t("doneArchived", { count: n }))
            }
          />
          <BarButton
            label={t("restore")}
            icon="archive-restore"
            disabled={pending}
            onClick={() =>
              run(() => bulkArchiveLinksAction(selectedIds, false), (n) => t("doneRestored", { count: n }))
            }
          />
          <BarButton label={t("move")} icon="folder" disabled={pending} onClick={openMove} />
          <BarButton
            label={t("tag")}
            icon="tag"
            disabled={pending}
            onClick={() => {
              setTag("");
              setDialogError(null);
              setDialog("tag");
            }}
          />
          {canDelete ? (
            <>
              <BarButton label={t("export")} icon="download" disabled={pending} onClick={exportSelected} />
              <BarButton
                label={t("delete")}
                icon="trash"
                danger
                disabled={pending}
                onClick={() => {
                  setDialogError(null);
                  setDialog("delete");
                }}
              />
            </>
          ) : null}
        </span>
      </div>

      <Modal
        open={dialog === "move"}
        title={t("moveTitle")}
        description={t("moveDesc", { count })}
        onClose={closeDialog}
        footer={
          <>
            <Button disabled={pending} onClick={closeDialog}>
              {tc("cancel")}
            </Button>
            <Button
              variant="primary"
              disabled={pending || folders === null}
              onClick={() =>
                run(
                  () => bulkMoveLinksAction(selectedIds, folderId === "" ? null : folderId),
                  (n) => t("doneMoved", { count: n }),
                )
              }
            >
              {pending ? tc("working") : t("moveConfirm")}
            </Button>
          </>
        }
      >
        <div className="flex min-w-0 flex-col gap-2">
          <Field label={t("folder")} info={t("folderInfo")}>
            <Select
              value={folderId}
              disabled={folders === null}
              onChange={(event) => setFolderId(event.target.value)}
            >
              <option value="">{t("noFolder")}</option>
              {(folders ?? []).map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </Select>
          </Field>
          {folders === null ? (
            <p className="m-0 text-xs text-fg-subtle">{t("foldersLoading")}</p>
          ) : null}
          {dialogError ? (
            <p role="alert" className="m-0 text-xs text-danger">
              {dialogError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={dialog === "tag"}
        title={t("tagTitle")}
        description={t("tagDesc", { count })}
        onClose={closeDialog}
        footer={
          <>
            <Button disabled={pending} onClick={closeDialog}>
              {tc("cancel")}
            </Button>
            <Button
              variant="primary"
              disabled={pending || !tagValid}
              onClick={() =>
                run(() => bulkTagLinksAction(selectedIds, tag.trim()), (n) => t("doneTagged", { count: n }))
              }
            >
              {pending ? tc("working") : t("tagConfirm")}
            </Button>
          </>
        }
      >
        <div className="flex min-w-0 flex-col gap-2">
          <Field
            label={t("tagLabel")}
            info={t("tagInfo")}
            error={tag !== "" && !tagValid ? t("tagInvalid") : undefined}
          >
            <Input
              value={tag}
              maxLength={48}
              autoComplete="off"
              placeholder={t("tagPlaceholder")}
              onChange={(event) => setTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (tagValid && !pending) {
                    run(
                      () => bulkTagLinksAction(selectedIds, tag.trim()),
                      (n) => t("doneTagged", { count: n }),
                    );
                  }
                }
              }}
            />
          </Field>
          {dialogError ? (
            <p role="alert" className="m-0 text-xs text-danger">
              {dialogError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={dialog === "delete"}
        title={t("deleteTitle", { count })}
        onClose={closeDialog}
        footer={
          <>
            <Button disabled={pending} onClick={closeDialog}>
              {tc("cancel")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                run(() => bulkDeleteLinksAction(selectedIds), (n) => t("doneDeleted", { count: n }))
              }
            >
              {pending ? tc("working") : t("deleteConfirm", { count })}
            </Button>
          </>
        }
      >
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex min-w-0 items-start gap-3 rounded-default border border-danger bg-danger-surface px-3.5 py-3">
            <Icon name="warning" className="mt-0.5 shrink-0 text-sm text-danger" aria-hidden="true" />
            <p className="m-0 min-w-0 text-sm text-fg-muted">{t("deleteDesc")}</p>
          </div>
          {dialogError ? (
            <p role="alert" className="m-0 text-xs text-danger">
              {dialogError}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
