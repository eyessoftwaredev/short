"use client";

import { Icon } from "@/components/kit/icon";
import { Button, Chip, Input } from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
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
  const [error, setError] = useState<string | null>(null);
  const actionMessage = useActionMessage();
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
                  setError(null);
                  startTransition(async () => {
                    const result = await renameFolderAction(folder.id, renameValue);
                    if (!result.ok) {
                      setError(actionMessage(result.error));
                      return;
                    }
                    setRenamingId(null);
                    router.refresh();
                  });
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
                      setRenamingId(null);
                      setError(null);
                    }
                  }}
                  className="w-40"
                />
                <Button type="submit" size="sm" disabled={pending || renameValue.trim() === ""}>
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
                    setError(null);
                    startTransition(async () => {
                      const result = await deleteFolderAction(folder.id);
                      if (!result.ok) {
                        setError(actionMessage(result.error));
                        return;
                      }
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
          setError(null);
          startTransition(async () => {
            const result = await createFolderAction(name);
            if (!result.ok) {
              setError(actionMessage(result.error));
              return;
            }
            setName("");
            router.refresh();
          });
        }}
      >
        <Input
          value={name}
          aria-label={t("newFolderPlaceholder")}
          maxLength={80}
          placeholder={t("newFolderPlaceholder")}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" size="sm" disabled={pending || name.trim() === ""}>
          <Icon name="plus" className="text-sm" />
          {t("addFolder")}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
