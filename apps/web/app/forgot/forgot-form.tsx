"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AuthAlert, AuthHeading } from "../_auth/auth-shell";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPending(true);

    try {
      await authClient.requestPasswordReset({ email, redirectTo: "/reset" });
    } catch {
      // Intentionally ignored: the response must not reveal whether the address exists.
    } finally {
      setPending(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <span
          className="flex size-11 items-center justify-center rounded-default bg-accent-surface text-accent-ink"
          aria-hidden="true"
        >
          <MailCheck className="size-5" />
        </span>

        <AuthHeading
          title="Check your inbox"
          description="If that address has an account, a reset link is already on its way."
        />

        <div className="flex min-w-0 flex-col gap-1.5 rounded-default border border-border bg-surface-subtle px-4 py-3.5">
          <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
            Requested for
          </span>
          <span className="min-w-0 font-mono text-sm break-all text-ink">{email}</span>
        </div>

        <AuthAlert tone="info">
          We deliberately show this message for every address, so nobody can use the form to
          discover who has an account.
        </AuthAlert>

        <div className="flex flex-wrap gap-2.5">
          <Button
            onClick={() => {
              setSent(false);
            }}
          >
            Try another address
          </Button>
          <Button variant="ghost" href="/login">
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthHeading
        title="Reset your password"
        description="We will email you a link to choose a new one."
      />

      <form
        className="flex min-w-0 flex-col gap-4"
        aria-busy={pending}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <Field
          label="Email"
          hint="Use the address you signed up with — we cannot confirm which one that is."
        >
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@acme.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="m-0 text-sm text-fg-muted">
        Signed in on another device? You can change your password from{" "}
        <span className="text-ink">Settings → Security</span> without using this form.
      </p>
    </>
  );
}
