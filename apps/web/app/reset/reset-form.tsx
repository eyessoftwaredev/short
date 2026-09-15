"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AuthAlert, AuthHeading } from "../_auth/auth-shell";
import { PasswordField } from "../_auth/password-field";

const MIN_PASSWORD_LENGTH = 10;

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (token === "") {
      setError("This reset link is missing its token. Request a new one from the sign-in page.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        setError(result.error.message ?? "Could not reset the password");
        return;
      }
      router.push("/login");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <AuthHeading
        title="Choose a new password"
        description="Pick something at least 10 characters long. You will sign in with it next."
      />

      {error ? (
        <AuthAlert tone="danger" title="Could not update the password">
          {error}
        </AuthAlert>
      ) : null}

      {token === "" ? (
        <AuthAlert tone="info">
          Open the link from your inbox, or{" "}
          <Link href="/forgot" className="font-medium">
            request a new reset email
          </Link>
          .
        </AuthAlert>
      ) : null}

      <form
        className="flex min-w-0 flex-col gap-4"
        aria-busy={pending}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          requirements
          invalid={Boolean(error)}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={pending || token === ""}
        >
          {pending ? "Updating password…" : "Save new password"}
        </Button>
      </form>
    </>
  );
}
