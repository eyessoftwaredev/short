import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PanelShell } from "@/components/shell/panel-shell";
import { StatusBadge } from "@/components/shell/status-badge";
import { Hero } from "@/components/ui";
import type { BioFormValues } from "@/lib/bio-form";
import { bioUrl, getBiopage } from "@/lib/biopages";
import { serverEnv } from "@/lib/env";
import { listWorkspaceDomains } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import { BioBuilder } from "../../bio-builder";

export const metadata: Metadata = { title: "Edit bio page" };

type Params = Promise<{ id: string }>;

export default async function EditBioPage({ params }: { params: Params }) {
  const context = await requireWorkspace();
  const { id } = await params;

  const [page, domains] = await Promise.all([
    getBiopage(context.workspace.id, id),
    listWorkspaceDomains(context.workspace.id),
  ]);

  if (!page) {
    notFound();
  }

  const defaults: BioFormValues = {
    handle: page.handle,
    domainId: page.domainId ?? "",
    displayName: page.displayName,
    bio: page.bio,
    avatarUrl: page.avatarUrl ?? "",
    theme: page.theme,
    buttonStyle: page.buttonStyle as BioFormValues["buttonStyle"],
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    published: page.published,
    blocks: page.blocks,
  };

  return (
    <PanelShell
      title={page.displayName}
      crumbs={[{ label: context.workspace.name }, { label: "Bio pages", href: "/bio" }]}
      topbarActions={<StatusBadge status={page.published ? "published" : "draft"} />}
    >
      <Hero
        variant="compact"
        eyebrow="Bio builder"
        title={page.displayName}
        description={bioUrl(page.hostname, page.handle)}
      />
      <BioBuilder
        mode="edit"
        biopageId={page.id}
        defaultValues={defaults}
        domains={domains
          .filter((domain) => !domain.isPlatform)
          .map((domain) => ({ id: domain.id, hostname: domain.hostname }))}
        platformHostname={serverEnv().PLATFORM_SHORT_DOMAIN}
      />
    </PanelShell>
  );
}
