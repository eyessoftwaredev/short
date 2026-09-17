import { serverEnv } from "@/lib/env";
import { openApiDocument } from "@/app/api/v1/[[...route]]/openapi";

export default function DocsPage() {
  const spec = openApiDocument(`${serverEnv().APP_URL.replace(/\/$/, "")}/api/v1`);
  const paths = spec.paths as Record<string, Record<string, { summary?: string }>>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Short API</h1>
        <p className="m-0 text-fg-muted">
          Authenticate with <code>x-api-key</code>. Spec:{" "}
          <a href="/api/v1/openapi.json">/api/v1/openapi.json</a>
        </p>
      </header>
      <div className="flex flex-col gap-4">
        {Object.entries(paths).map(([path, methods]) => (
          <section key={path} className="rounded-default border border-border p-4">
            <h2 className="font-mono text-base">{path}</h2>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {Object.entries(methods).map(([method, op]) => (
                <li key={method} className="flex gap-3 font-mono text-sm">
                  <span className="w-16 uppercase text-fg-subtle">{method}</span>
                  <span>{op.summary ?? ""}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
