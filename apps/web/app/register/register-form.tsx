"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AuthAlert, AuthDivider, AuthHeading } from "../_auth/auth-shell";
import { PasswordField } from "../_auth/password-field";

const MIN_PASSWORD_LENGTH = 10;

export function RegisterForm({ inviteId = "" }: { inviteId?: string }) {
  const loginHref =
    inviteId === "" ? "/login" : `/login?next=${encodeURIComponent(`/invite/${inviteId}`)}`;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await authClient.signUp.email({ name, email, password });
      if (result.error) {
        setError(result.error.message ?? "Could not create the account");
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
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
          description="Confirm your address to finish setting up your workspace."
        />

        <div className="flex min-w-0 flex-col gap-1.5 rounded-default border border-border bg-surface-subtle px-4 py-3.5">
          <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
            Sent to
          </span>
          <span className="min-w-0 font-mono text-sm break-all text-ink">{email}</span>
        </div>

        <ol className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm text-fg-muted">
          <li className="flex min-w-0 gap-2.5">
            <span className="shrink-0 font-mono text-xs text-fg-subtle tabular-nums">01</span>
            <span className="min-w-0">Open the verification link we just emailed you.</span>
          </li>
          <li className="flex min-w-0 gap-2.5">
            <span className="shrink-0 font-mono text-xs text-fg-subtle tabular-nums">02</span>
            <span className="min-w-0">
              {inviteId === ""
                ? "Name your workspace — that takes one field."
                : "Re-open the invite link after you confirm, then join the workspace."}
            </span>
          </li>
          <li className="flex min-w-0 gap-2.5">
            <span className="shrink-0 font-mono text-xs text-fg-subtle tabular-nums">03</span>
            <span className="min-w-0">Create your first short link.</span>
          </li>
        </ol>

        <AuthAlert tone="info">
          Nothing after a few minutes? Check spam, and make sure the address above is spelled
          correctly.
        </AuthAlert>

        <div className="flex flex-wrap gap-2.5">
          <Button
            onClick={() => {
              setSent(false);
              setError(null);
            }}
          >
            Use a different email
          </Button>
          <Button variant="ghost" href={loginHref}>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthHeading
        title="Create your workspace"
        description="Short links, QR codes and bio pages with real targeting."
      />

      {error ? (
        <AuthAlert tone="danger" title="Could not create the account">
          {error}
        </AuthAlert>
      ) : null}

      <form
        className="flex min-w-0 flex-col gap-4"
        aria-busy={pending}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <Field label="Name">
          <Input
            name="name"
            autoComplete="name"
            required
            placeholder="Ada Lovelace"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field label="Work email">
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

        <PasswordField
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          requirements
          invalid={Boolean(error)}
        />

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
          {pending ? "Creating your workspace…" : "Create account"}
        </Button>

        <p className="m-0 text-xs leading-relaxed text-fg-subtle">
          We will email you a verification link before the workspace is created.
        </p>
      </form>

      <AuthDivider label="already registered" />

      <p className="m-0 text-center text-sm text-fg-muted">
        <Link href={loginHref} className="font-medium">
          Sign in instead
        </Link>
      </p>
    </>
  );
}
