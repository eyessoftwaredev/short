"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/kit/icon";
import {
  Badge,
  Button,
  Callout,
  Card,
  ConfirmDialog,
  Field,
  Select,
  Steps,
  toast,
} from "@/components/ui";
import { useActionMessage } from "@/lib/action-message";
import type { HostnameHealth } from "@/lib/cloudflare";
import type { CloudflareConnectionPublic } from "@/lib/customer-cloudflare";
import type { DnsProbe } from "@/lib/dns-probe";
import {
  applyCloudflareDnsAction,
  disconnectCloudflareAction,
  probeDomainDnsAction,
  refreshDomainAction,
} from "./actions";
import { isApexHostname, registrableDomain } from "./dns-names";
import { DnsRecords, type DnsRecordItem } from "./dns-records";
import { domainActionError } from "./errors";
import { OAUTH_CHANNEL, OAUTH_MESSAGE_TYPE, oauthStartPath } from "./oauth";
import { domainState, type DomainRowView, type DomainState, type OauthReturn } from "./types";

type DomainSetupProps = {
  domain: DomainRowView;
  cnameTarget: string;
  canManage: boolean;
  /** Cloudflare OAuth app configured on this deployment. */
  cloudflareOAuth: boolean;
  cloudflareAccount: CloudflareConnectionPublic | null;
  /** Cloudflare for SaaS is configured, so an SSL TXT record will be issued. */
  sslAutomatic: boolean;
  oauthReturn?: OauthReturn | null;
};

const PROVIDERS = ["cloudflare", "godaddy", "namecheap", "squarespace", "other"] as const;
type Provider = (typeof PROVIDERS)[number];

const PROVIDER_KEYS: Record<Provider, { label: string; hint: string }> = {
  cloudflare: { label: "providerCloudflare", hint: "hintCloudflare" },
  godaddy: { label: "providerGodaddy", hint: "hintGodaddy" },
  namecheap: { label: "providerNamecheap", hint: "hintNamecheap" },
  squarespace: { label: "providerSquarespace", hint: "hintSquarespace" },
  other: { label: "providerOther", hint: "hintOther" },
};

/** Fast while someone is likely watching, then back off so an open tab is cheap. */
const FAST_POLL_MS = 15_000;
const SLOW_POLL_MS = 60_000;
const FAST_TICKS = 20;

type OauthPayload = { type?: string; ok?: boolean; error?: string | null };
type SetupError = { message: string; reconnect?: boolean };

