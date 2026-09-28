"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";
import {
  Button,
  Callout,
  ConfirmDialog,
  CopyButton,
  Field,
  InfoTip,
  Input,
  Modal,
  Switch,
  toast,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import type { ActionOutcome, ConfirmRequest, RequestConfirm, RunAction } from "./settings-types";

/**
 * One way to run a settings action everywhere: failures become an error toast with the
 * mapped message, successes an optional success toast and a server refresh.
 */
export function useSettingsAction(): { pending: boolean; run: RunAction } {
  const router = useRouter();
  const t = useTranslations("settings");
  const actionMessage = useActionMessage();
  const [pending, setPending] = useState(false);

  const run = useCallback<RunAction>(
    async (action, message) => {
      setPending(true);
      try {
        const result: ActionOutcome = await action();
        if (!result.ok) {
          toast.error(result.fieldErrors?.url?.length ? t("webhookUrlPrivate") : actionMessage(result.error));
          return false;
        }
        if (message) {
          toast.success(message);
        }
        router.refresh();
        return true;
      } catch (error) {
        console.error("settings action failed", error);
        toast.error(actionMessage("generic"));
        return false;
      } finally {
        setPending(false);
      }
    },
    [actionMessage, router, t],
  );

  return { pending, run };
}

/** Confirmation state + the dialog that renders it. Drop `dialog` anywhere in the tree. */
export function useSettingsConfirm(): { requestConfirm: RequestConfirm; dialog: ReactNode } {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const requestConfirm = useCallback<RequestConfirm>((next) => setRequest(next), []);
  return {
    requestConfirm,
    dialog: <SettingsConfirm request={request} onClose={() => setRequest(null)} />,
  };
}

function SettingsConfirm({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
  const t = useTranslations("settings");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const needsPassword = Boolean(request?.requirePassword);

  function close(): void {
    if (busy) {
      return;
    }
    setPassword("");
    onClose();
  }

  async function confirm(): Promise<void> {
    if (!request) {
      return;
    }
    setBusy(true);
    try {
      const result = await request.onConfirm(needsPassword ? password : undefined);
      if (result !== false) {
        setPassword("");
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open={request !== null}
      title={request?.title ?? ""}
      description={request?.description}
      confirmLabel={request?.confirmLabel ?? t("confirm")}
      loading={busy}
      confirmDisabled={needsPassword && password.trim() === ""}
      onConfirm={() => void confirm()}
      onClose={close}
    >
      {request?.consequences?.length || needsPassword ? (
        <div className="flex min-w-0 flex-col gap-4">
          {request?.consequences?.length ? (
            <ul className="m-0 flex min-w-0 list-disc flex-col gap-1.5 pl-5 text-sm text-fg-muted">
              {request.consequences.map((line) => (
                <li key={line} className="min-w-0">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
          {needsPassword ? (
            <Field label={t("deleteAccountPassword")} info={t("deleteAccountPasswordInfo")}>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && password.trim() !== "") {
                    event.preventDefault();
                    void confirm();
                  }
                }}
              />
            </Field>
          ) : null}
        </div>
      ) : null}
    </ConfirmDialog>
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
      icon="key"
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
        <Callout tone="warn">{t("secretStoreHint")}</Callout>

        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[13px] font-medium text-fg-subtle">{kindLabel}</span>
          <code className="block min-w-0 rounded-default border border-border-strong bg-surface-subtle px-3.5 py-3 font-mono text-sm break-all text-ink select-all">
            {secret}
          </code>
        </div>

        <p className="m-0 text-sm text-fg-muted">{usage}</p>

        <div className="flex min-w-0 items-center gap-3 rounded-default border border-border bg-surface-subtle px-3.5 py-3">
          <Switch checked={acknowledged} onCheckedChange={setAcknowledged} aria-label={t("secretAck")} />
          <span className="min-w-0 flex-1 text-sm">{t("secretAck")}</span>
          <InfoTip label={t("secretAck")}>{t("secretAckInfo")}</InfoTip>
        </div>
      </div>
    </Modal>
  );
}
