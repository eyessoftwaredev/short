import type { EmailCopy } from "./email-copy";
import { interpolateEmail, loadBrandEmailContext } from "./email-copy";
import { sendEmail } from "./email";
import { brokenLinksEmailTemplate } from "./email-templates";
import { panelUrl } from "./public-url";
import { getWorkspaceSettings } from "./workspace-settings";
import { getWorkspaceDisplayName, listWorkspaceAlertRecipients } from "./workspace-recipients";

export type BrokenLinkAlert = {
  shortUrl: string;
  destination: string;
  title: string | null;
  statusCode: number | null;
  /** `dns`, `timeout`, `network`, `http_404`, ... from the probe. */
  reason: string | null;
};

function reasonLabel(alert: BrokenLinkAlert, copy: EmailCopy): string {
  if (alert.statusCode != null) {
    return interpolateEmail(copy.brokenReasonHttp, { code: String(alert.statusCode) });
  }
  if (alert.reason === "dns") {
    return copy.brokenReasonDns;
  }
  if (alert.reason === "timeout") {
    return copy.brokenReasonTimeout;
  }
  return copy.brokenReasonNetwork;
}

/**
 * One email per owner/admin listing every link of the workspace that turned broken in
 * this health run. Skipped when the workspace switched health alerts off. Returns the
 * number of emails handed to the mailer.
 */
export async function sendBrokenLinksAlerts(workspaceId: string, alerts: BrokenLinkAlert[]): Promise<number> {
  if (alerts.length === 0) {
    return 0;
  }
  const settings = await getWorkspaceSettings(workspaceId);
  if (!settings.healthAlerts) {
    return 0;
  }
  const recipients = await listWorkspaceAlertRecipients(workspaceId);
  if (recipients.length === 0) {
    return 0;
  }

  const [ctx, workspaceName] = await Promise.all([loadBrandEmailContext(), getWorkspaceDisplayName(workspaceId)]);
  const email = brokenLinksEmailTemplate({
    workspaceName,
    links: alerts.map((alert) => ({
      shortUrl: alert.shortUrl,
      destination: alert.destination,
      reason: reasonLabel(alert, ctx.copy),
    })),
    ctaUrl: panelUrl("/links?health=broken"),
    ctx,
  });

  for (const recipient of recipients) {
    await sendEmail({ to: recipient.email, subject: email.subject, html: email.html, text: email.text });
  }
  return recipients.length;
}
