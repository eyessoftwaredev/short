import type { Metadata } from "next";
import { KeyRound, ShieldCheck, Unlock } from "lucide-react";
import { AuthShell, type AuthHighlight } from "../_auth/auth-shell";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "New password" };

const HIGHLIGHTS: readonly AuthHighlight[] = [
  {
    id: "once",
    icon: <KeyRound className="size-4" />,
    title: "This link is single-use",
    body: "After you set a new password the token stops working, even if someone else opens it.",
  },
  {
    id: "safe",
    icon: <ShieldCheck className="size-4" />,
    title: "Redirects keep running",
    body: "Changing a password never pauses short links, QR codes or bio pages.",
  },
  {
    id: "sign-in",
    icon: <Unlock className="size-4" />,
    title: "Then sign in as usual",
    body: "You will land on the sign-in screen with the new password.",
  },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const token = typeof raw.token === "string" ? raw.token : "";

  return (
    <AuthShell
      railTitle="Almost back in."
      railBody="Choose a new password. The reset link in your inbox is what proves it is you."
      highlights={HIGHLIGHTS}
      crossLink={{ prompt: "Remembered it?", label: "Back to sign in", href: "/login" }}
    >
      <ResetForm token={token} />
    </AuthShell>
  );
}
