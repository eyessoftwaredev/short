import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { asc, eq, folders, getDb } from "@short/db";
import { BarChart3 } from "lucide-react";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, CopyButton, Hero } from "@/components/ui";
import { toDateTimeLocal, type LinkFormValues } from "@/lib/link-form";
import { getLink, listWorkspaceDomains, shortUrl } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import { LinkForm } from "../link-form";

export const metadata: Metadata = { title: "Edit link" };

export default async function EditLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireWorkspace();
  const { id } = await params;

  const link = await getLink(context.workspace.id, id);
  if (!link) {
    notFound();
  }

  const [domainRows, folderRows] = await Promise.all([
    listWorkspaceDomains(context.workspace.id),
    getDb()
      .select({ id: folders.id, name: folders.name })
      .from(folders)
      .where(eq(folders.workspaceId, context.workspace.id))
      .orderBy(asc(folders.name)),
  ]);

  const defaultValues: LinkFormValues = {
    domainId: link.domainId,
    slug: link.slug,
    destination: link.destination,
    title: link.title ?? "",
    description: link.description ?? "",
    image: link.image ?? "",
    comments: link.comments ?? "",
    folderId: link.folderId ?? "",
    tagsText: link.tags.join(", "),
    expiresAt: toDateTimeLocal(link.expiresAt),
    expiredDestination: link.expiredDestination ?? "",
    // Never round-trips the stored hash; an empty value means "keep the current password".
    password: "",
    iosDestination: link.iosDestination ?? "",
    androidDestination: link.androidDestination ?? "",
    cloaked: link.cloaked,
    noIndex: link.noIndex,
    forwardQuery: link.forwardQuery,
    archived: link.archived,
    utmSource: link.utm?.utm_source ?? "",
    utmMedium: link.utm?.utm_medium ?? "",
    utmCampaign: link.utm?.utm_campaign ?? "",
    utmTerm: link.utm?.utm_term ?? "",
    utmContent: link.utm?.utm_content ?? "",
    rules: link.rules,
    abVariants: link.abVariants,
  };

  const url = shortUrl(link.hostname, link.slug);

  return (
    <PanelShell
      title={`/${link.slug}`}
      crumbs={[{ label: context.workspace.name }, { label: "Links", href: "/links" }]}
    >
      <Hero
        variant="compact"
        eyebrow={link.hostname}
        title={link.title ?? `/${link.slug}`}
        description={link.destination}
        actions={
          <>
            <CopyButton value={url} label="Copy link" />
            <Button variant="primary" href={`/links/${link.id}/stats`}>
              <BarChart3 className="size-4" />
              Statistics
            </Button>
          </>
        }
      />
      <LinkForm
        mode="edit"
        linkId={link.id}
        domains={domainRows.map((domain) => ({ id: domain.id, hostname: domain.hostname }))}
        folders={folderRows}
        defaultValues={defaultValues}
        hasPassword={link.passwordHash != null}
        canTarget={context.plan.features.targeting}
        canAbTest={context.plan.features.abTesting}
        canProtect={context.plan.features.passwordProtection}
        canCloak={context.plan.features.cloaking}
      />
    </PanelShell>
  );
}
