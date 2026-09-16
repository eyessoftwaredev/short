import { Icon } from "@/components/kit/icon";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PLAN_KEYS, getPlan } from "@short/core";
import { PanelShell } from "@/components/shell/panel-shell";
import { StatusBadge } from "@/components/shell/status-badge";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Grid,
  Hero,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { getAdminUser } from "@/lib/admin";
import { formatDate, formatNumber } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";
import { UserEditor } from "../user-editor";
import { WorkspacePlanSelect } from "../workspace-plan-select";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const [detail, t] = await Promise.all([getAdminUser(id), getTranslations("admin.users")]);
  return { title: detail ? t("detailMeta", { name: detail.user.name }) : t("detailMetaFallback") };
}

function workspaceRoleLabel(
  role: string,
  t: (key: "roleOwner" | "roleAdmin" | "roleMember") => string,
): string {
  if (role === "owner") {
    return t("roleOwner");
  }
  if (role === "admin") {
    return t("roleAdmin");
  }
  if (role === "member") {
    return t("roleMember");
  }
  return role;
}

export default async function AdminUserDetailPage({ params }: { params: Params }) {
  const context = await requireSuperadmin();
  const { id } = await params;
  const [detail, t, tNav, tn, tc] = await Promise.all([
    getAdminUser(id),
    getTranslations("admin.users"),
    getTranslations("admin.nav"),
    getTranslations("nav"),
    getTranslations("common"),
  ]);
  if (!detail) {
    notFound();
  }

  const planOptions = PLAN_KEYS.map((key) => ({ key, name: getPlan(key).name }));
  const account = detail.user;

  function moreLabel(shown: number, total: number): string | null {
    if (total <= shown) {
      return null;
    }
    return t("showingOf", { shown: formatNumber(shown), total: formatNumber(total) });
  }

  const joinedDelta = account.role === "superadmin"
    ? t("platformAdmin")
    : account.banned
      ? t("banned")
      : account.emailVerified
        ? t("verified")
        : t("unverified");

  return (
    <PanelShell
      title={account.name}
      crumbs={[
        { label: tNav("admin") },
        { label: tn("admin-users"), href: "/admin/users" },
        { label: account.name },
      ]}
    >
      <Hero eyebrow={account.email} title={account.name} description={t("detailDescription")} />

      <Grid columns={3}>
        <Card label={t("workspacesCard")} value={formatNumber(detail.workspaces.length)} staticHover />
        <Card label={t("linksCreated")} value={formatNumber(detail.linksTotal)} staticHover />
        <Card label={tNav("joined")} value={formatDate(account.createdAt)} delta={joinedDelta} staticHover />
      </Grid>

      <Section title={t("account")} description={t("accountDesc")}>
        <Card staticHover className="gap-5 p-6">
          <div className="flex flex-wrap items-center gap-2">
            {account.banned ? <Badge tone="danger">{t("banned")}</Badge> : null}
            {account.role === "superadmin" ? <Badge tone="accent">{t("platformAdmin")}</Badge> : null}
            {account.emailVerified ? (
              <Badge tone="muted">{t("verified")}</Badge>
            ) : (
              <Badge tone="warn">{t("unverified")}</Badge>
            )}
          </div>
          <UserEditor
            currentUserId={context.user.id}
            user={{
              id: account.id,
              name: account.name,
              email: account.email,
              emailVerified: account.emailVerified,
              role: account.role,
              banned: account.banned,
              banReason: account.banReason,
            }}
          />
        </Card>
      </Section>

      <Section title={tn("admin-workspaces")} description={t("workspacesDesc")}>
        {detail.workspaces.length === 0 ? (
          <EmptyState
            icon={<Icon name="building" className="text-lg" />}
            eyebrow={tn("admin-workspaces")}
            title={t("noWorkspaces")}
            description={t("noWorkspacesDesc")}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{tNav("workspace")}</TableHeaderCell>
                <TableHeaderCell>{tNav("role")}</TableHeaderCell>
                <TableHeaderCell>{tNav("plan")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{tn("links")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("bio")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t("qr")}</TableHeaderCell>
                <TableHeaderCell className="text-right">{tNav("actions")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.workspaces.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex min-w-0 flex-col">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium">{row.name}</span>
                        <Badge tone="muted">
                          {row.kind === "team" ? tc("team") : tc("personal")}
                        </Badge>
                      </span>
                      <span className="truncate font-mono text-xs text-fg-muted">{row.slug}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={row.role === "owner" ? "accent" : "muted"}>
                        {workspaceRoleLabel(row.role, (key) => t(key))}
                      </Badge>
                      {row.status === "active" ? null : <StatusBadge status={row.status} />}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.role === "owner" ? (
                      <WorkspacePlanSelect
                        userId={account.id}
                        workspaceId={row.id}
                        planKey={row.planKey}
                        options={planOptions}
                      />
                    ) : (
                      <Badge tone="muted">{row.planName}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(row.links)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(row.biopages)}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(row.qrCodes)}</TableCell>
                  <TableCell>
                    <span className="flex justify-end">
                      <Button size="sm" variant="ghost" href={`/admin/links?workspace=${row.id}`}>
                        {tNav("inspect")}
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <div id="assets" className="flex min-w-0 flex-col gap-8">
        <Section
          title={tn("links")}
          description={moreLabel(detail.links.length, detail.linksTotal) ?? t("linksDesc")}
        >
          {detail.links.length === 0 ? (
            <EmptyState
              icon={<Icon name="link" className="text-lg" />}
              eyebrow={tn("links")}
              title={t("noLinks")}
              description={t("noLinksDesc")}
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{tn("links")}</TableHeaderCell>
                  <TableHeaderCell>{tNav("destination")}</TableHeaderCell>
                  <TableHeaderCell>{tNav("workspace")}</TableHeaderCell>
                  <TableHeaderCell>{tNav("created")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.links.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-mono text-sm">
                          {row.hostname}/{row.slug}
                        </span>
                        {row.disabledAt ? <Badge tone="danger">{t("disabled")}</Badge> : null}
                        {row.archived ? <Badge tone="muted">{t("archived")}</Badge> : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="block max-w-xs truncate text-sm text-fg-muted">
                        {row.destination}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{row.workspaceName}</TableCell>
                    <TableCell className="text-sm text-fg-muted">{formatDate(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        <Section
          title={t("bioPages")}
          description={moreLabel(detail.biopages.length, detail.biopagesTotal) ?? t("bioPagesDesc")}
        >
          {detail.biopages.length === 0 ? (
            <EmptyState
              icon={<Icon name="address-card" className="text-lg" />}
              eyebrow={t("bioPages")}
              title={t("noBio")}
              description={t("noBioDesc")}
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("page")}</TableHeaderCell>
                  <TableHeaderCell>{t("handle")}</TableHeaderCell>
                  <TableHeaderCell>{tNav("workspace")}</TableHeaderCell>
                  <TableHeaderCell>{tNav("created")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.biopages.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{row.displayName}</span>
                        {row.published ? (
                          <Badge tone="accent">{t("published")}</Badge>
                        ) : (
                          <Badge tone="muted">{t("draft")}</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.hostname ? `${row.hostname}/` : "/"}
                      {row.handle}
                    </TableCell>
                    <TableCell className="text-sm">{row.workspaceName}</TableCell>
                    <TableCell className="text-sm text-fg-muted">{formatDate(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        <Section
          title={t("qrCodes")}
          description={moreLabel(detail.qrCodes.length, detail.qrCodesTotal) ?? t("qrCodesDesc")}
        >
          {detail.qrCodes.length === 0 ? (
            <EmptyState
              icon={<Icon name="qrcode" className="text-lg" />}
              eyebrow={t("qrCodes")}
              title={t("noQr")}
              description={t("noQrDesc")}
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{tNav("name")}</TableHeaderCell>
                  <TableHeaderCell>{t("target")}</TableHeaderCell>
                  <TableHeaderCell>{tNav("workspace")}</TableHeaderCell>
                  <TableHeaderCell>{tNav("created")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.qrCodes.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm font-medium">{row.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.hostname}/{row.slug}
                    </TableCell>
                    <TableCell className="text-sm">{row.workspaceName}</TableCell>
                    <TableCell className="text-sm text-fg-muted">{formatDate(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        <Section
          title={t("customDomains")}
          description={moreLabel(detail.domains.length, detail.domainsTotal) ?? t("customDomainsDesc")}
        >
          {detail.domains.length === 0 ? (
            <EmptyState
              icon={<Icon name="globe" className="text-lg" />}
              eyebrow={tn("domains")}
              title={t("noDomains")}
              description={t("noDomainsDesc")}
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{tNav("hostname")}</TableHeaderCell>
                  <TableHeaderCell>{tNav("status")}</TableHeaderCell>
                  <TableHeaderCell>{tNav("workspace")}</TableHeaderCell>
                  <TableHeaderCell>{tNav("created")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.domains.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.hostname}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-sm">{row.workspaceName}</TableCell>
                    <TableCell className="text-sm text-fg-muted">{formatDate(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
      </div>
    </PanelShell>
  );
}
