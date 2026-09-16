"use client";

import { Icon } from "@/components/kit/icon";
import { useActionMessage } from "@/lib/action-message";
import { cn } from "@/lib/cx";
import type { HostnameHealth } from "@/lib/cloudflare";
import type { CloudflareConnectionPublic } from "@/lib/customer-cloudflare";
import type { DnsProbe } from "@/lib/dns-probe";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  applyCloudflareDnsAction,
  disconnectCloudflareAction,
  probeDomainDnsAction,
  refreshDomainAction,
  removeDomainAction,
} from "./actions";
import { DnsRecordTable } from "./dns-record-table";
import { domainActionError } from "./errors";
import { oauthStartPath } from "./oauth";
import type { DomainRowView, OauthReturn } from "./types";

type DomainSetupProps = {
  domain: DomainRowView;
  cnameTarget: string;
  canManage: boolean;
  cloudflareOAuth: boolean;
  cloudflareAccount: CloudflareConnectionPublic | null;
  oauthReturn?: OauthReturn | null;
};

export function DomainSetup({
  domain,
  cnameTarget,
  canManage,
  cloudflareOAuth,
  cloudflareAccount,
  oauthReturn = null,
}: DomainSetupProps) {
  const router = useRouter();
  const t = useTranslations("domains");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();
  const [pending, startTransition] = useTransition();
  const [health, setHealth] = useState<HostnameHealth | null>(null);
  const [probe, setProbe] = useState<DnsProbe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const oauthHandled = useRef(false);

  async function refresh(silent = false): Promise<string | null> {
    setError(null);
    const result = await refreshDomainAction(domain.id);
    if (!result.ok) {
      if (!silent) {
        setError(domainActionError(result.error, result.fieldErrors, domain.hostname, t, te, actionMessage));
      }
      return null;
    }
    if (result.data.health) {
      setHealth(result.data.health);
    }
    if (!silent || result.data.status === "active") {
      router.refresh();
    }
    return result.data.status;
  }

  function beginCloudflare(): void {
    setError(null);
    if (cloudflareAccount) {
      startTransition(() => void applyCloudflare());
      return;
    }
    startOauth();
  }

  function startOauth(): void {
    setError(null);
    if (!cloudflareOAuth) {
      setError(t("cfOAuthMissing"));
      return;
    }
    const popup = window.open(
      oauthStartPath(domain.id, true),
      "cf-oauth",
      "width=520,height=720,menubar=no,toolbar=no",
    );
    if (!popup) {
      window.location.assign(oauthStartPath(domain.id, false));
      return;
    }

    function onMessage(event: MessageEvent): void {
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as { type?: string; ok?: boolean; error?: string | null };
      if (data?.type !== "short-cf-oauth") {
        return;
      }
      window.removeEventListener("message", onMessage);
      if (!data.ok) {
        setError(data.error === "cf_oauth_denied" ? t("cfOAuthDenied") : t("cfOAuthFailed"));
        return;
      }
      router.refresh();
      startTransition(() => void applyCloudflare());
    }

    window.addEventListener("message", onMessage);
  }

  async function applyCloudflare(): Promise<void> {
    setError(null);
    const result = await applyCloudflareDnsAction(domain.id);
    if (!result.ok && result.error === "cf_not_connected") {
      window.location.assign(oauthStartPath(domain.id, false));
      return;
    }
    if (!result.ok) {
      setError(domainActionError(result.error, result.fieldErrors, domain.hostname, t, te, actionMessage));
      return;
    }
    setNotice(
      result.data.created + result.data.updated > 0
        ? t("cfApplied", { count: result.data.created + result.data.updated, zone: result.data.zone })
        : t("cfAlready", { zone: result.data.zone }),
    );
    const nextProbe = await probeDomainDnsAction(domain.id);
    if (nextProbe.ok) {
      setProbe(nextProbe.data);
    }
    await refresh(true);
  }

  async function disconnectCloudflare(): Promise<void> {
    if (!window.confirm(t("cfDisconnectConfirm"))) {
      return;
    }
    const result = await disconnectCloudflareAction();
    if (!result.ok) {
      setError(domainActionError(result.error, result.fieldErrors, domain.hostname, t, te, actionMessage));
      return;
    }
    router.refresh();
  }

  async function remove(): Promise<void> {
    if (!window.confirm(t("removeConfirm", { host: domain.hostname }))) {
      return;
    }
    const result = await removeDomainAction(domain.id);
    if (!result.ok) {
      setError(domainActionError(result.error, result.fieldErrors, domain.hostname, t, te, actionMessage));
      return;
    }
    router.push("/domains");
  }

  useEffect(() => {
    if (oauthHandled.current || !oauthReturn) {
      return;
    }
    oauthHandled.current = true;
    if (oauthReturn.result === "error") {
      setError(oauthReturn.reason === "cf_oauth_denied" ? t("cfOAuthDenied") : t("cfOAuthFailed"));
      router.replace(`/domains/${domain.id}`);
      return;
    }
    startTransition(() => {
      void (async () => {
        await applyCloudflare();
        router.replace(`/domains/${domain.id}`);
      })();
    });
  }, [oauthReturn, domain.id, router, t]);

  useEffect(() => {
    if (domain.status === "active" || domain.status === "suspended") {
      return undefined;
    }
    let cancelled = false;

    async function tick(): Promise<void> {
      const nextProbe = await probeDomainDnsAction(domain.id);
      if (cancelled) {
        return;
      }
      if (nextProbe.ok) {
        setProbe(nextProbe.data);
      }
      await refresh(true);
    }

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [domain.id, domain.status]);

  const validation = health?.validation ?? domain.validationRecords;
  const waitingError = health?.status === "error";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {health?.message ? (
        <p
          className={cn(
            "m-0 flex items-center gap-2 text-sm",
            waitingError ? "text-danger" : "text-fg-muted",
          )}
        >
          <Icon name={waitingError ? "warning" : "rotate-right"} className="text-base" />
          {health.message}
        </p>
      ) : null}

      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
      {notice ? <p className="m-0 text-sm text-accent-ink">{notice}</p> : null}

      <div className="flex min-w-0 flex-wrap gap-2">
        {canManage ? (
          <Button size="lg" variant="cloudflare" disabled={pending} onClick={beginCloudflare}>
            <Icon name="cloudflare" className="text-lg" />
            {t("autoconfigure")}
          </Button>
        ) : null}
        {cloudflareAccount ? (
          <button
            type="button"
            className="text-sm text-fg-muted"
            onClick={() => startTransition(() => void disconnectCloudflare())}
          >
            {t("cfConnected", { name: cloudflareAccount.accountName })}
          </button>
        ) : null}
      </div>

      <DnsRecordTable
        title={t("routingTitle")}
        rows={[
          {
            type: "CNAME",
            name: domain.hostname,
            value: cnameTarget,
            check: probe?.records.find((record) => record.type === "CNAME"),
          },
        ]}
      />
      <DnsRecordTable
        title={t("verificationTitle")}
        rows={validation.map((record) => ({
          type: record.type,
          name: record.name,
          value: record.value,
          check: probe?.records.find(
            (entry) =>
              entry.type === record.type && entry.name === record.name && entry.expected === record.value,
          ),
        }))}
      />

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        {probe?.ready && domain.status !== "active" ? (
          <span className="flex items-center gap-2 text-sm text-accent-ink">
            <Icon name="shield" className="text-base" />
            {t("dnsSslWaiting")}
          </span>
        ) : (
          <span className="flex items-center gap-2 text-sm text-fg-muted">
            <Icon name="rotate-right" className="text-base" />
            {t("dnsWatching")}
          </span>
        )}
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" disabled={pending} onClick={() => startTransition(() => void refresh())}>
              {t("recordsAdded")}
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => startTransition(() => void remove())}>
              <Icon name="trash" className="text-base" />
              {t("remove")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
