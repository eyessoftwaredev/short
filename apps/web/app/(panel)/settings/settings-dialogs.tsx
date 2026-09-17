"use client";

import { Icon, type IconName } from "@/components/kit/icon";

import { useTranslations } from "next-intl";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Button, CopyButton, Field, Input, Modal, Switch } from "@/components/ui";
import { cn } from "@/lib/cx";
import type { ConfirmRequest } from "./settings-types";

type BannerTone = "danger" | "accent" | "info";

const BANNER_TONES: Record<BannerTone, { box: string; icon: string }> = {
  danger: { box: "border-danger bg-danger-surface", icon: "text-danger" },
  accent: { box: "border-accent bg-accent-tint", icon: "text-accent-ink" },
  info: { box: "border-border-strong bg-surface-subtle", icon: "text-fg-muted" },
};

const BANNER_ICONS: Record<BannerTone, IconName> = {
  danger: "warning",
  accent: "circle-check",
  info: "circle-info",
};

export function SettingsBanner({
  tone,
  children,
  onDismiss,
}: {
  tone: BannerTone;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const tc = useTranslations("common");
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-default border px-4 py-3",
        BANNER_TONES[tone].box,
      )}
    >
      <Icon name={BANNER_ICONS[tone]} className={cn("mt-0.5 shrink-0 text-sm", BANNER_TONES[tone].icon)} />
      <p className="m-0 min-w-0 flex-1 text-sm text-fg-muted">{children}</p>
      {onDismiss ? (
        <Button variant="ghost" size="sm" aria-label={tc("dismiss")} onClick={onDismiss}>
          {tc("dismiss")}
        </Button>
      ) : null}
    </div>
  );
}

type DangerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md" | "lg";
  icon?: boolean;
  children?: ReactNode;
};

/**
 * The Button primitive has no destructive variant, so the danger tone is applied here
 * rather than duplicated at every call site.
 */
export function DangerButton({ className, children, ...props }: DangerButtonProps) {
  return (
    <Button
      {...props}
      className={cn(
        "border-danger text-danger hover:bg-danger-surface hover:text-danger",
        className,
      )}
    >
      {children}
    </Button>
  );
}

export type SecretKind = "apiKey" | "signingSecret";

type SecretModalProps = {
  open: boolean;
  kind: SecretKind;
  secret: string;
  /** What the reader has to do with the value once they leave this dialog. */
  usage: string;
  onDismiss: () => void;
};

/**
 * Shown exactly once. Dismissal is gated behind an explicit acknowledgement so a stray
 * click on the overlay cannot lose a value that can never be read again.
 */
export function SecretModal({ open, kind, secret, usage, onDismiss }: SecretModalProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [acknowledged, setAcknowledged] = useState(false);
  const kindLabel = kind === "apiKey" ? t("secretKindApi") : t("secretKindSigning");
  const title = kind === "apiKey" ? t("secretTitleApi") : t("secretTitleSigning");
  const copyLabel = kind === "apiKey" ? t("copyApiKey") : t("copySigningSecret");

  function close(): void {
    if (!acknowledged) {
      return;
    }
    setAcknowledged(false);
    onDismiss();
  }

  return (
    <Modal
      open={open}
      title={title}
      description={t("secretDescription")}
      onClose={close}
      footer={
        <>
          <CopyButton value={secret} label={copyLabel} size="md" />
          <Button variant="primary" disabled={!acknowledged} onClick={close}>
            {tc("done")}
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 items-start gap-3 rounded-default border border-warn bg-warn-surface px-3.5 py-3">
          <Icon name="warning" className="mt-0.5 text-sm shrink-0 text-warn-ink" aria-hidden="true" />
          <p className="m-0 min-w-0 text-sm text-fg-muted">{t("secretStoreHint")}</p>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">{kindLabel}</span>
          <code className="block min-w-0 rounded-default border border-border-strong bg-surface-subtle px-3.5 py-3 font-mono text-sm break-all text-ink select-all">
            {secret}
          </code>
        </div>

        <p className="m-0 text-sm text-fg-muted">{usage}</p>

        <label className="flex min-w-0 cursor-pointer items-center gap-3 rounded-default border border-border bg-surface-subtle px-3.5 py-3">
          <Switch
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
            aria-label={t("secretAck")}
          />
          <span className="min-w-0 text-sm">{t("secretAck")}</span>
        </label>
      </div>
    </Modal>
  );
}

type ConfirmDialogProps = {
  request: ConfirmRequest | null;
  pending: boolean;
  onCancel: () => void;
};

export function ConfirmDialog({ request, pending, onCancel }: ConfirmDialogProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [password, setPassword] = useState("");
  const needsPassword = Boolean(request?.requirePassword);
  const canConfirm = !needsPassword || password.trim() !== "";

  return (
    <Modal
      open={request !== null}
      title={request?.title ?? ""}
      description={request?.description}
      onClose={() => {
        setPassword("");
        onCancel();
      }}
      footer={
        <>
          <Button
            disabled={pending}
            onClick={() => {
              setPassword("");
              onCancel();
            }}
          >
            {tc("cancel")}
          </Button>
          <DangerButton
            disabled={pending || !canConfirm}
            onClick={() => {
              request?.onConfirm(needsPassword ? password : undefined);
              setPassword("");
            }}
          >
            {pending ? tc("working") : (request?.confirmLabel ?? t("confirm"))}
          </DangerButton>
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-4">
        {request?.consequences && request.consequences.length > 0 ? (
          <div className="flex min-w-0 items-start gap-3 rounded-default border border-danger bg-danger-surface px-3.5 py-3">
            <Icon name="warning" className="mt-0.5 text-sm shrink-0 text-danger" aria-hidden="true" />
            <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 p-0 text-sm text-fg-muted">
              {request.consequences.map((line) => (
                <li key={line} className="min-w-0">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {needsPassword ? (
          <Field label={t("deleteAccountPassword")}>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
        ) : null}
      </div>
    </Modal>
  );
}
