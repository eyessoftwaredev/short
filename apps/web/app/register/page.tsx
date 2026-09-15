import type { Metadata } from "next";
import { Contact, Sparkles, Target } from "lucide-react";
import { AuthShell, type AuthHighlight } from "../_auth/auth-shell";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

const HIGHLIGHTS: readonly AuthHighlight[] = [
  {
    id: "free",
    icon: <Sparkles className="size-4" />,
    title: "Start on the free plan",
    body: "No card needed. Upgrade later only if you outgrow the limits.",
  },
  {
    id: "targeting",
    icon: <Target className="size-4" />,
    title: "One link, many destinations",
    body: "Route by country, device or language from the same short link.",
  },
  {
    id: "surfaces",
    icon: <Contact className="size-4" />,
    title: "QR codes and bio pages included",
    body: "Everything you hand out offline or link from a profile, in one place.",
  },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const invite = typeof raw.invite === "string" ? raw.invite : "";
  const loginHref =
    invite === "" ? "/login" : `/login?next=${encodeURIComponent(`/invite/${invite}`)}`;

  return (
    <AuthShell
      railTitle="Short links that know where to send people."
      railBody="Create a workspace in under a minute and start measuring what your links actually do."
      highlights={HIGHLIGHTS}
      crossLink={{ prompt: "Already have an account?", label: "Sign in", href: loginHref }}
    >
      <RegisterForm inviteId={invite} />
    </AuthShell>
  );
}
