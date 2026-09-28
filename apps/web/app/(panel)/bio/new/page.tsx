import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { isWithinLimit } from "@short/core";
import { PanelShell } from "@/components/shell/panel-shell";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { listWorkspaceDomains } from "@/lib/links";
import { platformHostname } from "@/lib/biopages";
import { getWorkspaceUsage } from "@/lib/quota";
import { requireWorkspace } from "@/lib/session";
import { suggestHandle } from "../handle";
import { NewBioFlow } from "./new-bio-flow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bio");
  return { title: t("newTitle") };
}

export default async function NewBioPage() {
  const [context, t, tc] = await Promise.all([
    requireWorkspace(),
    getTranslations("bio"),
    getTranslations("common"),
  ]);
  const [domains, usage] = await Promise.all([
    listWorkspaceDomains(context.workspace.id),
    getWorkspaceUsage(context.workspace.id),
  ]);

  const limit = context.plan.limits.biopages;
  const atLimit = !isWithinLimit(limit, usage.biopages);
  const crumbs = [{ label: context.workspace.name }, { label: t("title"), href: "/bio" }];

  if (atLimit) {
    return (
      <PanelShell title={t("newTitle")} crumbs={crumbs}>
        <PageHeader back={{ href: "/bio", label: t("title") }} title={t("create.title")} />
        <EmptyState
          icon="rocket"
          title={t("create.limitTitle", { limit: formatNumber(limit), plan: context.plan.name })}
          description={t("create.limitBody")}
          actions={
            <>
              <Button href="/bio">{t("create.limitBack")}</Button>
              <Button variant="primary" leadingIcon="rocket" href="/billing">
                {tc("seePlans")}
              </Button>
            </>
          }
        />
      </PanelShell>
    );
  }

  // A personal workspace is usually named after its owner, which is also the best
  // starting point for a handle; "Personal" on its own is not.
  const defaultName =
    context.workspace.kind === "personal" && context.user.name.trim() !== ""
      ? context.user.name.trim()
      : context.workspace.name;
  const suggested =
    (await suggestHandle(defaultName, {
      domainId: null,
      plan: context.plan,
      isSuperadmin: context.isSuperadmin,
    })) ?? "";

  return (
    <PanelShell title={t("newTitle")} crumbs={crumbs}>
      <PageHeader
        back={{ href: "/bio", label: t("title") }}
        title={t("create.title")}
        description={t("create.description")}
      />
      <NewBioFlow
        defaultName={defaultName}
        suggestedHandle={suggested}
        platformHostname={platformHostname()}
        domains={domains
          .filter((domain) => !domain.isPlatform)
          .map((domain) => ({
            id: domain.id,
            hostname: domain.hostname,
            ready: domain.status === "active",
          }))}
      />
    </PanelShell>
  );
}
