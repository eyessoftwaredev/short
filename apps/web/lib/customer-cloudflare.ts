import {
  cloudflareConnections,
  eq,
  getDb,
  type CloudflareConnectionRow,
} from "@short/db";
import { decryptSecret, encryptSecret, reencryptIfLegacy } from "./secret";

const CF_API = "https://api.cloudflare.com/client/v4";

type CfResponse<T> = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
};

type CfZone = { id: string; name: string; account: { id: string; name: string } };
type CfAccount = { id: string; name: string };
type CfDnsRecord = { id: string; type: string; name: string; content: string; proxied?: boolean };

export class CustomerCloudflareError extends Error {
  constructor(
    message: string,
    readonly code: "token" | "zone" | "dns" | "missing",
  ) {
    super(message);
    this.name = "CustomerCloudflareError";
  }
}

async function customerCall<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(12_000),
  });

  const body = (await response.json()) as CfResponse<T>;
  if (!response.ok || !body.success) {
    const message = body.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new CustomerCloudflareError(message, response.status === 401 || response.status === 403 ? "token" : "dns");
  }
  return body.result;
}

function zoneCandidates(hostname: string): string[] {
  const parts = hostname.split(".");
  const names: string[] = [];
  for (let index = 0; index < parts.length - 1; index += 1) {
    names.push(parts.slice(index).join("."));
  }
  return names;
}

export type CloudflareConnectionPublic = {
  accountId: string;
  accountName: string;
};

export async function getCloudflareConnection(
  workspaceId: string,
): Promise<CloudflareConnectionRow | null> {
  const [row] = await getDb()
    .select()
    .from(cloudflareConnections)
    .where(eq(cloudflareConnections.workspaceId, workspaceId))
    .limit(1);
  return row ?? null;
}

export async function getCloudflareConnectionPublic(
  workspaceId: string,
): Promise<CloudflareConnectionPublic | null> {
  const row = await getCloudflareConnection(workspaceId);
  if (!row) {
    return null;
  }
  return { accountId: row.accountId, accountName: row.accountName };
}

/** Verifies the token can list zones, then stores it encrypted for this workspace. */
export async function connectCustomerCloudflare(
  workspaceId: string,
  token: string,
): Promise<CloudflareConnectionPublic> {
  const trimmed = token.trim();
  if (trimmed.length < 20) {
    throw new CustomerCloudflareError("Token is too short.", "token");
  }

  try {
    await customerCall<{ status: string }>(trimmed, "/user/tokens/verify");
  } catch {
    try {
      await customerCall<CfZone[]>(trimmed, "/zones?per_page=1");
    } catch {
      throw new CustomerCloudflareError("Cloudflare rejected this token.", "token");
    }
  }

  let account: CfAccount | undefined;
  try {
    account = (await customerCall<CfAccount[]>(trimmed, "/accounts?per_page=1"))[0];
  } catch {
    const zone = (await customerCall<CfZone[]>(trimmed, "/zones?per_page=1"))[0];
    if (zone) {
      account = { id: zone.account.id, name: zone.account.name };
    }
  }
  if (!account) {
    throw new CustomerCloudflareError("This token cannot see any Cloudflare account.", "token");
  }

  const encrypted = encryptSecret(trimmed);
  const db = getDb();
  const existing = await getCloudflareConnection(workspaceId);

  if (existing) {
    await db
      .update(cloudflareConnections)
      .set({
        accountId: account.id,
        accountName: account.name,
        encryptedToken: encrypted,
        updatedAt: new Date(),
      })
      .where(eq(cloudflareConnections.id, existing.id));
  } else {
    await db.insert(cloudflareConnections).values({
      workspaceId,
      accountId: account.id,
      accountName: account.name,
      encryptedToken: encrypted,
    });
  }

  return { accountId: account.id, accountName: account.name };
}

export async function disconnectCustomerCloudflare(workspaceId: string): Promise<void> {
  await getDb().delete(cloudflareConnections).where(eq(cloudflareConnections.workspaceId, workspaceId));
}

async function findZone(token: string, hostname: string): Promise<CfZone> {
  for (const name of zoneCandidates(hostname)) {
    const zones = await customerCall<CfZone[]>(token, `/zones?name=${encodeURIComponent(name)}`);
    const match = zones.find((zone) => zone.name === name);
    if (match) {
      return match;
    }
  }
  throw new CustomerCloudflareError(hostname, "zone");
}

async function upsertDnsRecord(
  token: string,
  zoneId: string,
  record: { type: "CNAME" | "TXT"; name: string; content: string; proxied?: boolean },
): Promise<"created" | "updated" | "unchanged"> {
  const query = new URLSearchParams({ type: record.type, name: record.name });
  const existing = await customerCall<CfDnsRecord[]>(
    token,
    `/zones/${zoneId}/dns_records?${query.toString()}`,
  );
  const current = existing[0];
  const same =
    current &&
    current.content.replace(/\.$/, "").toLowerCase() === record.content.replace(/\.$/, "").toLowerCase() &&
    (record.type !== "CNAME" || current.proxied === false);

  if (same) {
    return "unchanged";
  }

  const body = {
    type: record.type,
    name: record.name,
    content: record.content,
    ttl: 1,
    proxied: record.proxied ?? false,
    comment: "Short.ky custom hostname",
  };

  if (!current) {
    await customerCall<CfDnsRecord>(token, `/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return "created";
  }

  await customerCall<CfDnsRecord>(token, `/zones/${zoneId}/dns_records/${current.id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return "updated";
}

export type AppliedDns = {
  zone: string;
  created: number;
  updated: number;
  unchanged: number;
};

/** Writes the CNAME + SSL TXT records on the customer's zone. Grey-cloud CNAME so validation can see it. */
export async function applyCustomerDns(input: {
  workspaceId: string;
  hostname: string;
  cnameTarget: string;
  validation: Array<{ type: string; name: string; value: string }>;
}): Promise<AppliedDns> {
  const connection = await getCloudflareConnection(input.workspaceId);
  if (!connection) {
    throw new CustomerCloudflareError("Connect Cloudflare first.", "missing");
  }

  const token = decryptSecret(connection.encryptedToken);
  const upgraded = reencryptIfLegacy(connection.encryptedToken);
  if (upgraded) {
    try {
      await getDb()
        .update(cloudflareConnections)
        .set({ encryptedToken: upgraded, updatedAt: new Date() })
        .where(eq(cloudflareConnections.id, connection.id));
    } catch (error) {
      console.error("cloudflare token re-encrypt failed", error);
    }
  }
  const zone = await findZone(token, input.hostname);

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  const results = [
    await upsertDnsRecord(token, zone.id, {
      type: "CNAME",
      name: input.hostname,
      content: input.cnameTarget,
      proxied: false,
    }),
  ];

  for (const record of input.validation) {
    if (record.type !== "TXT") {
      continue;
    }
    results.push(
      await upsertDnsRecord(token, zone.id, {
        type: "TXT",
        name: record.name,
        content: record.value,
      }),
    );
  }

  for (const result of results) {
    if (result === "created") {
      created += 1;
    } else if (result === "updated") {
      updated += 1;
    } else {
      unchanged += 1;
    }
  }

  return { zone: zone.name, created, updated, unchanged };
}
