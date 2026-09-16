export type DnsCheckStatus = "ok" | "waiting" | "mismatch";

export type DnsRecordCheck = {
  type: "CNAME" | "TXT";
  name: string;
  expected: string;
  found: string[];
  status: DnsCheckStatus;
};

export type DnsProbe = {
  records: DnsRecordCheck[];
  ready: boolean;
};

type DohAnswer = { name: string; type: number; data: string };
type DohResponse = { Status: number; Answer?: DohAnswer[] };

const DOH = "https://cloudflare-dns.com/dns-query";
const TYPE_CNAME = 5;
const TYPE_TXT = 16;

function normalizeHost(value: string): string {
  return value.trim().replace(/\.$/, "").toLowerCase();
}

function normalizeTxt(value: string): string {
  return value.trim().replace(/^"+|"+$/g, "");
}

async function lookup(name: string, type: "CNAME" | "TXT"): Promise<string[]> {
  const url = new URL(DOH);
  url.searchParams.set("name", name);
  url.searchParams.set("type", type);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return [];
    }
    const body = (await response.json()) as DohResponse;
    const want = type === "CNAME" ? TYPE_CNAME : TYPE_TXT;
    return (body.Answer ?? [])
      .filter((answer) => answer.type === want)
      .map((answer) => (type === "TXT" ? normalizeTxt(answer.data) : normalizeHost(answer.data)));
  } catch {
    return [];
  }
}

function statusFor(found: string[], expected: string, kind: "CNAME" | "TXT"): DnsCheckStatus {
  if (found.length === 0) {
    return "waiting";
  }
  if (kind === "CNAME") {
    return found.some((value) => value === normalizeHost(expected)) ? "ok" : "mismatch";
  }
  return found.includes(expected) ? "ok" : "mismatch";
}

/** Public-DNS view of the CNAME + SSL TXT records the customer still owes us. */
export async function probeDomainDns(
  hostname: string,
  validation: Array<{ type: string; name: string; value: string }>,
  target: string,
): Promise<DnsProbe> {
  const records: DnsRecordCheck[] = [];

  const cnameFound = await lookup(hostname, "CNAME");
  records.push({
    type: "CNAME",
    name: hostname,
    expected: normalizeHost(target),
    found: cnameFound,
    status: statusFor(cnameFound, target, "CNAME"),
  });

  for (const record of validation) {
    if (record.type !== "TXT") {
      continue;
    }
    const found = await lookup(record.name, "TXT");
    records.push({
      type: "TXT",
      name: record.name,
      expected: record.value,
      found,
      status: statusFor(found, record.value, "TXT"),
    });
  }

  return { records, ready: records.every((record) => record.status === "ok") };
}
