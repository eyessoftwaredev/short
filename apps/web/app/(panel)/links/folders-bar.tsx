"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/kit/icon";
import { Button, ConfirmDialog, EmptyState, Field, Input, Modal, toast } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import { createFolderAction, deleteFolderAction, renameFolderAction } from "./folder-actions";

export type FolderChip = { id: string; name: string };

type FolderManagerButtonProps = {
  folders: FolderChip[];
  /** The folder the list is filtered by; deleting it clears the filter. */
  selectedId: string;
};

/** Small "manage" button next to the folder filter; the dialog creates, renames and deletes. */
export function FolderManagerButton({ folders, selectedId }: FolderManagerButtonProps) {
  const t = useTranslations("links");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        icon
        aria-label={t("list.manageFolders")}
        title={t("list.manageFolders")}
        onClick={() => setOpen(true)}
      >
        <Icon name="gear" className="text-xs" />
      </Button>
      <FolderManager open={open} onClose={() => setOpen(false)} folders={folders} selectedId={selectedId} />
    </>
  );
}

function FolderManager({
  open,
  onClose,
  folders,
  selectedId,
}: FolderManagerButtonProps & { open: boolean; onClose: () => void }) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useSearchParams();
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<FolderChip | null>(null);
  const [error, setError] = useState<string | null>(null);

  function create(): void {
    if (name.trim() === "") {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createFolderAction(name);
      if (!result.ok) {
        setError(actionMessage(result.error));
        return;
      }
      toast.success(t("list.folderCreated", { name: name.trim() }));
      setName("");
      router.refresh();
    });
  }

  function rename(folder: FolderChip): void {
    setError(null);
    startTransition(async () => {
      const result = await renameFolderAction(folder.id, renameValue);
      if (!result.ok) {
        setError(actionMessage(result.error));
        return;
      }
      setRenamingId(null);
      toast.success(t("list.folderRenamed"));
      router.refresh();
    });
  }

  function remove(folder: FolderChip): void {
    startTransition(async () => {
      const result = await deleteFolderAction(folder.id);
      setDeleting(null);
      if (!result.ok) {
        toast.error(actionMessage(result.error));
        return;
      }
      toast.success(t("list.folderDeleted", { name: folder.name }));
      if (selectedId === folder.id) {
        const next = new URLSearchParams(params.toString());
        next.delete("folderId");
        next.delete("page");
        const query = next.toString();
        router.push(query ? `/links?${query}` : "/links");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      <Modal
        open={open && deleting == null}
        title={t("list.foldersTitle")}
        description={t("list.foldersDesc")}
        icon="folder"
        onClose={() => {
          setRenamingId(null);
          setError(null);
          onClose();
        }}
        footer={<Button onClick={onClose}>{tc("done")}</Button>}
      >
        <div className="flex min-w-0 flex-col gap-4">
          {folders.length === 0 ? (
            <EmptyState size="sm" icon="folder" title={t("list.noFolders")} description={t("list.noFoldersBody")} />
          ) : (
            <ul className="m-0 flex min-w-0 list-none flex-col divide-y divide-border-subtle rounded-md border border-border p-0">
              {folders.map((folder) => (
                <li key={folder.id} className="flex min-w-0 items-center gap-2 px-3 py-2">
                  {renamingId === folder.id ? (
                    <form
                      className="flex min-w-0 flex-1 items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        rename(folder);
                      }}
                    >
                      <Input
                        value={renameValue}
                        aria-label={t("renameFolder")}
                        maxLength={80}
                        autoFocus
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.stopPropagation();
                            setRenamingId(null);
                          }
                        }}
                      />
                      <Button type="submit" size="sm" variant="primary" loading={pending} disabled={renameValue.trim() === ""}>
                        {t("saveFolder")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRenamingId(null)}>
                        {tc("cancel")}
                      </Button>
                    </form>
                  ) : (
                    <>
                      <Icon name="folder" className="text-xs text-fg-subtle" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{folder.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon
                        aria-label={`${t("renameFolder")}: ${folder.name}`}
                        title={t("renameFolder")}
                        onClick={() => {
                          setRenamingId(folder.id);
                          setRenameValue(folder.name);
                          setError(null);
                        }}
                      >
                        <Icon name="pen" className="text-xs" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon
                        aria-label={`${t("deleteFolder")}: ${folder.name}`}
                        title={t("deleteFolder")}
                        onClick={() => setDeleting(folder)}
                      >
                        <Icon name="trash" className="text-xs" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form
            className="flex min-w-0 items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              create();
            }}
          >
            <Field label={t("list.newFolder")} info={t("info.folder")} className="flex-1">
              <Input
                value={name}
                maxLength={80}
                placeholder={t("newFolderPlaceholder")}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Button type="submit" leadingIcon="plus" loading={pending && renamingId == null} disabled={name.trim() === ""}>
              {t("addFolder")}
            </Button>
          </form>

          {error ? (
            <p role="alert" className="m-0 text-[13px] text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting != null}
        title={t("list.deleteFolderTitle", { name: deleting?.name ?? "" })}
        description={t("list.deleteFolderBody")}
        confirmLabel={t("deleteFolder")}
        loading={pending}
        onConfirm={() => {
          if (deleting) {
            remove(deleting);
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
