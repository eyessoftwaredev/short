import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, PageHeader } from "@/components/ui";
import { listFolders } from "@/lib/folders";
import { toLinkFormValues } from "@/lib/link-form";
import { getLink, listWorkspaceDomains, shortUrl } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import { LinkQrCard } from "../../qr/link-qr-card";
import { HealthCallout } from "../health-callout";
import { LinkForm } from "../link-form";
import { linkStatusOf } from "../link-state";
import { BrokenBadge, LinkStatusBadge } from "../link-status";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("links");
  return { title: t("editTitle") };
}

export default async function EditLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context, t, tn] = await Promise.all([
    params,
    requireWorkspace(),
    getTranslations("links"),
    getTranslations("nav"),
  ]);

  const link = await getLink(context.workspace.id, id);
  if (!link) {
    notFound();
  }

  const [domainRows, folderRows] = await Promise.all([
    listWorkspaceDomains(context.workspace.id),
    listFolders(context.workspace.id),
  ]);

  const url = shortUrl(link.hostname, link.slug);
  const status = linkStatusOf(
    {
      archived: link.archived,
      disabled: link.disabledAt != null,
      limitReached: link.clickLimitReachedAt != null,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      startsAt: link.startsAt?.toISOString() ?? null,
    },
    Date.now(),
  );

  return (
    <PanelShell
      title={`/${link.slug}`}
      crumbs={[{ label: context.workspace.name }, { label: tn("links"), href: "/links" }]}
    >
      <PageHeader
        back={{ href: "/links", label: tn("links") }}
        title={link.title || `${link.hostname}/${link.slug}`}
        meta={
          <>
            <LinkStatusBadge status={status} />
            {link.healthStatus === "broken" ? <BrokenBadge statusCode={link.healthStatusCode} /> : null}
          </>
        }
        description={<span className="font-mono text-[13px]">{url.replace(/^https:\/\//, "")}</span>}
        actions={
          <Button leadingIcon="chart-line" href={`/links/${link.id}/stats`}>
            {t("detail.viewStats")}
          </Button>
        }
      />

      {link.healthStatus === "broken" ? (
        <HealthCallout
          linkId={link.id}
          statusCode={link.healthStatusCode}
          brokenSince={link.brokenSince?.toISOString() ?? null}
        />
      ) : null}

      <LinkForm
        mode="edit"
        linkId={link.id}
        domains={domainRows.map((domain) => ({ id: domain.id, hostname: domain.hostname }))}
        folders={folderRows.map((folder) => ({ id: folder.id, name: folder.name }))}
        // The shared mapper keeps every field (click limit included) in the editor.
        defaultValues={toLinkFormValues(link)}
        hasPassword={link.passwordHash != null}
        canTarget={context.plan.features.targeting}
        canAbTest={context.plan.features.abTesting}
        canProtect={context.plan.features.passwordProtection}
        canCloak={context.plan.features.cloaking}
        canShortSlug={context.plan.features.shortSlugs}
        canDelete={context.role !== "member" || context.isSuperadmin}
        aside={<LinkQrCard workspaceId={context.workspace.id} linkId={link.id} />}
      />
    </PanelShell>
  );
}
