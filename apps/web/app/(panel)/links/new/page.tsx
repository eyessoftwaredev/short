import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { asc, eq, folders, getDb } from "@short/db";
import { PanelShell } from "@/components/shell/panel-shell";
import { Hero } from "@/components/ui";
import { clearDraftDestination, readDraftDestination } from "@/lib/draft-link";
import { emptyLinkForm } from "@/lib/link-form";
import { listWorkspaceDomains } from "@/lib/links";
import { requireWorkspace } from "@/lib/session";
import { LinkForm } from "../link-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("panel");
  return { title: t("newLinkTitle") };
}

export default async function NewLinkPage() {
  const [context, t, tc, draft] = await Promise.all([
    requireWorkspace(),
    getTranslations("panel"),
    getTranslations("common"),
    readDraftDestination(),
  ]);
  if (draft) {
    await clearDraftDestination();
  }

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
  const defaults = emptyLinkForm(defaultDomain?.id ?? "");
  if (draft) {
    defaults.destination = draft;
  }

  return (
    <PanelShell
      title={tc("newLink")}
      crumbs={[{ label: context.workspace.name }, { label: t("link"), href: "/links" }]}
    >
      <Hero
        variant="compact"
        eyebrow={t("newLinkEyebrow")}
        title={t("newLinkTitle")}
        description={t("newLinkDesc")}
      />
      <LinkForm
        mode="create"
        domains={domains}
        folders={folderRows}
        defaultValues={defaults}
        canTarget={context.plan.features.targeting}
        canAbTest={context.plan.features.abTesting}
        canProtect={context.plan.features.passwordProtection}
        canCloak={context.plan.features.cloaking}
      />
    </PanelShell>
  );
}
