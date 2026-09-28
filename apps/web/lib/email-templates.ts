/**
 * Plain-HTML transactional templates. Email clients do not support CSS variables, so the
 * palette from `app/globals.css` is inlined here as literal hex values on purpose.
 */

import type { EmailCopy } from "./email-copy";

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char] ?? char);
}

type LayoutOptions = {
  brandName: string;
  logoUrl: string;
  heading: string;
  body: string;
  /** Trusted markup built by this module from escaped values, placed above the CTA. */
  extraHtml?: string;
  ctaLabel: string;
  ctaUrl: string;
  footnote?: string;
  pasteHint: string;
};

function layout({
  brandName,
  logoUrl,
  heading,
  body,
  extraHtml,
  ctaLabel,
  ctaUrl,
  footnote,
  pasteHint,
}: LayoutOptions): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:32px 16px;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e3e8ee;border-radius:8px;">
    <tr><td style="padding:32px;">
      <img src="${esc(logoUrl)}" alt="${esc(brandName)}" width="36" height="36" style="display:block;margin:0 0 20px;border-radius:8px;" />
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#171717;letter-spacing:-0.01em;">${esc(heading)}</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#525252;">${esc(body)}</p>
      ${extraHtml ?? ""}
      <a href="${esc(ctaUrl)}" style="display:inline-block;padding:10px 20px;background:#0f766e;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;">${esc(ctaLabel)}</a>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#737373;word-break:break-all;">
        ${esc(pasteHint)}<br />${esc(ctaUrl)}
      </p>
      ${footnote ? `<p style="margin:16px 0 0;font-size:12px;color:#737373;">${esc(footnote)}</p>` : ""}
      <p style="margin:24px 0 0;font-size:12px;color:#a3a3a3;">${esc(brandName)}</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export type BrandEmailContext = {
  brandName: string;
  logoUrl: string;
  copy: EmailCopy;
};

export function verifyEmailTemplate(url: string, ctx: BrandEmailContext): { html: string; text: string } {
  return {
    html: layout({
      brandName: ctx.brandName,
      logoUrl: ctx.logoUrl,
      heading: ctx.copy.verifyHeading,
      body: ctx.copy.verifyBody,
      ctaLabel: ctx.copy.verifyCta,
      ctaUrl: url,
      footnote: ctx.copy.verifyFootnote,
      pasteHint: ctx.copy.pasteHint,
    }),
    text: `${ctx.copy.verifyHeading}: ${url}`,
  };
}

