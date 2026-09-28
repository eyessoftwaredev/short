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
  brokenSubjectOne: string;
  brokenSubjectMany: string;
  brokenHeading: string;
  brokenBody: string;
  brokenCta: string;
  brokenFootnote: string;
  brokenMore: string;
  brokenReasonDns: string;
  brokenReasonTimeout: string;
  brokenReasonNetwork: string;
  brokenReasonHttp: string;
  digestSubject: string;
  digestHeading: string;
  digestIntro: string;
  digestClicks: string;
  digestVisitors: string;
  digestUp: string;
  digestDown: string;
  digestFlat: string;
  digestNew: string;
  digestTopLinks: string;
  digestTopCountries: string;
  digestBrokenOne: string;
  digestBrokenMany: string;
  digestCta: string;
  digestFootnote: string;
  digestUnknownCountry: string;
};

const EN: EmailCopy = {
  verifySubject: "Confirm your email",
  verifyHeading: "Confirm your email",
  verifyBody: "Click the button below to verify your address and finish setting up your account.",
  verifyCta: "Verify email",
  verifyFootnote: "This link expires in 1 hour.",
  resetSubject: "Reset your password",
  resetHeading: "Reset your password",
  resetBody: "We received a request to reset your password. If it wasn't you, you can ignore this email.",
  resetCta: "Choose a new password",
  resetFootnote: "This link expires in 1 hour.",
  inviteSubject: "Join {workspace} on {brand}",
  inviteHeading: "Join {workspace}",
  inviteBody: "{inviter} invited you to join the {workspace} team.",
  inviteCta: "Accept invitation",
  pasteHint: "Or paste this link into your browser:",
  brokenSubjectOne: "A link in {workspace} stopped working",
  brokenSubjectMany: "{count} links in {workspace} stopped working",
  brokenHeading: "Some destinations are not responding",
  brokenBody:
    "We checked where your short links point, twice in a row, and these destinations did not answer. Visitors who follow them may land on an error page.",
  brokenCta: "Review broken links",
  brokenFootnote: "You get this email because link health alerts are on for {workspace}. You can turn them off in Settings.",
  brokenMore: "…and {count} more",
  brokenReasonDns: "domain not found",
  brokenReasonTimeout: "timed out",
  brokenReasonNetwork: "connection failed",
  brokenReasonHttp: "HTTP {code}",
  digestSubject: "{workspace}: {clicks} clicks last week",
  digestHeading: "Your week in {workspace}",
  digestIntro: "How your links did from {from} to {to}.",
  digestClicks: "Clicks",
  digestVisitors: "Visitors",
  digestUp: "{percent}% more than the week before",
  digestDown: "{percent}% fewer than the week before",
  digestFlat: "Same as the week before",
  digestNew: "No clicks the week before",
  digestTopLinks: "Top links",
  digestTopCountries: "Top countries",
  digestBrokenOne: "1 link stopped working last week.",
  digestBrokenMany: "{count} links stopped working last week.",
  digestCta: "Open dashboard",
  digestFootnote: "You get this summary because the weekly digest is on for {workspace}. You can turn it off in Settings.",
  digestUnknownCountry: "Unknown",
};

const TR: EmailCopy = {
  verifySubject: "E-postanı doğrula",
  verifyHeading: "E-postanı doğrula",
  verifyBody: "Adresini doğrulamak ve hesabını açmak için aşağıdaki düğmeye tıkla.",
  verifyCta: "E-postayı doğrula",
  verifyFootnote: "Bu link 1 saat sonra geçersiz olur.",
  resetSubject: "Parolanı sıfırla",
  resetHeading: "Parolanı sıfırla",
  resetBody: "Parola sıfırlama isteği aldık. Bu sen değilsen bu e-postayı yok say.",
  resetCta: "Yeni parola seç",
  resetFootnote: "Bu link 1 saat sonra geçersiz olur.",
  inviteSubject: "{brand} üzerinde {workspace} takımına katıl",
  inviteHeading: "{workspace} takımına katıl",
  inviteBody: "{inviter} seni {workspace} takımına davet etti.",
  inviteCta: "Daveti kabul et",
  pasteHint: "Veya bu linki tarayıcına yapıştır:",
  brokenSubjectOne: "{workspace} içindeki bir link çalışmıyor",
  brokenSubjectMany: "{workspace} içinde {count} link çalışmıyor",
  brokenHeading: "Bazı hedefler yanıt vermiyor",
  brokenBody:
    "Kısa linklerinin yönlendirdiği adresleri üst üste iki kez kontrol ettik ve bu hedefler yanıt vermedi. Bu linkleri açan ziyaretçiler bir hata sayfasıyla karşılaşabilir.",
  brokenCta: "Bozuk linkleri incele",
  brokenFootnote: "{workspace} için link sağlığı uyarıları açık olduğu için bu e-postayı aldın. Ayarlar'dan kapatabilirsin.",
  brokenMore: "…ve {count} tane daha",
  brokenReasonDns: "alan adı bulunamadı",
  brokenReasonTimeout: "zaman aşımı",
  brokenReasonNetwork: "bağlantı kurulamadı",
  brokenReasonHttp: "HTTP {code}",
  digestSubject: "{workspace}: geçen hafta {clicks} tıklama",
  digestHeading: "{workspace} haftalık özeti",
  digestIntro: "{from} – {to} arasında linklerinin performansı.",
  digestClicks: "Tıklama",
  digestVisitors: "Ziyaretçi",
  digestUp: "Önceki haftaya göre %{percent} fazla",
  digestDown: "Önceki haftaya göre %{percent} az",
  digestFlat: "Önceki haftayla aynı",
  digestNew: "Önceki hafta hiç tıklama yoktu",
  digestTopLinks: "En çok tıklanan linkler",
  digestTopCountries: "En çok tıklanan ülkeler",
  digestBrokenOne: "Geçen hafta 1 link çalışmayı durdurdu.",
  digestBrokenMany: "Geçen hafta {count} link çalışmayı durdurdu.",
  digestCta: "Panele git",
  digestFootnote: "{workspace} için haftalık özet açık olduğu için bu e-postayı aldın. Ayarlar'dan kapatabilirsin.",
  digestUnknownCountry: "Bilinmiyor",
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
