"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, TriangleAlert } from "lucide-react";
import { Button, CopyButton, Modal, Switch } from "@/components/ui";
import { cn } from "@/lib/cx";
import type { ConfirmRequest } from "./settings-types";

type BannerTone = "danger" | "accent" | "info";

const BANNER_TONES: Record<BannerTone, { box: string; icon: string }> = {
  danger: { box: "border-danger bg-danger-surface", icon: "text-danger" },
  accent: { box: "border-accent bg-accent-tint", icon: "text-accent-ink" },
  info: { box: "border-border-strong bg-surface-subtle", icon: "text-fg-muted" },
};

const BANNER_ICONS: Record<BannerTone, typeof Info> = {
  danger: AlertTriangle,
  accent: CheckCircle2,
  info: Info,
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
  const Icon = BANNER_ICONS[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-default border px-4 py-3",
        BANNER_TONES[tone].box,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", BANNER_TONES[tone].icon)} aria-hidden="true" />
      <p className="m-0 min-w-0 flex-1 text-sm text-fg-muted">{children}</p>
      {onDismiss ? (
        <Button variant="ghost" size="sm" aria-label="Dismiss message" onClick={onDismiss}>
          Dismiss
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

type SecretModalProps = {
  open: boolean;
  kind: "API key" | "Signing secret";
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
  const [acknowledged, setAcknowledged] = useState(false);

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
      title={`Copy your ${kind.toLowerCase()}`}
      description={`This is the only time the full value is shown — it is stored hashed and cannot be read again.`}
      onClose={close}
      footer={
        <>
          <CopyButton value={secret} label={`Copy ${kind.toLowerCase()}`} size="md" />
          <Button variant="primary" disabled={!acknowledged} onClick={close}>
            Done
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 items-start gap-3 rounded-default border border-warn bg-warn-surface px-3.5 py-3">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn-ink" aria-hidden="true" />
          <p className="m-0 min-w-0 text-sm text-fg-muted">
            Store it in a secret manager now. If you lose it you will have to issue a new one.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">{kind}</span>
          <code className="block min-w-0 rounded-default border border-border-strong bg-surface-subtle px-3.5 py-3 font-mono text-sm break-all text-ink select-all">
            {secret}
          </code>
        </div>

        <p className="m-0 text-sm text-fg-muted">{usage}</p>

        <label className="flex min-w-0 cursor-pointer items-center gap-3 rounded-default border border-border bg-surface-subtle px-3.5 py-3">
          <Switch
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
            aria-label="I have stored this value somewhere safe"
          />
          <span className="min-w-0 text-sm">I have stored this value somewhere safe</span>
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
  return (
    <Modal
      open={request !== null}
      title={request?.title ?? ""}
      description={request?.description}
      onClose={onCancel}
      footer={
        <>
          <Button disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <DangerButton
            disabled={pending}
            onClick={() => {
              request?.onConfirm();
            }}
          >
            {pending ? "Working…" : (request?.confirmLabel ?? "Confirm")}
          </DangerButton>
        </>
      }
    >
      {request?.consequences && request.consequences.length > 0 ? (
        <div className="flex min-w-0 items-start gap-3 rounded-default border border-danger bg-danger-surface px-3.5 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 p-0 text-sm text-fg-muted">
            {request.consequences.map((line) => (
              <li key={line} className="min-w-0">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Modal>
  );
}
