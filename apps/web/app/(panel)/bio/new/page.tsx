import type { Metadata } from "next";
import { slugify } from "@short/core";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { emptyBioForm } from "@/lib/bio-form";
import { serverEnv } from "@/lib/env";
import { listWorkspaceDomains } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import { BioBuilder } from "../bio-builder";

export const metadata: Metadata = { title: "New bio page" };

export default async function NewBioPage() {
  const context = await requireWorkspace();
  const domains = await listWorkspaceDomains(context.workspace.id);

  const defaults = emptyBioForm(slugify(context.workspace.name));
  defaults.displayName = context.workspace.name;

  return (
    <PanelShell
      title="New bio page"
      crumbs={[{ label: context.workspace.name }, { label: "Bio pages", href: "/bio" }]}
    >
      <Hero
        variant="compact"
        eyebrow="Bio builder"
        title="Create a bio page"
        description="Drag blocks into order on the left and watch the phone preview update on the right."
      />
      <BioBuilder
        mode="create"
        defaultValues={defaults}
        domains={domains
          .filter((domain) => !domain.isPlatform)
          .map((domain) => ({ id: domain.id, hostname: domain.hostname }))}
        platformHostname={serverEnv().PLATFORM_SHORT_DOMAIN}
      />
    </PanelShell>
  );
}
