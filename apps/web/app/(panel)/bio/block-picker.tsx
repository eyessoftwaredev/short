"use client";

import type { BioBlockType } from "@short/core";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/kit/icon";
import { Modal } from "@/components/ui";
import { cn } from "@/lib/cx";
import { BLOCK_ICONS, BLOCK_ORDER } from "./block-meta";

type BlockGridProps = {
  onPick: (type: BioBlockType) => void;
  canForms: boolean;
  className?: string;
};

/** Tiles with an icon, a name and one line on what the block is for. */
export function BlockGrid({ onPick, canForms, className }: BlockGridProps) {
  const t = useTranslations("bio");
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {BLOCK_ORDER.map((type) => {
        const locked = type === "form" && !canForms;
        return (
          <button
            key={type}
            type="button"
            disabled={locked}
            onClick={() => onPick(type)}
            className="group flex min-w-0 items-start gap-3 rounded-md border border-border bg-bg p-3 text-left transition-[border-color,background-color,box-shadow] duration-150 hover:border-accent-border hover:bg-accent-tint disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-bg"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-default bg-surface text-fg-muted transition-colors duration-150 group-hover:bg-accent-surface group-hover:text-accent-on-surface"
              aria-hidden="true"
            >
              <Icon name={BLOCK_ICONS[type]} className="text-sm" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                {t(`block.${type}`)}
                {locked ? (
                  <span className="rounded-xs bg-surface px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">
                    {t("editor.paidPlans")}
                  </span>
                ) : null}
              </span>
              <span className="text-[13px] leading-5 text-fg-muted">{t(`blockDesc.${type}`)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

type BlockPickerProps = {
  open: boolean;
  onClose: () => void;
  onPick: (type: BioBlockType) => void;
  canForms: boolean;
};

export function BlockPicker({ open, onClose, onPick, canForms }: BlockPickerProps) {
  const t = useTranslations("bio");
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon="plus"
      title={t("editor.addBlockTitle")}
      description={t("editor.addBlockDesc")}
    >
      <BlockGrid
        canForms={canForms}
        onPick={(type) => {
          onPick(type);
          onClose();
        }}
      />
    </Modal>
  );
}
