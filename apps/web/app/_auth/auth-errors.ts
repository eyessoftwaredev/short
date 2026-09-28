/**
 * Better Auth answers with English messages and stable codes. The codes are
 * mapped to localized, actionable copy here; anything unknown falls back to the
 * server message, then to the screen's generic failure line.
 */

type AuthErrorLike = {
  code?: string | null;
  message?: string | null;
  status?: number;
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

const CODE_TO_KEY: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "errInvalidCredentials",
  INVALID_PASSWORD: "errInvalidCredentials",
  BANNED_USER: "errBanned",
  USER_ALREADY_EXISTS: "errUserExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "errUserExists",
  INVALID_EMAIL: "errInvalidEmail",
  PASSWORD_TOO_LONG: "errPasswordTooLong",
  INVALID_TOKEN: "errResetToken",
  TOKEN_EXPIRED: "errResetToken",
  INVALID_CODE: "twoFactorFailed",
  INVALID_BACKUP_CODE: "twoFactorFailed",
  INVALID_TWO_FACTOR_COOKIE: "errTwoFactorExpired",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "errRateLimited",
};

export function authErrorMessage(
  error: AuthErrorLike,
  t: Translate,
  fallback: string,
  options: { minPassword?: number } = {},
): string {
  const code = (error.code ?? "").toUpperCase();
  if (code === "PASSWORD_TOO_SHORT") {
    return t("passwordMin", { min: options.minPassword ?? 10 });
  }
  const key = CODE_TO_KEY[code];
  if (key) {
    return t(key);
  }
  if (error.status === 429) {
    return t("errRateLimited");
  }
  const message = (error.message ?? "").trim();
  return message === "" ? fallback : message;
}
