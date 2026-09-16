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
const TYPE_A = 1;
const TYPE_AAAA = 28;
const TYPE_CNAME = 5;
const TYPE_TXT = 16;

function normalizeHost(value: string): string {
  return value.trim().replace(/\.$/, "").toLowerCase();
}

function normalizeTxt(value: string): string {
  return value.trim().replace(/^"+|"+$/g, "");
}

async function lookup(name: string, type: "CNAME" | "TXT" | "A" | "AAAA"): Promise<string[]> {
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
    const want = type === "CNAME" ? TYPE_CNAME : type === "TXT" ? TYPE_TXT : type === "A" ? TYPE_A : TYPE_AAAA;
    return (body.Answer ?? [])
      .filter((answer) => answer.type === want)
      .map((answer) => (type === "TXT" ? normalizeTxt(answer.data) : type === "CNAME" ? normalizeHost(answer.data) : answer.data));
  } catch {
    return [];
  }
}

async function lookupAddresses(name: string): Promise<string[]> {
  const [a, aaaa] = await Promise.all([lookup(name, "A"), lookup(name, "AAAA")]);
  return [...a, ...aaaa];
}

function sharesAddress(left: string[], right: string[]): boolean {
  return left.some((value) => right.includes(value));
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

async function probeCname(hostname: string, target: string): Promise<DnsRecordCheck> {
  const expected = normalizeHost(target);
  const cnameFound = await lookup(hostname, "CNAME");
  if (cnameFound.some((value) => value === expected)) {
    return { type: "CNAME", name: hostname, expected, found: cnameFound, status: "ok" };
  }

  // Apex CNAME is flattened to A/AAAA. Same addresses as the target means the record is live.
  const [hostIps, targetIps] = await Promise.all([lookupAddresses(hostname), lookupAddresses(expected)]);
  if (hostIps.length > 0 && targetIps.length > 0 && sharesAddress(hostIps, targetIps)) {
    return { type: "CNAME", name: hostname, expected, found: cnameFound.length > 0 ? cnameFound : [expected], status: "ok" };
  }

  if (cnameFound.length > 0) {
    return { type: "CNAME", name: hostname, expected, found: cnameFound, status: "mismatch" };
  }

  return { type: "CNAME", name: hostname, expected, found: [], status: "waiting" };
}

/** Public-DNS view of the CNAME + SSL TXT records the customer still owes us. */
export async function probeDomainDns(
  hostname: string,
  validation: Array<{ type: string; name: string; value: string }>,
  target: string,
): Promise<DnsProbe> {
  const records: DnsRecordCheck[] = [];

  records.push(await probeCname(hostname, target));

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
