import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3, Globe, Link2 } from "lucide-react";
import { brandName } from "@/lib/nav";
import { requireSession } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Create your workspace" };

const NEXT_STEPS = [
  {
    id: "links",
    icon: Link2,
    title: "Shorten your first link",
    body: "Pick a slug, set a destination, and add targeting rules when you need them.",
  },
  {
    id: "domains",
    icon: Globe,
    title: "Connect a domain",
    body: "Point a CNAME at us and your links go out on your own brand.",
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Watch the clicks land",
    body: "Referrers, countries and devices show up as soon as someone clicks.",
  },
] as const;

export default async function OnboardingPage() {
  const context = await requireSession();

  if (context.workspace) {
    redirect("/dashboard");
  }

  const suggestion = context.user.name.trim() || (context.user.email.split("@")[0] ?? "");

  return (
    <div className="flex min-h-screen flex-col bg-surface-subtle">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-bg px-6 py-4">
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-default bg-inverse font-mono text-sm font-semibold text-on-inverse"
            aria-hidden="true"
          >
            S
          </span>
          <span className="truncate text-base font-semibold tracking-tight">{brandName}</span>
        </span>
        <span className="min-w-0 truncate text-sm text-fg-muted">
          Signed in as <span className="text-ink">{context.user.email}</span>
        </span>
      </header>

      <main className="flex min-w-0 flex-1 justify-center px-6 py-12">
        <div className="flex w-full max-w-xl min-w-0 flex-col gap-8">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="font-mono text-xs tracking-widest text-fg-subtle uppercase">
              One last step
            </span>
            <h1 className="m-0 text-3xl leading-tight font-semibold tracking-tight">
              Name your workspace
            </h1>
            <p className="m-0 max-w-prose text-base leading-relaxed text-fg-muted">
              A workspace holds your links, domains, QR codes and analytics. Most people start with
              one and add more later.
            </p>
          </div>

          <OnboardingForm suggestion={suggestion} />

          <section className="flex min-w-0 flex-col gap-4">
            <h2 className="m-0 font-mono text-xs tracking-widest text-fg-subtle uppercase">
              What happens next
            </h2>
            <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
              {NEXT_STEPS.map((step) => (
                <li key={step.id} className="flex min-w-0 items-start gap-3.5">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-default border border-border bg-bg text-fg-muted"
                    aria-hidden="true"
                  >
                    <step.icon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium">{step.title}</span>
                    <span className="text-sm leading-relaxed text-fg-muted">{step.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
