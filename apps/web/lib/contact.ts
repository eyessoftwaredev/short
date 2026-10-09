import { serverEnv } from "./env";

/**
 * Public contact mailboxes, on the platform's own short domain so short.ky shows
 * support@short.ky and kisa.ly shows support@kisa.ly. Inbound mail for these domains is
 * routed centrally (catch-all), so every address here is delivered.
 */
export type ContactEmails = {
  support: string;
  sales: string;
  privacy: string;
  legal: string;
  abuse: string;
  security: string;
};

export function contactDomain(): string {
  const host = serverEnv().PLATFORM_SHORT_DOMAIN.toLowerCase().replace(/:\d+$/, "");
  // Local development has no mailbox; fall back to the primary platform domain.
  return host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host) ? "short.ky" : host;
}

export function contactEmails(): ContactEmails {
  const domain = contactDomain();
  return {
    support: `support@${domain}`,
    sales: `sales@${domain}`,
    privacy: `privacy@${domain}`,
    legal: `legal@${domain}`,
    abuse: `abuse@${domain}`,
    security: `security@${domain}`,
  };
}
