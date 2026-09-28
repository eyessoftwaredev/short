import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PanelShell } from "@/components/shell/panel-shell";
import { PageHeader } from "@/components/ui";
import { readDraftDestination } from "@/lib/draft-link";
import { listFolders } from "@/lib/folders";
import { emptyLinkForm } from "@/lib/link-form";
import { listWorkspaceDomains } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import { getLinkFormDefaultsAction } from "../../settings/defaults-actions";
import { LinkForm } from "../link-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel");
  return { title: t("newLinkTitle") };
}

export default async function NewLinkPage() {
  const [context, t, tn, draft] = await Promise.all([
    requireWorkspace(),
    getTranslations("links"),
    getTranslations("nav"),
    readDraftDestination(),
  ]);

  const [domainRows, folderRows, workspaceDefaults] = await Promise.all([
    listWorkspaceDomains(context.workspace.id),
    listFolders(context.workspace.id),
    // Open mode, noindex, query forwarding, folder and UTM template from Settings.
    getLinkFormDefaultsAction(),
  ]);

  const domains = domainRows.map((domain) => ({ id: domain.id, hostname: domain.hostname }));
  const defaultDomain = domainRows.find((domain) => domain.isDefault) ?? domainRows[0];
  const folders = folderRows.map((folder) => ({ id: folder.id, name: folder.name }));
  const defaults = {
    ...emptyLinkForm(defaultDomain?.id ?? ""),
    ...(workspaceDefaults.ok ? workspaceDefaults.data : {}),
  };
  // A default folder that was deleted since must not preselect a missing option.
  if (defaults.folderId && !folders.some((folder) => folder.id === defaults.folderId)) {
    defaults.folderId = "";
  }
  if (draft) {
    defaults.destination = draft;
  }

  return (
    <PanelShell title={t("form.newTitle")} crumbs={[{ label: context.workspace.name }, { label: tn("links"), href: "/links" }]}>
      <PageHeader
        back={{ href: "/links", label: tn("links") }}
        title={t("form.newTitle")}
        description={t("form.newDesc")}
      />
      <LinkForm
        mode="create"
        domains={domains}
        folders={folders}
        defaultValues={defaults}
        canTarget={context.plan.features.targeting}
        canAbTest={context.plan.features.abTesting}
        canProtect={context.plan.features.passwordProtection}
        canCloak={context.plan.features.cloaking}
        canShortSlug={context.plan.features.shortSlugs}
      />
    </PanelShell>
  );
}
