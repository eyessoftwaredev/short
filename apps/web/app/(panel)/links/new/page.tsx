import type { Metadata } from "next";
import { asc, eq, folders, getDb } from "@short/db";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { emptyLinkForm } from "@/lib/link-form";
import { listWorkspaceDomains } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import { LinkForm } from "../link-form";

export const metadata: Metadata = { title: "New link" };

export default async function NewLinkPage() {
  const context = await requireWorkspace();

  const [domainRows, folderRows] = await Promise.all([
    listWorkspaceDomains(context.workspace.id),
    getDb()
      .select({ id: folders.id, name: folders.name })
      .from(folders)
      .where(eq(folders.workspaceId, context.workspace.id))
      .orderBy(asc(folders.name)),
  ]);

  const domains = domainRows.map((domain) => ({ id: domain.id, hostname: domain.hostname }));
  const defaultDomain = domainRows.find((domain) => domain.isDefault) ?? domainRows[0];

  return (
    <PanelShell
      title="New link"
      crumbs={[{ label: context.workspace.name }, { label: "Links", href: "/links" }]}
    >
      <Hero
        variant="compact"
        eyebrow="Create"
        title="New short link"
        description="Pick a destination, choose a domain and optionally route visitors by geography or device."
      />
      <LinkForm
        mode="create"
        domains={domains}
        folders={folderRows}
        defaultValues={emptyLinkForm(defaultDomain?.id ?? "")}
        canTarget={context.plan.features.targeting}
        canAbTest={context.plan.features.abTesting}
        canProtect={context.plan.features.passwordProtection}
        canCloak={context.plan.features.cloaking}
      />
    </PanelShell>
  );
}
