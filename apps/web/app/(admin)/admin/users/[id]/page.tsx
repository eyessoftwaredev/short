import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PLAN_KEYS, getPlan } from "@short/core";
import { PanelShell } from "@/components/shell/panel-shell";
import { StatusBadge } from "@/components/shell/status-badge";
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Grid,
  InfoTip,
  KeyValue,
  PageHeader,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { getAdminUser } from "@/lib/admin";
import { formatDate, formatDateTime, formatNumber, truncateMiddle } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";
import { UserActions } from "../user-actions";
import { UserEditor } from "../user-editor";
import { UserStatusBadges } from "../users-table";
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
  const locale = await getLocale();
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
  const displayName = account.name.trim() === "" ? account.email : account.name;

  function countDescription(shown: number, total: number, fallback: string): string {
    if (total <= shown) {
      return fallback;
    }
    return t("showingOf", { shown: formatNumber(shown, locale), total: formatNumber(total, locale) });
  }

  /** Same frame for the four asset lists: a flush table, or a small empty state. */
  function assetCard(title: string, description: string, empty: ReactNode, table: ReactNode, count: number) {
    return (
      <Card padding="none" title={title} description={description}>
        {count === 0 ? empty : table}
      </Card>
    );
  }

  return (
    <PanelShell
      title={displayName}
      crumbs={[
        { label: tNav("admin"), href: "/admin" },
        { label: tn("admin-users"), href: "/admin/users" },
      ]}
    >
      <PageHeader
        back={{ href: "/admin/users", label: tn("admin-users") }}
        title={displayName}
        meta={<UserStatusBadges user={account} />}
        description={<span className="font-mono text-[13px]">{account.email}</span>}
        actions={
          <UserActions
            variant="buttons"
            showOpen={false}
            currentUserId={context.user.id}
            user={{
              id: account.id,
              name: account.name,
              email: account.email,
              role: account.role,
              banned: account.banned,
            }}
          />
        }
      />

      {account.banned ? (
        <Callout tone="danger" icon="ban" title={t("bannedCallout")}>
          {account.banReason ? t("bannedReason", { reason: account.banReason }) : t("bannedNoReason")}
        </Callout>
      ) : null}

      <Grid columns={4}>
        <StatCard icon="building" label={t("workspacesCard")} value={formatNumber(detail.workspaces.length, locale)} />
        <StatCard icon="link" label={t("linksCreated")} value={formatNumber(detail.linksTotal, locale)} />
        <StatCard icon="address-card" label={t("bioPages")} value={formatNumber(detail.biopagesTotal, locale)} />
        <StatCard icon="qrcode" label={t("qrCodes")} value={formatNumber(detail.qrCodesTotal, locale)} />
      </Grid>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <UserEditor
          // Remount on every saved change so the form starts from what the server stored.
          key={account.updatedAt.toISOString()}
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
        <Card title={t("facts")}>
          <KeyValue
            items={[
              { id: "id", label: t("userId"), value: account.id, mono: true, copy: account.id },
              { id: "joined", label: tNav("joined"), value: formatDate(account.createdAt, locale) },
              { id: "updated", label: t("lastUpdated"), value: formatDateTime(account.updatedAt, locale) },
              {
                id: "verified",
                label: t("emailVerified"),
                value: account.emailVerified ? t("yes") : t("no"),
              },
              {
                id: "role",
                label: t("platformRole"),
                value: account.role === "superadmin" ? t("platformAdmin") : t("member"),
              },
            ]}
          />
        </Card>
      </div>

      <Card padding="none" title={tn("admin-workspaces")} description={t("workspacesDesc")}>
        {detail.workspaces.length === 0 ? (
          <EmptyState bare size="sm" icon="building" title={t("noWorkspaces")} description={t("noWorkspacesDesc")} />
        ) : (
          <Table bare label={tn("admin-workspaces")}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{tNav("workspace")}</TableHeaderCell>
                <TableHeaderCell>{tNav("role")}</TableHeaderCell>
                <TableHeaderCell>
                  <span className="inline-flex items-center gap-1.5">
                    {tNav("plan")}
                    <InfoTip label={tNav("plan")}>{t("workspacePlanInfo")}</InfoTip>
                  </span>
                </TableHeaderCell>
                <TableHeaderCell numeric className="hidden md:table-cell">
                  {tn("links")}
                </TableHeaderCell>
                <TableHeaderCell numeric className="hidden lg:table-cell">
                  {t("bio")}
                </TableHeaderCell>
                <TableHeaderCell numeric className="hidden lg:table-cell">
                  {t("qr")}
                </TableHeaderCell>
                <TableHeaderCell className="w-px">
                  <span className="sr-only">{tNav("actions")}</span>
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.workspaces.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium">{row.name}</span>
                        <Badge tone="neutral" size="sm">
                          {row.kind === "team" ? tc("team") : tc("personal")}
                        </Badge>
                      </span>
                      <span className="truncate font-mono text-xs text-fg-muted">{row.slug}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={row.role === "owner" ? "accent" : "neutral"}>
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
                      <Badge tone="neutral">{row.planName}</Badge>
                    )}
                  </TableCell>
                  <TableCell numeric className="hidden md:table-cell">
                    {formatNumber(row.links, locale)}
                  </TableCell>
                  <TableCell numeric className="hidden lg:table-cell">
                    {formatNumber(row.biopages, locale)}
                  </TableCell>
                  <TableCell numeric className="hidden lg:table-cell">
                    {formatNumber(row.qrCodes, locale)}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="sm"
                      variant="ghost"
                      trailingIcon="chevron-right"
                      href={`/admin/links?workspace=${encodeURIComponent(row.id)}`}
                    >
                      {t("viewLinks")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <div id="assets" className="flex min-w-0 flex-col gap-6">
        {assetCard(
          tn("links"),
          countDescription(detail.links.length, detail.linksTotal, t("linksDesc")),
          <EmptyState bare size="sm" icon="link" title={t("noLinks")} description={t("noLinksDesc")} />,
          <Table bare density="compact" label={tn("links")}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("shortLink")}</TableHeaderCell>
                <TableHeaderCell className="hidden md:table-cell">{tNav("destination")}</TableHeaderCell>
                <TableHeaderCell className="hidden sm:table-cell">{tNav("workspace")}</TableHeaderCell>
                <TableHeaderCell>{tNav("created")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.links.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate font-mono text-[13px]">
                        {row.hostname}/{row.slug}
                      </span>
                      {row.disabledAt ? (
                        <Badge tone="danger" size="sm">
                          {t("disabled")}
                        </Badge>
                      ) : null}
                      {row.archived ? (
                        <Badge tone="neutral" size="sm">
                          {t("archived")}
                        </Badge>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-xs md:table-cell">
                    <span className="block truncate font-mono text-xs text-fg-muted" title={row.destination}>
                      {truncateMiddle(row.destination, 60)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-[13px] sm:table-cell">{row.workspaceName}</TableCell>
                  <TableCell className="numeric text-[13px] whitespace-nowrap text-fg-muted">
                    {formatDate(row.createdAt, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>,
          detail.links.length,
        )}

        <Grid columns={2}>
          {assetCard(
            t("bioPages"),
            countDescription(detail.biopages.length, detail.biopagesTotal, t("bioPagesDesc")),
            <EmptyState bare size="sm" icon="address-card" title={t("noBio")} description={t("noBioDesc")} />,
            <Table bare density="compact" label={t("bioPages")}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("page")}</TableHeaderCell>
                  <TableHeaderCell>{t("handle")}</TableHeaderCell>
                  <TableHeaderCell className="hidden sm:table-cell">{tNav("created")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.biopages.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{row.displayName}</span>
                        <Badge tone={row.published ? "success" : "neutral"} size="sm">
                          {row.published ? t("published") : t("draft")}
                        </Badge>
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-[13px]">
                      {row.hostname ? `${row.hostname}/` : "/"}
                      {row.handle}
                    </TableCell>
                    <TableCell className="numeric hidden text-[13px] whitespace-nowrap text-fg-muted sm:table-cell">
                      {formatDate(row.createdAt, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>,
            detail.biopages.length,
          )}

          {assetCard(
            t("qrCodes"),
            countDescription(detail.qrCodes.length, detail.qrCodesTotal, t("qrCodesDesc")),
            <EmptyState bare size="sm" icon="qrcode" title={t("noQr")} description={t("noQrDesc")} />,
            <Table bare density="compact" label={t("qrCodes")}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{tNav("name")}</TableHeaderCell>
                  <TableHeaderCell>{t("target")}</TableHeaderCell>
                  <TableHeaderCell className="hidden sm:table-cell">{tNav("created")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.qrCodes.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm font-medium">{row.name}</TableCell>
                    <TableCell className="font-mono text-[13px]">
                      {row.hostname}/{row.slug}
                    </TableCell>
                    <TableCell className="numeric hidden text-[13px] whitespace-nowrap text-fg-muted sm:table-cell">
                      {formatDate(row.createdAt, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>,
            detail.qrCodes.length,
          )}
        </Grid>

        {assetCard(
          t("customDomains"),
          countDescription(detail.domains.length, detail.domainsTotal, t("customDomainsDesc")),
          <EmptyState bare size="sm" icon="globe" title={t("noDomains")} description={t("noDomainsDesc")} />,
          <Table bare density="compact" label={t("customDomains")}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{tNav("hostname")}</TableHeaderCell>
                <TableHeaderCell>{tNav("status")}</TableHeaderCell>
                <TableHeaderCell className="hidden sm:table-cell">{tNav("workspace")}</TableHeaderCell>
                <TableHeaderCell className="hidden sm:table-cell">{tNav("created")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detail.domains.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-[13px]">{row.hostname}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="hidden text-[13px] sm:table-cell">{row.workspaceName}</TableCell>
                  <TableCell className="numeric hidden text-[13px] whitespace-nowrap text-fg-muted sm:table-cell">
                    {formatDate(row.createdAt, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>,
          detail.domains.length,
        )}
      </div>
    </PanelShell>
  );
}
