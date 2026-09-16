import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/locales";
import { getPlatformBrand } from "./brand";
import { serverEnv } from "./env";

export type EmailCopy = {
  verifySubject: string;
  verifyHeading: string;
  verifyBody: string;
  verifyCta: string;
  verifyFootnote: string;
  resetSubject: string;
  resetHeading: string;
  resetBody: string;
  resetCta: string;
  resetFootnote: string;
  inviteSubject: string;
  inviteHeading: string;
  inviteBody: string;
  inviteCta: string;
  pasteHint: string;
};

const EN: EmailCopy = {
  verifySubject: "Confirm your email",
  verifyHeading: "Confirm your email",
  verifyBody: "Click the button below to verify your address and finish setting up your workspace.",
  verifyCta: "Verify email",
  verifyFootnote: "This link expires in 1 hour.",
  resetSubject: "Reset your password",
  resetHeading: "Reset your password",
  resetBody: "We received a request to reset your password. If it wasn't you, you can ignore this email.",
  resetCta: "Choose a new password",
  resetFootnote: "This link expires in 1 hour.",
  inviteSubject: "Join {workspace} on {brand}",
  inviteHeading: "Join {workspace}",
  inviteBody: "{inviter} invited you to collaborate on the {workspace} workspace.",
  inviteCta: "Accept invitation",
  pasteHint: "Or paste this link into your browser:",
};

const TR: EmailCopy = {
  verifySubject: "E-postanı doğrula",
  verifyHeading: "E-postanı doğrula",
  verifyBody: "Adresini doğrulamak ve çalışma alanını açmak için aşağıdaki düğmeye tıkla.",
  verifyCta: "E-postayı doğrula",
  verifyFootnote: "Bu link 1 saat sonra geçersiz olur.",
  resetSubject: "Parolanı sıfırla",
  resetHeading: "Parolanı sıfırla",
  resetBody: "Parola sıfırlama isteği aldık. Bu sen değilsen bu e-postayı yok say.",
  resetCta: "Yeni parola seç",
  resetFootnote: "Bu link 1 saat sonra geçersiz olur.",
  inviteSubject: "{brand} üzerinde {workspace} çalışma alanına katıl",
  inviteHeading: "{workspace} çalışma alanına katıl",
  inviteBody: "{inviter} seni {workspace} çalışma alanında işbirliğine davet etti.",
  inviteCta: "Daveti kabul et",
  pasteHint: "Veya bu linki tarayıcına yapıştır:",
};

function apply(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

export async function resolveEmailLocale(): Promise<Locale> {
  try {
    const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(stored)) {
      return stored;
    }
  } catch {
    /* auth callbacks can run without a request cookie store */
  }
  try {
    const brand = await getPlatformBrand();
    return brand.defaultLocale === "tr" ? "tr" : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function getEmailCopy(locale: Locale): EmailCopy {
  return locale === "tr" ? TR : EN;
}

export function interpolateEmail(template: string, vars: Record<string, string>): string {
  return apply(template, vars);
}

export async function loadBrandEmailContext(): Promise<{
  brandName: string;
  logoUrl: string;
  copy: EmailCopy;
  locale: Locale;
}> {
  const [brand, locale] = await Promise.all([getPlatformBrand(), resolveEmailLocale()]);
  const appUrl = serverEnv().APP_URL.replace(/\/$/, "");
  return {
    brandName: brand.name,
    logoUrl: `${appUrl}/api/brand/logo`,
    copy: getEmailCopy(locale),
    locale,
  };
}
