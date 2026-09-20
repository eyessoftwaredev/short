import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { openApiDocument } from "@/app/api/v1/[[...route]]/openapi";
import { DocsPageShell } from "@/components/docs/docs-page-shell";
import {
  DocsCallout,
  DocsCodeBlock,
  DocsEndpoint,
  DocsHero,
  DocsProse,
  DocsTable,
} from "@/components/docs/docs-ui";
import { serverEnv } from "@/lib/env";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.api");
  return { title: t("metaTitle") };
}

export default async function ApiDocsPage() {
  const t = await getTranslations("docs.api");
  const apiBase = `${serverEnv().APP_URL.replace(/\/$/, "")}/api/v1`;
  const spec = openApiDocument(apiBase);
  const paths = spec.paths as Record<string, Record<string, { summary?: string; tags?: string[] }>>;
  const tags = (spec.tags as { name: string }[] | undefined) ?? [];

  const curlExample = `curl ${apiBase}/links \\
  -H "Authorization: Bearer short_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "domainId": "YOUR_DOMAIN_UUID",
    "destination": "https://acme.com/launch",
    "slug": "launch",
    "title": "Product launch"
  }'`;

  const grouped = tags.map((tag) => ({
    name: tag.name,
    endpoints: Object.entries(paths).flatMap(([path, methods]) =>
      Object.entries(methods).map(([method, op]) => ({
        path,
        method,
        summary: op.summary ?? "",
        tags: op.tags ?? [],
      })),
    ).filter((entry) => entry.tags.includes(tag.name)),
  }));

  return (
    <DocsPageShell section="api">
      <div className="flex flex-col gap-10">
        <DocsHero title={t("title")} description={t("description")} />

        <DocsProse>
          <h2>{t("authTitle")}</h2>
          <p>{t("authBody")}</p>
        </DocsProse>

        <DocsTable
          headers={[t("authTable.header"), t("authTable.value")]}
          rows={[
            [t("authTable.keyHeader"), "x-api-key: short_live_…"],
            [t("authTable.bearerHeader"), "Authorization: Bearer short_live_…"],
            [t("authTable.scope"), t("authTable.scopeValue")],
          ]}
        />

        <DocsCallout title={t("keysTitle")}>
          <p>
            {t("keysBody")}{" "}
            <Link href="/settings" className="text-accent hover:underline">
              {t("keysLink")}
            </Link>
          </p>
        </DocsCallout>

        <DocsProse>
          <h2>{t("baseTitle")}</h2>
          <p>{t("baseBody")}</p>
        </DocsProse>

        <DocsCodeBlock code={apiBase} language="url" />

        <DocsProse>
          <h2>{t("exampleTitle")}</h2>
          <p>{t("exampleBody")}</p>
        </DocsProse>

        <DocsCodeBlock code={curlExample} language="bash" />

        <DocsProse>
          <h2>{t("errorsTitle")}</h2>
          <p>{t("errorsBody")}</p>
        </DocsProse>

        <DocsTable
          headers={[t("errorsTable.code"), t("errorsTable.meaning")]}
          rows={[
            ["missing_api_key", t("errorsTable.rows.missing")],
            ["invalid_api_key", t("errorsTable.rows.invalid")],
            ["plan_required", t("errorsTable.rows.plan")],
            ["rate_limited", t("errorsTable.rows.rate")],
            ["validation_failed", t("errorsTable.rows.validation")],
          ]}
        />

        <DocsProse>
          <h2>{t("referenceTitle")}</h2>
          <p>
            {t("referenceBody")}{" "}
            <a href={`${apiBase}/openapi.json`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              openapi.json
            </a>
          </p>
        </DocsProse>

        <div className="flex flex-col gap-8">
          {grouped.map((group) =>
            group.endpoints.length > 0 ? (
              <section key={group.name} className="flex flex-col gap-4">
                <h3 className="m-0 text-base font-semibold text-ink">{group.name}</h3>
                <div className="flex flex-col gap-3">
                  {group.endpoints.map((endpoint) => (
                    <DocsEndpoint
                      key={`${endpoint.method}-${endpoint.path}`}
                      method={endpoint.method}
                      path={endpoint.path}
                      summary={endpoint.summary}
                    />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      </div>
    </DocsPageShell>
  );
}
