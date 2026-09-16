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
