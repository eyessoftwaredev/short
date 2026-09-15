/**
 * Plain-HTML transactional templates. Email clients do not support CSS variables, so the
 * palette from `app/globals.css` is inlined here as literal hex values on purpose.
 */

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
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footnote?: string;
};

function layout({ heading, body, ctaLabel, ctaUrl, footnote }: LayoutOptions): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:32px 16px;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e3e8ee;border-radius:8px;">
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#171717;letter-spacing:-0.01em;">${esc(heading)}</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#525252;">${esc(body)}</p>
      <a href="${esc(ctaUrl)}" style="display:inline-block;padding:10px 20px;background:#0f766e;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;border-radius:8px;">${esc(ctaLabel)}</a>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#737373;word-break:break-all;">
        Or paste this link into your browser:<br />${esc(ctaUrl)}
      </p>
      ${footnote ? `<p style="margin:16px 0 0;font-size:12px;color:#737373;">${esc(footnote)}</p>` : ""}
    </td></tr>
  </table>
</body>
</html>`;
}

export function verifyEmailTemplate(url: string): { html: string; text: string } {
  return {
    html: layout({
      heading: "Confirm your email",
      body: "Click the button below to verify your address and finish setting up your workspace.",
      ctaLabel: "Verify email",
      ctaUrl: url,
      footnote: "This link expires in 1 hour.",
    }),
    text: `Confirm your email: ${url}`,
  };
}

export function resetPasswordTemplate(url: string): { html: string; text: string } {
  return {
    html: layout({
      heading: "Reset your password",
      body: "We received a request to reset your password. If it wasn't you, you can ignore this email.",
      ctaLabel: "Choose a new password",
      ctaUrl: url,
      footnote: "This link expires in 1 hour.",
    }),
    text: `Reset your password: ${url}`,
  };
}

export function invitationTemplate(options: {
  url: string;
  workspaceName: string;
  inviterName: string;
}): { html: string; text: string } {
  return {
    html: layout({
      heading: `Join ${options.workspaceName}`,
      body: `${options.inviterName} invited you to collaborate on the ${options.workspaceName} workspace.`,
      ctaLabel: "Accept invitation",
      ctaUrl: options.url,
      footnote: "This invitation expires in 48 hours.",
    }),
    text: `${options.inviterName} invited you to ${options.workspaceName}: ${options.url}`,
  };
}
