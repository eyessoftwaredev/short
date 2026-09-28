"use client";

import { useActionMessage } from "@/lib/action-message";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Callout, Field, Input, Modal, toast } from "@/components/ui";
import { applyDestinationRewriteAction, previewDestinationRewriteAction } from "./actions";
import type { DestinationRewritePreview } from "@/lib/bulk-destinations";

type RewriteDestinationsDialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Replaces one destination hostname on every matching link: preview first (how many and
 * which links), then apply. Opened from the links list's "More" menu.
 */
export function RewriteDestinationsDialog({ open, onClose }: RewriteDestinationsDialogProps) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<DestinationRewritePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset(): void {
    setFrom("");
    setTo("");
    setPreview(null);
    setError(null);
  }

  function close(): void {
    if (pending) {
      return;
    }
    reset();
    onClose();
  }

  function runPreview(): void {
    setError(null);
    startTransition(async () => {
      const result = await previewDestinationRewriteAction(from, to);
      if (!result.ok) {
        setPreview(null);
        setError(actionMessage(result.error));
        return;
      }
      setPreview(result.data);
    });
  }

  function runApply(): void {
    if (!preview) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await applyDestinationRewriteAction(from, to);
      if (!result.ok) {
        setError(actionMessage(result.error));
        return;
      }
      toast.success(t("rewriteResult", { links: result.data.links, domains: result.data.domains }));
      reset();
      onClose();
      router.refresh();
    });
  }

  const matchCount = preview ? preview.links + preview.domains : 0;
  const canPreview = from.trim() !== "" && to.trim() !== "";

  return (
    <Modal
      open={open}
      icon="globe"
      size="lg"
      title={t("rewriteTitle")}
      description={t("rewriteDesc")}
      onClose={close}
      footer={
        <>
          <Button disabled={pending} onClick={close}>
            {tc("cancel")}
          </Button>
          {preview && matchCount > 0 ? (
            <Button variant="primary" loading={pending} onClick={runApply}>
              {t("rewriteApply", { count: preview.links })}
            </Button>
          ) : (
            <Button variant="primary" loading={pending} disabled={!canPreview} onClick={runPreview}>
              {t("rewritePreview")}
            </Button>
          )}
        </>
      }
    >
      <form
        className="flex min-w-0 flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canPreview && !pending && !(preview && matchCount > 0)) {
            runPreview();
          }
        }}
      >
        <Callout tone="warn" title={t("rewriteWarning")} />
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field label={t("rewriteFrom")} info={t("list.rewriteFromInfo")}>
            <Input
              value={from}
              placeholder={t("rewriteFromPlaceholder")}
              autoComplete="off"
              className="font-mono"
              disabled={pending}
              onChange={(event) => {
                setFrom(event.target.value);
                setPreview(null);
              }}
            />
          </Field>
          <Field label={t("rewriteTo")} info={t("list.rewriteToInfo")}>
            <Input
              value={to}
              placeholder={t("rewriteToPlaceholder")}
              autoComplete="off"
              className="font-mono"
              disabled={pending}
              onChange={(event) => {
                setTo(event.target.value);
                setPreview(null);
              }}
            />
          </Field>
        </div>

        {error ? <Callout tone="danger" title={error} /> : null}

        {preview && matchCount === 0 ? <Callout tone="neutral" title={t("rewriteEmpty")} /> : null}

        {preview && matchCount > 0 ? (
          <div className="flex min-w-0 flex-col gap-2">
            <p className="m-0 text-sm text-ink">
              {t("list.rewriteMatches", { links: preview.links, domains: preview.domains })}
            </p>
            <span className="text-[13px] font-medium text-fg-subtle">{t("rewriteSamples")}</span>
            <ul className="m-0 flex min-w-0 list-none flex-col gap-1 rounded-md border border-border bg-surface-subtle p-3">
              {preview.samples.map((sample) => (
                <li key={`${sample.hostname}/${sample.slug}`} className="min-w-0 truncate font-mono text-[13px] text-ink">
                  {sample.hostname}/{sample.slug}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