export function DomainSetup({
  domain,
  cnameTarget,
  canManage,
  cloudflareOAuth,
  cloudflareAccount,
  sslAutomatic,
  oauthReturn = null,
}: DomainSetupProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("domains");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const actionMessage = useActionMessage();

  const [probe, setProbe] = useState<DnsProbe | null>(null);
  const [health, setHealth] = useState<HostnameHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<SetupError | null>(null);
  const [cfBusy, startCf] = useTransition();
  const [waitingPopup, setWaitingPopup] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, startDisconnect] = useTransition();
  const [provider, setProvider] = useState<Provider>(cloudflareAccount ? "cloudflare" : "other");

  const inFlight = useRef(false);
  const liveAnnounced = useRef(false);
  const oauthHandled = useRef(false);
  const oauthCleanup = useRef<(() => void) | null>(null);

  const apex = registrableDomain(domain.hostname);
  const apexHost = isApexHostname(domain.hostname);
  const easyPath = canManage && (cloudflareOAuth || cloudflareAccount !== null);
  const suspended = domain.status === "suspended";
  const settled = domain.status === "active" || suspended;

  function errorFor(result: { error: string; fieldErrors?: Record<string, string[]> }): string {
    return domainActionError(result.error, result.fieldErrors, domain.hostname, t, te, actionMessage);
  }

  /** One round: public DNS as the customer sees it + Cloudflare's view of the hostname. */
  async function check(manual: boolean): Promise<void> {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setChecking(true);
    if (manual) {
      setError(null);
    }
    try {
      const [nextProbe, refreshed] = await Promise.all([
        probeDomainDnsAction(domain.id),
        refreshDomainAction(domain.id),
      ]);
      if (nextProbe.ok) {
        setProbe(nextProbe.data);
      }
      setLastChecked(new Date());
      if (!refreshed.ok) {
        if (manual) {
          setError({ message: errorFor(refreshed) });
        }
        return;
      }
      if (refreshed.data.health) {
        setHealth(refreshed.data.health);
      }
      if (refreshed.data.status === "active") {
        if (!liveAnnounced.current) {
          liveAnnounced.current = true;
          toast.success(t("nowLive", { host: domain.hostname }), t("nowLiveBody"));
        }
        router.refresh();
        return;
      }
      // Keep the server-rendered status (list badge, header) in step with Cloudflare.
      if (refreshed.data.status !== domain.status) {
        router.refresh();
      }
      if (manual) {
        if (nextProbe.ok && nextProbe.data.ready) {
          toast.info(t("checkAllFound"), t("checkAllFoundBody"));
        } else {
          toast.info(t("checkNotYet"), t("checkNotYetBody"));
        }
      }
    } catch {
      if (manual) {
        setError({ message: actionMessage("generic") });
      }
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }

  const checkRef = useRef(check);
  useEffect(() => {
    checkRef.current = check;
  });

  useEffect(() => {
    // Both actions are admin-only; polling them as a member would only log failures.
    if (!canManage || settled) {
      return undefined;
    }
    let cancelled = false;
    let timer: number | undefined;
    let ticks = 0;

    function schedule(): void {
      window.clearTimeout(timer);
      if (!cancelled) {
        timer = window.setTimeout(() => void run(), ticks < FAST_TICKS ? FAST_POLL_MS : SLOW_POLL_MS);
      }
    }

    async function run(): Promise<void> {
      window.clearTimeout(timer);
      if (cancelled) {
        return;
      }
      // A background tab does not need Cloudflare lookups; catch up when it is visible.
      if (document.visibilityState !== "hidden") {
        ticks += 1;
        await checkRef.current(false);
      }
      schedule();
    }

    function onVisibility(): void {
      if (document.visibilityState === "visible") {
        ticks = 0;
        void run();
      }
    }

    void run();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [canManage, settled, domain.id]);

  useEffect(() => () => oauthCleanup.current?.(), []);

  async function applyCloudflare(): Promise<void> {
    setError(null);
    const result = await applyCloudflareDnsAction(domain.id);
    if (!result.ok) {
      if (result.error === "cf_not_connected") {
        window.location.assign(oauthStartPath(domain.id, false));
        return;
      }
      setError({
        message: errorFor(result),
        reconnect: result.error === "cf_token_invalid" || result.error === "cf_no_zone",
      });
      return;
    }
    const changed = result.data.created + result.data.updated;
    toast.success(
      changed > 0
        ? t("cfApplied", { count: changed, zone: result.data.zone })
        : t("cfAlready", { zone: result.data.zone }),
      t("cfAppliedBody"),
    );
    await check(false);
  }

  function onOauthResult(data: OauthPayload): void {
    setWaitingPopup(false);
    if (!data.ok) {
      setError({ message: data.error === "cf_oauth_denied" ? t("cfOAuthDenied") : t("cfOAuthFailed") });
      return;
    }
    toast.success(t("cfConnectedToast"));
    router.refresh();
    startCf(async () => {
      await applyCloudflare();
    });
  }

  function startOauth(): void {
    setError(null);
    oauthCleanup.current?.();
    const popup = window.open(
      oauthStartPath(domain.id, true),
      "cf-oauth",
      "width=520,height=720,menubar=no,toolbar=no",
    );
    if (!popup) {
      // Popup blocked: do the same dance as a full-page redirect.
      window.location.assign(oauthStartPath(domain.id, false));
      return;
    }
    setWaitingPopup(true);

    let handled = false;
    let closedTimer = 0;
    let graceTimer = 0;
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(OAUTH_CHANNEL);

    function cleanup(): void {
      window.removeEventListener("message", onMessage);
      window.clearInterval(closedTimer);
      window.clearTimeout(graceTimer);
      channel?.close();
      oauthCleanup.current = null;
    }

    function finish(data: OauthPayload): void {
      if (handled) {
        return;
      }
      handled = true;
      cleanup();
      onOauthResult(data);
    }

    function onMessage(event: MessageEvent): void {
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as OauthPayload | null;
      if (data?.type === OAUTH_MESSAGE_TYPE) {
        finish(data);
      }
    }

    window.addEventListener("message", onMessage);
    if (channel) {
      channel.onmessage = (event: MessageEvent) => {
        const data = event.data as OauthPayload | null;
        if (data?.type === OAUTH_MESSAGE_TYPE) {
          finish(data);
        }
      };
    }
    // Closed without a result: the user gave up, or the window finished on its own.
    // Stop the spinner and re-read the connection; keep listening in case a result
    // is still on its way.
    closedTimer = window.setInterval(() => {
      if (!popup.closed) {
        return;
      }
      window.clearInterval(closedTimer);
      graceTimer = window.setTimeout(() => {
        if (!handled) {
          setWaitingPopup(false);
          router.refresh();
        }
      }, 1500);
    }, 1000);
    oauthCleanup.current = cleanup;
  }

  function beginCloudflare(): void {
    setError(null);
    if (cloudflareAccount) {
      startCf(async () => {
        await applyCloudflare();
      });
      return;
    }
    startOauth();
  }

  function disconnect(): void {
    startDisconnect(async () => {
      const result = await disconnectCloudflareAction();
      setDisconnectOpen(false);
      if (!result.ok) {
        toast.error(errorFor(result));
        return;
      }
      toast.success(t("cfDisconnected"));
      router.refresh();
    });
  }

  // Coming back from a full-page Cloudflare consent (popup blocked or opener lost).
  useEffect(() => {
    if (oauthHandled.current || !oauthReturn) {
      return;
    }
    oauthHandled.current = true;
    if (oauthReturn.result === "error") {
      setError({
        message: oauthReturn.reason === "cf_oauth_denied" ? t("cfOAuthDenied") : t("cfOAuthFailed"),
      });
      router.replace(`/domains/${domain.id}`);
      return;
    }
    startCf(async () => {
      await applyCloudflare();
      router.replace(`/domains/${domain.id}`);
    });
    // Runs once per return (guarded by the ref); `applyCloudflare` reads the latest props itself.
  }, [oauthReturn, domain.id]);

  const status = health?.status ?? domain.status;
  const sslStatus = health?.sslStatus ?? domain.sslStatus;
  const validation = (health ? health.validation : domain.validationRecords).filter(
    (record) => record.type === "TXT",
  );
  // A fresh probe is the best evidence of where the customer is; before the first one
  // lands, fall back to what Cloudflare told us last time.
  let phase: DomainState;
  if (status === "error" || status === "suspended") {
    phase = "error";
  } else if (probe) {
    phase = probe.ready ? "verifying" : "pending";
  } else {
    phase = domainState({ status, sslStatus, isPlatform: false });
  }

  const records: DnsRecordItem[] = [
    {
      id: "cname",
      purpose: "routing",
      type: "CNAME",
      name: domain.hostname,
      value: cnameTarget,
      check: probe?.records.find((record) => record.type === "CNAME"),
    },
    ...validation.map((record, index) => ({
      id: `txt-${index}`,
      purpose: "verify" as const,
      type: record.type,
      name: record.name,
      value: record.value,
      check: probe?.records.find(
        (entry) => entry.type === "TXT" && entry.name === record.name && entry.expected === record.value,
      ),
    })),
  ];
  const verifyPending =
    sslAutomatic && validation.length === 0 && (sslStatus === "initializing" || sslStatus === "pending");

  const timeFormat = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const providerKeys = PROVIDER_KEYS[provider];

  let statusCallout = null;
  if (phase === "error") {
    statusCallout = (
      <Callout tone="danger" title={suspended ? t("suspendedTitle") : t("errorTitle")}>
        {suspended ? t("suspendedBody") : null}
        {!suspended && health?.message ? (
          <span className="block font-mono text-[13px] break-words">{health.message}</span>
        ) : null}
        {suspended ? null : <span className="mt-1 block">{t("errorBody")}</span>}
      </Callout>
    );
  } else if (phase === "verifying") {
    statusCallout = (
      <Callout tone="info" icon="shield" title={t("verifyingTitle")}>
        {t("verifyingBody")}
      </Callout>
    );
  } else if (!canManage) {
    statusCallout = <Callout tone="info">{t("memberWaiting")}</Callout>;
  }

  return (
    <>
      <Steps
        current={phase === "verifying" ? "live" : "dns"}
        steps={[
          { id: "enter", label: t("stepEnter"), description: domain.hostname, done: true },
          { id: "dns", label: t("stepDns"), description: t("stepDnsDesc") },
          { id: "live", label: t("stepLive"), description: t("stepLiveDesc") },
        ]}
      />

      {statusCallout}

      {error ? (
        <Callout
          tone="danger"
          title={error.message}
          onDismiss={() => setError(null)}
          actions={
            error.reconnect && cloudflareOAuth ? (
              <Button size="sm" leadingIcon="cloudflare" onClick={startOauth}>
                {t("cfReconnect")}
              </Button>
            ) : null
          }
        />
      ) : null}

      {easyPath && phase !== "verifying" && !suspended ? (
        <Card
          title={t("easyTitle")}
          description={t("easyDesc")}
          actions={<Badge tone="accent">{tc("recommended")}</Badge>}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Button
              variant="cloudflare"
              size="lg"
              leadingIcon="cloudflare"
              loading={cfBusy || waitingPopup}
              onClick={beginCloudflare}
            >
              {cloudflareAccount ? t("easyApply") : t("easyConnect")}
            </Button>
            {waitingPopup ? (
              <span className="text-[13px] text-fg-muted">{t("cfWaitingPopup")}</span>
            ) : null}
          </div>
          {cloudflareAccount ? (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-fg-muted">
              <Icon name="circle-check" className="text-xs text-success" />
              <span className="min-w-0">{t("cfConnected", { name: cloudflareAccount.accountName })}</span>
              <Button variant="ghost" size="sm" onClick={() => setDisconnectOpen(true)}>
                {t("cfDisconnect")}
              </Button>
            </div>
          ) : (
            <p className="m-0 text-[13px] leading-5 text-fg-subtle">{t("easyPermissions")}</p>
          )}
        </Card>
      ) : null}

      <Card
        title={easyPath ? t("manualTitleOr") : t("manualTitle")}
        description={t("manualDesc", { apex })}
        footer={
          <>
            <span className="flex min-w-0 flex-1 basis-56 items-center gap-2 text-[13px] text-fg-muted">
              <Icon name={checking ? "spinner" : "clock"} className="shrink-0 text-xs" />
              <span className="min-w-0">
                {!canManage
                  ? t("memberChecks")
                  : settled
                    ? t("autoCheckOff")
                    : lastChecked
                      ? t("lastChecked", { time: timeFormat.format(lastChecked) })
                      : t("autoCheck")}
              </span>
            </span>
            {canManage && !suspended ? (
              <Button
                variant="primary"
                leadingIcon="rotate-right"
                loading={checking}
                onClick={() => void check(true)}
              >
                {t("checkNow")}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-start">
          <Field label={t("providerLabel")} info={t("providerInfo")}>
            <Select value={provider} onChange={(event) => setProvider(event.target.value as Provider)}>
              {PROVIDERS.map((id) => (
                <option key={id} value={id}>
                  {t(PROVIDER_KEYS[id].label)}
                </option>
              ))}
            </Select>
          </Field>
          <Callout tone="neutral" icon="circle-info" title={t("providerHowTo", { provider: t(providerKeys.label) })}>
            {t(providerKeys.hint, { apex })}
          </Callout>
        </div>

        {apexHost ? (
          <Callout tone="warn" title={t("apexTitle")}>
            {t("apexBody", { host: domain.hostname })}
          </Callout>
        ) : null}

        <DnsRecords
          records={records}
          apex={apex}
          checking={checking && !probe}
          verifyPending={verifyPending}
        />

        <p className="m-0 text-[13px] leading-5 text-fg-subtle">{t("propagationNote")}</p>
      </Card>

      <ConfirmDialog
        open={disconnectOpen}
        title={t("cfDisconnectTitle")}
        description={t("cfDisconnectBody")}
        confirmLabel={t("cfDisconnectAction")}
        loading={disconnecting}
        onConfirm={disconnect}
        onClose={() => setDisconnectOpen(false)}
      />
    </>
  );
}
