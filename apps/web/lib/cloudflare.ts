import { features, serverEnv } from "./env";

const CF_API = "https://api.cloudflare.com/client/v4";

type CfResponse<T> = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
};

export type CustomHostnameStatus =
  | "active"
  | "pending"
  | "active_redeploying"
  | "moved"
  | "pending_deletion"
  | "deleted"
  | "pending_blocked"
  | "pending_migration"
  | "provisioned"
  | "test_pending"
  | "test_active"
  | "test_active_apex"
  | "test_blocked"
  | "test_failed"
  | "blocked";

export type CustomHostname = {
  id: string;
  hostname: string;
  status: CustomHostnameStatus;
  ssl: {
    status: string;
    validation_errors?: Array<{ message: string }>;
    validation_records?: Array<{
      txt_name?: string;
      txt_value?: string;
      http_url?: string;
      http_body?: string;
    }>;
  };
  verification_errors?: string[];
};

export class CloudflareError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CloudflareError";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const env = serverEnv();

  const response = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.CF_API_TOKEN}`,
      "content-type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });

  const body = (await response.json()) as CfResponse<T>;

  if (!response.ok || !body.success) {
    const message = body.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new CloudflareError(message, response.status);
  }

  return body.result;
}

function zonePath(): string {
  return `/zones/${serverEnv().CF_ZONE_ID}/custom_hostnames`;
}

/** True when the Cloudflare for SaaS credentials are present; otherwise domains stay local-only. */
export function cloudflareEnabled(): boolean {
  const env = serverEnv();
  return features().cloudflare && Boolean(env.CF_ZONE_ID);
}

export async function createCustomHostname(hostname: string): Promise<CustomHostname> {
  return call<CustomHostname>(zonePath(), {
    method: "POST",
    body: JSON.stringify({
      hostname,
      // TXT keeps validation working before the CNAME is live, which is the usual order.
      ssl: { method: "txt", type: "dv", settings: { min_tls_version: "1.2" } },
    }),
  });
}

export async function getCustomHostname(id: string): Promise<CustomHostname> {
  return call<CustomHostname>(`${zonePath()}/${id}`);
}

export async function deleteCustomHostname(id: string): Promise<void> {
  await call<unknown>(`${zonePath()}/${id}`, { method: "DELETE" });
}

export type ValidationRecord = { type: "TXT" | "HTTP"; name: string; value: string };

export type HostnameHealth = {
  status: "pending" | "provisioning" | "active" | "error";
  sslStatus: string;
  message: string | null;
  /** DNS records the customer still needs to add. */
  validation: ValidationRecord[];
};

/** Collapses Cloudflare's many states into the four the panel's StatusBadge renders. */
export function toHealth(record: CustomHostname): HostnameHealth {
  const sslStatus = record.ssl?.status ?? "unknown";
  const validation = (record.ssl?.validation_records ?? []).flatMap<ValidationRecord>((entry) => {
    if (entry.txt_name && entry.txt_value) {
      return [{ type: "TXT", name: entry.txt_name, value: entry.txt_value }];
    }
    if (entry.http_url && entry.http_body) {
      return [{ type: "HTTP", name: entry.http_url, value: entry.http_body }];
    }
    return [];
  });

  const errors = [
    ...(record.verification_errors ?? []),
    ...(record.ssl?.validation_errors ?? []).map((error) => error.message),
  ].filter((message) => message.trim() !== "");

  if (record.status === "active" && sslStatus === "active") {
    return { status: "active", sslStatus, message: null, validation: [] };
  }

  if (record.status === "blocked" || record.status.startsWith("test_failed")) {
    return {
      status: "error",
      sslStatus,
      message: errors[0] ?? "Cloudflare rejected this hostname.",
      validation,
    };
  }

  if (errors.length > 0) {
    return { status: "error", sslStatus, message: errors[0] ?? null, validation };
  }

  return {
    status: sslStatus === "pending_validation" || sslStatus === "initializing" ? "provisioning" : "pending",
    sslStatus,
    message: null,
    validation,
  };
}
