"use client";

import { Icon } from "@/components/kit/icon";
import { useActionMessage } from "@/lib/action-message";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, Input, Modal } from "@/components/ui";
import { applyDestinationRewriteAction, previewDestinationRewriteAction } from "./actions";
import type { DestinationRewritePreview } from "@/lib/bulk-destinations";

export function RewriteDestinationsButton() {
  const t = useTranslations("links");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icon name="globe" className="text-sm" />
        {t("rewriteDestinations")}
      </Button>
      <RewriteDestinationsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

type RewriteDestinationsDialogProps = {
  open: boolean;
  onClose: () => void;
};

function RewriteDestinationsDialog({ open, onClose }: RewriteDestinationsDialogProps) {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const actionMessage = useActionMessage();
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<DestinationRewritePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset(): void {
    setFrom("");
    setTo("");
    setPreview(null);
    setError(null);
    setNotice(null);
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
    setNotice(null);
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
      setNotice(t("rewriteResult", { links: result.data.links, domains: result.data.domains }));
      setPreview(null);
      router.refresh();
    });
  }

  const matchCount = preview ? preview.links + preview.domains : 0;

  return (
    <Modal
      open={open}
      title={t("rewriteTitle")}
      description={t("rewriteDesc")}
      onClose={close}
      footer={
        <>
          <Button disabled={pending} onClick={close}>
            {tc("cancel")}
          </Button>
          {preview && matchCount > 0 ? (
            <Button variant="primary" disabled={pending} onClick={runApply}>
              {pending ? tc("working") : t("rewriteApply", { count: preview.links })}
            </Button>
          ) : (
            <Button variant="primary" disabled={pending || from.trim() === "" || to.trim() === ""} onClick={runPreview}>
              {pending ? tc("working") : t("rewritePreview")}
            </Button>
          )}
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-4">
        <p className="m-0 text-sm text-fg-muted">{t("rewriteWarning")}</p>
        <Field label={t("rewriteFrom")}>
          <Input
            value={from}
            placeholder={t("rewriteFromPlaceholder")}
            autoComplete="off"
            disabled={pending}
            onChange={(event) => {
              setFrom(event.target.value);
              setPreview(null);
              setNotice(null);
            }}
          />
        </Field>
        <Field label={t("rewriteTo")}>
          <Input
            value={to}
            placeholder={t("rewriteToPlaceholder")}
            autoComplete="off"
            disabled={pending}
            onChange={(event) => {
              setTo(event.target.value);
              setPreview(null);
              setNotice(null);
            }}
          />
        </Field>

        {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
        {notice ? <p className="m-0 text-sm text-accent-ink">{notice}</p> : null}

        {preview && matchCount === 0 ? <p className="m-0 text-sm text-fg-muted">{t("rewriteEmpty")}</p> : null}

        {preview && matchCount > 0 ? (
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-sm font-medium">{t("rewriteSamples")}</span>
            <ul className="m-0 flex min-w-0 list-none flex-col gap-1 p-0">
              {preview.samples.map((sample) => (
                <li key={`${sample.hostname}/${sample.slug}`} className="min-w-0 truncate font-mono text-sm">
                  {sample.hostname}/{sample.slug}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
