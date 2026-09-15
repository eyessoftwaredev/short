import type { Metadata } from "next";
import { KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { AuthShell, type AuthHighlight } from "../_auth/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset password" };

const HIGHLIGHTS: readonly AuthHighlight[] = [
  {
    id: "link",
    icon: <MailCheck className="size-4" />,
    title: "One link, sent to your inbox",
    body: "Open it and choose a new password. The link expires after a short while.",
  },
  {
    id: "safe",
    icon: <ShieldCheck className="size-4" />,
    title: "Your links keep working",
    body: "Resetting a password never interrupts redirects or analytics collection.",
  },
  {
    id: "quiet",
    icon: <KeyRound className="size-4" />,
    title: "Nothing is revealed",
    body: "We answer the same way whether or not an account exists for an address.",
  },
];

export default function ForgotPage() {
  return (
    <AuthShell
      railTitle="Locked out? This takes a minute."
      railBody="Give us the address on the account and we will send a link to set a new password."
      highlights={HIGHLIGHTS}
      crossLink={{ prompt: "Remembered it?", label: "Back to sign in", href: "/login" }}
    >
      <ForgotForm />
    </AuthShell>
  );
}