export function resetPasswordTemplate(url: string, ctx: BrandEmailContext): { html: string; text: string } {
  return {
    html: layout({
      brandName: ctx.brandName,
      logoUrl: ctx.logoUrl,
      heading: ctx.copy.resetHeading,
      body: ctx.copy.resetBody,
      ctaLabel: ctx.copy.resetCta,
      ctaUrl: url,
      footnote: ctx.copy.resetFootnote,
      pasteHint: ctx.copy.pasteHint,
    }),
    text: `${ctx.copy.resetHeading}: ${url}`,
  };
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

const SECTION_TITLE =
  "margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#737373;";
const ROW_CELL = "padding:8px 0;border-top:1px solid #eef1f4;font-size:13px;line-height:1.4;color:#171717;";

/** Label/value rows as a table; every value is escaped here. */
function rowsTable(rows: { label: string; hint?: string; value: string }[]): string {
  const body = rows
    .map(
      (row) => `<tr>
        <td style="${ROW_CELL}word-break:break-all;">${esc(row.label)}${
          row.hint ? `<br /><span style="font-size:12px;color:#737373;">${esc(row.hint)}</span>` : ""
        }</td>
        <td style="${ROW_CELL}text-align:right;white-space:nowrap;padding-left:12px;font-variant-numeric:tabular-nums;">${esc(row.value)}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;">${body}</table>`;
}

export type BrokenLinkEmailItem = {
  shortUrl: string;
  destination: string;
  /** Already localised cause, e.g. "HTTP 404" or "timed out". */
  reason: string;
};

/** Up to this many links are listed; the rest are summarised as "…and N more". */
const BROKEN_EMAIL_MAX_ROWS = 10;

export function brokenLinksEmailTemplate(options: {
  workspaceName: string;
  links: BrokenLinkEmailItem[];
  ctaUrl: string;
  ctx: BrandEmailContext;
}): { subject: string; html: string; text: string } {
  const { ctx } = options;
  const count = options.links.length;
  const vars = { workspace: options.workspaceName, count };
  const subject = fill(count === 1 ? ctx.copy.brokenSubjectOne : ctx.copy.brokenSubjectMany, vars);
  const shown = options.links.slice(0, BROKEN_EMAIL_MAX_ROWS);
  const more = count - shown.length;

  const extraHtml = `${rowsTable(
    shown.map((link) => ({ label: link.shortUrl, hint: link.destination, value: link.reason })),
  )}${
    more > 0
      ? `<p style="margin:-12px 0 24px;font-size:13px;color:#737373;">${esc(fill(ctx.copy.brokenMore, { count: more }))}</p>`
      : ""
  }`;

  return {
    subject,
    html: layout({
      brandName: ctx.brandName,
      logoUrl: ctx.logoUrl,
      heading: ctx.copy.brokenHeading,
      body: ctx.copy.brokenBody,
      extraHtml,
      ctaLabel: ctx.copy.brokenCta,
      ctaUrl: options.ctaUrl,
      footnote: fill(ctx.copy.brokenFootnote, vars),
      pasteHint: ctx.copy.pasteHint,
    }),
    text: [
      subject,
      "",
      ...shown.map((link) => `- ${link.shortUrl} -> ${link.destination} (${link.reason})`),
      more > 0 ? fill(ctx.copy.brokenMore, { count: more }) : "",
      "",
      `${ctx.copy.brokenCta}: ${options.ctaUrl}`,
    ]
      .filter((line, index, all) => line !== "" || all[index - 1] !== "")
      .join("\n"),
  };
}

export type DigestEmailData = {
  workspaceName: string;
  /** Localised, e.g. "22 Sep" and "28 Sep 2026". */
  fromLabel: string;
  toLabel: string;
  clicks: string;
  visitors: string;
  /** Already localised comparison line ("12% more than the week before"). */
  change: string;
  topLinks: { label: string; hint: string | null; clicks: string }[];
  topCountries: { label: string; clicks: string }[];
  newlyBroken: number;
  ctaUrl: string;
};

export function digestEmailTemplate(
  data: DigestEmailData,
  ctx: BrandEmailContext,
): { subject: string; html: string; text: string } {
  const vars = { workspace: data.workspaceName, clicks: data.clicks, from: data.fromLabel, to: data.toLabel };
  const subject = fill(ctx.copy.digestSubject, vars);
  const brokenLine =
    data.newlyBroken === 0
      ? ""
      : fill(data.newlyBroken === 1 ? ctx.copy.digestBrokenOne : ctx.copy.digestBrokenMany, {
          count: data.newlyBroken,
        });

  const stat = (label: string, value: string) => `<td width="50%" style="padding:0 8px 0 0;vertical-align:top;">
      <p style="margin:0;font-size:12px;color:#737373;">${esc(label)}</p>
      <p style="margin:2px 0 0;font-size:24px;font-weight:600;color:#171717;font-variant-numeric:tabular-nums;">${esc(value)}</p>
    </td>`;

  const extraHtml = [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr>${stat(
      ctx.copy.digestClicks,
      data.clicks,
    )}${stat(ctx.copy.digestVisitors, data.visitors)}</tr></table>`,
    `<p style="margin:0 0 24px;font-size:13px;color:#525252;">${esc(data.change)}</p>`,
    data.topLinks.length > 0
      ? `<p style="${SECTION_TITLE}">${esc(ctx.copy.digestTopLinks)}</p>${rowsTable(
          data.topLinks.map((row) => ({ label: row.label, hint: row.hint ?? undefined, value: row.clicks })),
        )}`
      : "",
    data.topCountries.length > 0
      ? `<p style="${SECTION_TITLE}">${esc(ctx.copy.digestTopCountries)}</p>${rowsTable(
          data.topCountries.map((row) => ({ label: row.label, value: row.clicks })),
        )}`
      : "",
    brokenLine
      ? `<p style="margin:0 0 24px;padding:10px 12px;font-size:13px;color:#b42318;background:#fef3f2;border-radius:8px;">${esc(brokenLine)}</p>`
      : "",
  ].join("");

  return {
    subject,
    html: layout({
      brandName: ctx.brandName,
      logoUrl: ctx.logoUrl,
      heading: fill(ctx.copy.digestHeading, vars),
      body: fill(ctx.copy.digestIntro, vars),
      extraHtml,
      ctaLabel: ctx.copy.digestCta,
      ctaUrl: data.ctaUrl,
      footnote: fill(ctx.copy.digestFootnote, vars),
      pasteHint: ctx.copy.pasteHint,
    }),
    text: [
      subject,
      fill(ctx.copy.digestIntro, vars),
      `${ctx.copy.digestClicks}: ${data.clicks} (${data.change})`,
      `${ctx.copy.digestVisitors}: ${data.visitors}`,
      ...(data.topLinks.length > 0
        ? ["", `${ctx.copy.digestTopLinks}:`, ...data.topLinks.map((row) => `- ${row.label}: ${row.clicks}`)]
        : []),
      ...(data.topCountries.length > 0
        ? ["", `${ctx.copy.digestTopCountries}:`, ...data.topCountries.map((row) => `- ${row.label}: ${row.clicks}`)]
        : []),
      ...(brokenLine ? ["", brokenLine] : []),
      "",
      `${ctx.copy.digestCta}: ${data.ctaUrl}`,
    ].join("\n"),
  };
}

export function invitationTemplate(options: {
  url: string;
  workspaceName: string;
  inviterName: string;
  ctx: BrandEmailContext;
}): { html: string; text: string } {
  const { ctx } = options;
  const vars = { workspace: options.workspaceName, inviter: options.inviterName, brand: ctx.brandName };
  const heading = ctx.copy.inviteHeading.replace(/\{(\w+)\}/g, (_, key: string) => vars[key as keyof typeof vars] ?? "");
  const body = ctx.copy.inviteBody.replace(/\{(\w+)\}/g, (_, key: string) => vars[key as keyof typeof vars] ?? "");
  return {
    html: layout({
      brandName: ctx.brandName,
      logoUrl: ctx.logoUrl,
      heading,
      body,
      ctaLabel: ctx.copy.inviteCta,
      ctaUrl: options.url,
      pasteHint: ctx.copy.pasteHint,
    }),
    text: `${body} ${options.url}`,
  };
}
