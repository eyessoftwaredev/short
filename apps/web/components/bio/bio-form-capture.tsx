"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input } from "@/components/ui";

type BioFormCaptureProps = {
  biopageId: string;
  blockId: string;
  mode: "email" | "whatsapp";
  title: string;
  buttonLabel: string;
  whatsappNumber: string | null;
  successMessage: string;
  endpoint: string;
  interactive: boolean;
};

export function BioFormCapture({
  biopageId,
  blockId,
  mode,
  title,
  buttonLabel,
  whatsappNumber,
  successMessage,
  endpoint,
  interactive,
}: BioFormCaptureProps) {
  const t = useTranslations("bio");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  if (mode === "whatsapp") {
    const number = (whatsappNumber ?? "").replace(/[^\d]/g, "");
    const href = number
      ? `https://wa.me/${number}${message.trim() ? `?text=${encodeURIComponent(message.trim())}` : ""}`
      : "#";

    return (
      <form
        className="flex w-full flex-col gap-3 rounded-default border border-bio-border bg-bio-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (interactive && number) {
            window.open(href, "_blank", "noopener,noreferrer");
          }
        }}
      >
        {title ? <p className="m-0 text-sm font-medium">{title}</p> : null}
        <Field label={t("formMessage")}>
          <Input
            value={message}
            maxLength={300}
            disabled={!interactive}
            onChange={(event) => setMessage(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" disabled={!interactive || number === ""}>
          {buttonLabel}
        </Button>
      </form>
    );
  }

  return (
    <form
      className="flex w-full flex-col gap-3 rounded-default border border-bio-border bg-bio-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!interactive || status === "saving") {
          return;
        }
        setStatus("saving");
        void fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ biopageId, blockId, email }),
        })
          .then(async (response) => {
            setStatus(response.ok ? "done" : "error");
          })
          .catch(() => setStatus("error"));
      }}
    >
      {title ? <p className="m-0 text-sm font-medium">{title}</p> : null}
      <Field label={t("formEmail")}>
        <Input
          type="email"
          required
          value={email}
          disabled={!interactive || status === "done"}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Button type="submit" variant="primary" disabled={!interactive || status === "saving" || status === "done"}>
        {status === "done" ? successMessage || t("formThanks") : buttonLabel}
      </Button>
      {status === "error" ? <p className="m-0 text-sm text-danger">{t("formError")}</p> : null}
    </form>
  );
}
