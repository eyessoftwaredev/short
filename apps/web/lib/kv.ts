import {
  biopageKey,
  domainKey,
  linkKey,
  type BiopageKvRecord,
  type DomainKvRecord,
  type LinkKvRecord,
} from "@short/core";
import { features, serverEnv } from "./env";

const CF_API = "https://api.cloudflare.com/client/v4";

type BulkEntry = { key: string; value: string; expiration_ttl?: number };

function namespaceUrl(path: string): string {
  const env = serverEnv();
  return `${CF_API}/accounts/${env.CF_ACCOUNT_ID}/storage/kv/namespaces/${env.CF_KV_NAMESPACE_ID}${path}`;
}

function authHeaders(): HeadersInit {
  return { authorization: `Bearer ${serverEnv().CF_API_TOKEN}` };
}

/**
 * Writes the records the redirect worker reads. Called on every link/domain mutation so
 * the edge sees the change immediately instead of waiting for the KV TTL to lapse.
 *
 * Failures are logged rather than thrown: the worker falls back to
 * `/api/internal/resolve` on a KV miss, so a temporarily stale namespace is recoverable.
 */
async function writeBulk(entries: BulkEntry[]): Promise<void> {
  if (entries.length === 0) {
    return;
  }
  if (!features().cloudflare) {
    console.info(`[kv:dev] would write ${entries.map((entry) => entry.key).join(", ")}`);
    return;
  }

  try {
    const response = await fetch(namespaceUrl("/bulk"), {
      method: "PUT",
      headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify(entries),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.error("KV bulk write failed", error);
  }
}

async function deleteKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  if (!features().cloudflare) {
    console.info(`[kv:dev] would delete ${keys.join(", ")}`);
    return;
  }

  try {
    const response = await fetch(namespaceUrl("/bulk/delete"), {
      method: "POST",
      headers: { ...authHeaders(), "content-type": "application/json" },
      body: JSON.stringify(keys),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.error("KV bulk delete failed", error);
  }
}

export async function putLinkRecord(record: LinkKvRecord): Promise<void> {
  await putLinkRecords([record]);
}

const LINK_WRITE_CHUNK = 500;

export async function putLinkRecords(records: LinkKvRecord[]): Promise<void> {
  for (let index = 0; index < records.length; index += LINK_WRITE_CHUNK) {
    const slice = records.slice(index, index + LINK_WRITE_CHUNK);
    await writeBulk(
      slice.map((record) => ({
        key: linkKey(record.hostname, record.slug),
        value: JSON.stringify(record),
      })),
    );
  }
}

export async function deleteLinkRecord(hostname: string, slug: string): Promise<void> {
  await deleteKeys([linkKey(hostname, slug)]);
}

export async function putDomainRecord(record: DomainKvRecord): Promise<void> {
  await writeBulk([{ key: domainKey(record.hostname), value: JSON.stringify(record) }]);
}

export async function deleteDomainRecord(hostname: string): Promise<void> {
  await deleteKeys([domainKey(hostname)]);
}

export async function putBiopageRecord(
  hostname: string,
  record: BiopageKvRecord,
): Promise<void> {
  await writeBulk([
    { key: biopageKey(hostname, record.handle), value: JSON.stringify(record) },
  ]);
}

export async function deleteBiopageRecord(hostname: string, handle: string): Promise<void> {
  await deleteKeys([biopageKey(hostname, handle)]);
}

/** Used when a slug or handle changes: the old key must go before the new one lands. */
export async function replaceLinkRecord(
  previous: { hostname: string; slug: string },
  record: LinkKvRecord,
): Promise<void> {
  if (previous.hostname !== record.hostname || previous.slug !== record.slug) {
    await deleteLinkRecord(previous.hostname, previous.slug);
  }
  await putLinkRecord(record);
}
