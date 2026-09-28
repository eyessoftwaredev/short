"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/kit/icon";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  CopyField,
  Disclosure,
  EmptyState,
  Field,
  Select,
  Switch,
  toast,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import type { StatsShareView } from "@/lib/stats-shares";
import { createStatsShareAction, listStatsSharesAction, revokeStatsShareAction } from "../../share-actions";

type Expiry = "never" | "7" | "30" | "90";

type SharePanelProps = {
  linkId: string;
  initialShares: StatsShareView[];
  /** Members and up; viewers of a read-only role only see the list. */
  canManage: boolean;
};

/**
 * Public, read-only stats pages for this link: create one (optionally expiring, with or
 * without referrers and locations), copy its address, revoke it.
 */
export function SharePanel({ linkId, initialShares, canManage }: SharePanelProps) {
  const t = useTranslations("links.shares");
  const tc = useTranslations("common");
  const locale = useLocale();
  const actionMessage = useActionMessage();
  const [shares, setShares] = useState(initialShares);
  const [expiry, setExpiry] = useState<Expiry>("30");
  const [showReferrers, setShowReferrers] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<StatsShareView | null>(null);
  const [pending, startTransition] = useTransition();

  const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }), [locale]);
  const active = shares.filter((share) => share.active);
  const past = shares.filter((share) => !share.active);

  async function refresh(): Promise<void> {
    const result = await listStatsSharesAction(linkId);
    if (result.ok) {
      setShares(result.data);
    }
  }

  function create(): void {
    startTransition(async () => {
      try {
        const expiresAt =
          expiry === "never" ? null : new Date(Date.now() + Number(expiry) * 24 * 60 * 60 * 1000).toISOString();
        const result = await createStatsShareAction(linkId, { expiresAt, showReferrers, showLocations });
        if (!result.ok) {
          toast.error(actionMessage(result.error));
          return;
        }
        setShares((prev) => [result.data, ...prev]);
        setJustCreated(result.data.id);
        try {
          await navigator.clipboard.writeText(result.data.url);
          toast.success(t("createdCopied"));
        } catch {
          toast.success(t("created"));
        }
      } catch {
        toast.error(actionMessage("generic"));
      }
    });
  }

  function revoke(share: StatsShareView): void {
    startTransition(async () => {
      try {
        const result = await revokeStatsShareAction(share.id);
        setRevoking(null);
        if (!result.ok) {
          toast.error(actionMessage(result.error));
          return;
        }
        setShares((prev) => prev.map((item) => (item.id === share.id ? result.data : item)));
        toast.success(t("revoked"));
        void refresh();
      } catch {
        toast.error(actionMessage("generic"));
      }
    });
  }

  const describe = (share: StatsShareView): string => {
    const parts = [t("createdOn", { date: dateFormat.format(new Date(share.createdAt)) })];
    if (share.revokedAt) {
      parts.push(t("revokedOn", { date: dateFormat.format(new Date(share.revokedAt)) }));
    } else if (share.expiresAt) {
      parts.push(
        share.active
          ? t("expiresOn", { date: dateFormat.format(new Date(share.expiresAt)) })
          : t("expiredOn", { date: dateFormat.format(new Date(share.expiresAt)) }),
      );
    } else {
      parts.push(t("neverExpires"));
    }
    return parts.join(" · ");
  };

  const visibility = (share: StatsShareView) => (
    <span className="flex flex-wrap items-center gap-1">
      <Badge tone="neutral" size="sm">
        {t("showsClicks")}
      </Badge>
      {share.showReferrers ? (
        <Badge tone="neutral" size="sm">
          {t("showsReferrers")}
        </Badge>
      ) : null}
      {share.showLocations ? (
        <Badge tone="neutral" size="sm">
          {t("showsLocations")}
        </Badge>
      ) : null}
    </span>
  );

  return (
    <div id="share-stats" className="scroll-mt-24">
      <Card
        title={
          <span className="flex items-center gap-2">
            <Icon name="share-nodes" className="text-xs text-fg-subtle" />
            {t("title")}
          </span>
        }
        description={t("description")}
        actions={active.length > 0 ? <Badge tone="success" dot>{t("liveCount", { count: active.length })}</Badge> : null}
      >
        {canManage ? (
          <div className="flex min-w-0 flex-col gap-4 rounded-md border border-border-subtle bg-surface-subtle p-4">
            <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] md:items-start">
              <Field label={t("expiryLabel")} info={t("expiryInfo")}>
                <Select value={expiry} onChange={(event) => setExpiry(event.target.value as Expiry)}>
                  <option value="7">{t("expiry7")}</option>
                  <option value="30">{t("expiry30")}</option>
                  <option value="90">{t("expiry90")}</option>
                  <option value="never">{t("expiryNever")}</option>
                </Select>
              </Field>
              <div className="flex min-w-0 flex-col gap-3 md:pt-7">
                <label className="flex min-w-0 items-start justify-between gap-3 text-sm">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium text-ink">{t("referrersLabel")}</span>
                    <span className="text-[13px] text-fg-muted">{t("referrersHint")}</span>
                  </span>
                  <Switch checked={showReferrers} onCheckedChange={setShowReferrers} aria-label={t("referrersLabel")} />
                </label>
                <label className="flex min-w-0 items-start justify-between gap-3 text-sm">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium text-ink">{t("locationsLabel")}</span>
                    <span className="text-[13px] text-fg-muted">{t("locationsHint")}</span>
                  </span>
                  <Switch checked={showLocations} onCheckedChange={setShowLocations} aria-label={t("locationsLabel")} />
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] text-fg-subtle">{t("privacyNote")}</span>
              <Button leadingIcon="plus" loading={pending && revoking == null} onClick={create}>
                {t("create")}
              </Button>
            </div>
          </div>
        ) : null}

        {active.length === 0 ? (
          <EmptyState
            bare
            size="sm"
            icon="share-nodes"
            title={t("emptyTitle")}
            description={canManage ? t("emptyBody") : t("emptyBodyReadOnly")}
          />
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-border-subtle p-0">
            {active.map((share) => (
              <li key={share.id} className="flex min-w-0 flex-col gap-2 py-4 first:pt-1 last:pb-0">
                <div className="flex min-w-0 items-end gap-2">
                  <CopyField value={share.url} href={share.url} size="sm" className="min-w-0 flex-1" />
                  {canManage ? (
                    <Button size="sm" variant="ghost" leadingIcon="ban" onClick={() => setRevoking(share)}>
                      {t("revoke")}
                    </Button>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-fg-subtle">
                    {justCreated === share.id ? (
                      <Badge tone="accent" size="sm" className="mr-2">
                        {t("new")}
                      </Badge>
                    ) : null}
                    {describe(share)}
                  </span>
                  {visibility(share)}
                </div>
              </li>
            ))}
          </ul>
        )}

        {past.length > 0 ? (
          <Disclosure variant="plain" title={t("pastTitle", { count: past.length })} description={t("pastDesc")}>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {past.map((share) => (
                <li key={share.id} className="flex min-w-0 flex-col gap-0.5 text-[13px]">
                  <span className="truncate font-mono text-fg-subtle line-through">{share.url}</span>
                  <span className="text-xs text-fg-subtle">{describe(share)}</span>
                </li>
              ))}
            </ul>
          </Disclosure>
        ) : null}
      </Card>

      <ConfirmDialog
        open={revoking != null}
        title={t("revokeTitle")}
        description={t("revokeBody")}
        confirmLabel={t("revokeConfirm")}
        cancelLabel={tc("cancel")}
        loading={pending}
        onClose={() => setRevoking(null)}
        onConfirm={() => {
          if (revoking) {
            revoke(revoking);
          }
        }}
      />
    </div>
  );
}
