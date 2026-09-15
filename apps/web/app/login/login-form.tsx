"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AuthAlert, AuthDivider, AuthHeading } from "../_auth/auth-shell";
import { PasswordField } from "../_auth/password-field";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const returnedFrom = next !== "/dashboard" ? next : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  const busy = pending || googlePending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = await authClient.signIn.email({ email, password, callbackURL: next });
      if (result.error) {
        setError(result.error.message ?? "Could not sign in");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  };

  const handleGoogle = async (): Promise<void> => {
    setError(null);
    setGooglePending(true);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: next });
    } catch {
      setError("Google sign-in is unavailable right now.");
      setGooglePending(false);
    }
  };

  return (
    <>
      <AuthHeading title="Sign in" description="Continue to your Short workspace." />

      {returnedFrom ? (
        <AuthAlert tone="info">
          Sign in to continue to{" "}
          <span className="font-mono text-ink break-all">{returnedFrom}</span>.
        </AuthAlert>
      ) : null}

      {error ? (
        <AuthAlert tone="danger" title="Could not sign you in">
          {error}
        </AuthAlert>
      ) : null}

      <form
        className="flex min-w-0 flex-col gap-4"
        noValidate={false}
        aria-busy={pending}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <Field label="Email">
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@acme.com"
            aria-invalid={error ? true : undefined}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <div className="flex min-w-0 flex-col gap-1.5">
          <PasswordField
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={Boolean(error)}
          />
          <Link href="/forgot" className="self-end text-xs font-medium">
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <AuthDivider label="or" />

      <Button
        size="lg"
        className="w-full"
        disabled={busy}
        onClick={() => {
          void handleGoogle();
        }}
      >
        {googlePending ? "Redirecting to Google…" : "Continue with Google"}
      </Button>
    </>
  );
}
