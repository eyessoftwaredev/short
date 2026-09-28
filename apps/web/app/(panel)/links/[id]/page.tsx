import { Icon } from "@/components/kit/icon";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { asc, eq, folders, getDb } from "@short/db";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, CopyButton, Hero } from "@/components/ui";
import type { LinkFormValues } from "@/lib/link-form";
import { getLink, listWorkspaceDomains, shortUrl } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import { LinkQrCard } from "../../qr/link-qr-card";
import { LinkForm } from "../link-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("links");
  return { title: t("editTitle") };
}

export default async function EditLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context, tc, ts, tn] = await Promise.all([
    params,
    requireWorkspace(),
    getTranslations("common"),
    getTranslations("stats"),
    getTranslations("nav"),
  ]);

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
    // ISO on purpose: the form converts it to the viewer's local time in the browser.
    expiresAt: link.expiresAt?.toISOString() ?? "",
    // Same ISO convention as `expiresAt`; empty means "live immediately".
    startsAt: link.startsAt?.toISOString() ?? "",
    expiredDestination: link.expiredDestination ?? "",
    // Never round-trips the stored hash; an empty value means "keep the current password".
    password: "",
    iosDestination: link.iosDestination ?? "",
    androidDestination: link.androidDestination ?? "",
    cloaked: link.cloaked,
    noIndex: link.noIndex,
    forwardQuery: link.forwardQuery,
    openMode: link.openMode,
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
      crumbs={[{ label: context.workspace.name }, { label: tn("links"), href: "/links" }]}
    >
      <Hero
        variant="compact"
        eyebrow={link.hostname}
        title={link.title ?? `/${link.slug}`}
        description={link.destination}
        actions={
          <>
            <CopyButton value={url} label={tc("copy")} />
            <Button variant="primary" href={`/links/${link.id}/stats`}>
              <Icon name="chart-line" className="text-sm" />
              {ts("statistics")}
            </Button>
          </>
        }
      />
      <LinkQrCard workspaceId={context.workspace.id} linkId={link.id} />
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
