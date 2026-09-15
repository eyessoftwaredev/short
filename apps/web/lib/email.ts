import { Resend } from "resend";
import { features, serverEnv } from "./env";

let client: Resend | null = null;

function resend(): Resend {
  if (!client) {
    const key = serverEnv().RESEND_API_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    client = new Resend(key);
  }
  return client;
}

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Sends transactional mail. When Resend is not configured the message is logged instead,
 * so local development works without an API key and sign-up links stay visible.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!features().email) {
    console.info(`[email:dev] to=${payload.to} subject=${payload.subject}\n${payload.text ?? payload.html}`);
    return;
  }

  try {
    const { error } = await resend().emails.send({
      from: serverEnv().EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    // Mail delivery must not break sign-up; the user can request another link.
    console.error("sendEmail failed", error);
  }
}
