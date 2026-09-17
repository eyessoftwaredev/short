"use client";

import { Icon } from "@/components/kit/icon";
import { Button, Chip, Input } from "@/components/ui";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { createFolderAction, deleteFolderAction, renameFolderAction } from "./folder-actions";

export type FolderChip = { id: string; name: string };

export function FoldersBar({ folders }: { folders: FolderChip[] }) {
  const t = useTranslations("links");
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const selected = params.get("folderId") ?? "";

  function go(folderId: string | null): void {
    const next = new URLSearchParams(params.toString());
    if (folderId) {
      next.set("folderId", folderId);
    } else {
      next.delete("folderId");
    }
    next.delete("page");
    startTransition(() => router.push(`/links?${next.toString()}`));
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Chip active={selected === ""} onClick={() => go(null)}>
          {t("allFolders")}
        </Chip>
        {folders.map((folder) => (
          <span key={folder.id} className="flex min-w-0 items-center gap-1">
            {renamingId === folder.id ? (
              <form
                className="flex items-center gap-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  startTransition(async () => {
                    await renameFolderAction(folder.id, renameValue);
                    setRenamingId(null);
                    router.refresh();
                  });
                }}
              >
                <Input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  className="w-40"
                />
                <Button type="submit" size="sm" disabled={pending}>
                  {t("saveFolder")}
                </Button>
              </form>
            ) : (
              <>
                <Chip active={selected === folder.id} onClick={() => go(folder.id)}>
                  {folder.name}
                </Chip>
                <Button
                  size="sm"
                  variant="ghost"
                  icon
                  aria-label={t("renameFolder")}
                  onClick={() => {
                    setRenamingId(folder.id);
                    setRenameValue(folder.name);
                  }}
                >
                  <Icon name="pen" className="text-xs" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon
                  aria-label={t("deleteFolder")}
                  onClick={() => {
                    if (!window.confirm(t("deleteFolderConfirm", { name: folder.name }))) {
                      return;
                    }
                    startTransition(async () => {
                      await deleteFolderAction(folder.id);
                      if (selected === folder.id) {
                        go(null);
                      }
                      router.refresh();
                    });
                  }}
                >
                  <Icon name="trash" className="text-xs" />
                </Button>
              </>
            )}
          </span>
        ))}
      </div>
      <form
        className="flex min-w-0 max-w-md items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() === "") {
            return;
          }
          startTransition(async () => {
            await createFolderAction(name);
            setName("");
            router.refresh();
          });
        }}
      >
        <Input
          value={name}
          placeholder={t("newFolderPlaceholder")}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" size="sm" disabled={pending || name.trim() === ""}>
          <Icon name="plus" className="text-sm" />
          {t("addFolder")}
        </Button>
      </form>
    </div>
  );
}
