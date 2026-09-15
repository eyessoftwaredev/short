import type { Metadata } from "next";
import { BarChart3, Globe, Target } from "lucide-react";
import { AuthShell, type AuthHighlight } from "../_auth/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS: readonly AuthHighlight[] = [
  {
    id: "targeting",
    icon: <Target className="size-4" />,
    title: "Targeting that actually routes",
    body: "Send each visitor somewhere different by country, device or language.",
  },
  {
    id: "analytics",
    icon: <BarChart3 className="size-4" />,
    title: "Clicks you can explain",
    body: "Referrers, geography and devices, broken down per link.",
  },
  {
    id: "domains",
    icon: <Globe className="size-4" />,
    title: "Your domain, your brand",
    body: "Connect a custom domain and issue certificates automatically.",
  },
];

export default function LoginPage() {
  return (
    <AuthShell
      railTitle="Welcome back."
      railBody="Your links, QR codes and bio pages are where you left them."
      highlights={HIGHLIGHTS}
      crossLink={{ prompt: "No account yet?", label: "Create one", href: "/register" }}
    >
      <LoginForm />
    </AuthShell>
  );
}
