import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { openApiDocument } from "@/app/api/v1/[[...route]]/openapi";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import {
  DocsCallout,
  DocsCodeBlock,
  DocsEndpoint,
  DocsEndpointList,
  DocsHero,
  DocsProse,
  DocsSection,
  DocsTable,
} from "@/components/docs/docs-ui";
import { serverEnv } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.api");
  return { title: t("metaTitle") };
}

/** Codes returned by apps/web/app/api/v1 (see route.ts and lib/api-auth.ts). */
const ERROR_ROWS = [
  ["missing_api_key", "401", "missing"],
  ["invalid_api_key", "401", "invalid"],
  ["plan_required", "403", "plan"],
  ["quota_exceeded", "403", "quota"],
  ["no_access", "403", "noAccess"],
  ["validation_failed", "400", "validation"],
  ["invalid_json", "400", "json"],
  ["slug_taken", "409", "slugTaken"],
  ["not_found", "404", "notFound"],
  ["rate_limited", "429", "rate"],
] as const;

export default async function ApiDocsPage() {
  const t = await getTranslations("docs.api");
  const apiBase = `${serverEnv().APP_URL.replace(/\/$/, "")}/api/v1`;
  const spec = openApiDocument(apiBase);
  const paths = spec.paths as Record<string, Record<string, { summary?: string; tags?: string[] }>>;
  const tags = (spec.tags as { name: string }[] | undefined) ?? [];

  const curlExample = `curl ${apiBase}/links \\
  -H "x-api-key: short_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "domainId": "YOUR_DOMAIN_UUID",
    "destination": "https://acme.com/launch",
    "slug": "launch",
    "title": "Product launch"
  }'`;

  const errorExample = `{
  "error": {
    "code": "slug_taken",
    "message": "That slug is already taken on this domain"
  }
}`;

  const grouped = tags.map((tag) => ({
    name: tag.name,
    endpoints: Object.entries(paths)
      .flatMap(([path, methods]) =>
        Object.entries(methods).map(([method, op]) => ({
          path,
          method,
          summary: op.summary ?? "",
          tags: op.tags ?? [],
        })),
      )
      .filter((entry) => entry.tags.includes(tag.name)),
  }));

  return (
    <DocsPageShell section="api">
      <DocsHero icon="code" title={t("title")} description={t("description")} />

      <DocsSection id="auth" title={t("authTitle")}>
        <DocsProse>
          <p>{t("authBody")}</p>
        </DocsProse>
        <DocsTable
          headers={[t("authTable.header"), t("authTable.value")]}
          rows={[
            [t("authTable.keyHeader"), <code key="k" className="font-mono text-[13px] text-ink">x-api-key: short_…</code>],
            [
              t("authTable.bearerHeader"),
              <code key="b" className="font-mono text-[13px] text-ink">
                Authorization: Bearer short_…
              </code>,
            ],
            [t("authTable.scope"), t("authTable.scopeValue")],
          ]}
        />
        <DocsCallout title={t("keysTitle")}>
          <p>
            {t("keysBody")} <Link href="/settings?tab=api">{t("keysLink")}</Link>
          </p>
        </DocsCallout>
      </DocsSection>

      <DocsSection id="base-url" title={t("baseTitle")}>
        <DocsProse>
          <p>{t("baseBody")}</p>
        </DocsProse>
        <DocsCodeBlock code={apiBase} language="url" />
      </DocsSection>

      <DocsSection id="rate-limits" title={t("rateTitle")}>
        <DocsProse>
          <p>{t("rateBody")}</p>
        </DocsProse>
      </DocsSection>

      <DocsSection id="example" title={t("exampleTitle")}>
        <DocsProse>
          <p>{t("exampleBody")}</p>
        </DocsProse>
        <DocsCodeBlock code={curlExample} language="bash" />
      </DocsSection>

      <DocsSection id="errors" title={t("errorsTitle")}>
        <DocsProse>
          <p>{t("errorsBody")}</p>
        </DocsProse>
        <DocsCodeBlock code={errorExample} language="json" />
        <DocsTable
          headers={[t("errorsTable.code"), t("errorsTable.status"), t("errorsTable.meaning")]}
          monoFirst
          rows={ERROR_ROWS.map(([code, status, key]) => [code, status, t(`errorsTable.rows.${key}`)])}
        />
      </DocsSection>

      <DocsSection id="reference" title={t("referenceTitle")}>
        <DocsProse>
          <p>
            {t("referenceBody")}{" "}
            <a href={`${apiBase}/openapi.json`} target="_blank" rel="noreferrer">
              openapi.json
            </a>
          </p>
        </DocsProse>
        <div className="flex flex-col gap-6">
          {grouped.map((group) =>
            group.endpoints.length > 0 ? (
              <div key={group.name} className="flex flex-col gap-2.5">
                <h3 className="m-0 text-[15px] font-semibold text-ink">{group.name}</h3>
                <DocsEndpointList>
                  {group.endpoints.map((endpoint) => (
                    <DocsEndpoint
                      key={`${endpoint.method}-${endpoint.path}`}
                      method={endpoint.method}
                      path={endpoint.path}
                      summary={endpoint.summary}
                    />
                  ))}
                </DocsEndpointList>
              </div>
            ) : null,
          )}
        </div>
      </DocsSection>
    </DocsPageShell>
  );
}
