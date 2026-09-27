import { apiKey } from "@better-auth/api-key";
import { getDb, schema } from "@short/db";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, organization as organizationPlugin, twoFactor } from "better-auth/plugins";
import { defaultAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";
import { cookieDomainFromEnv } from "./cookie-domain";
import { sendEmail } from "./email";
import { interpolateEmail, loadBrandEmailContext } from "./email-copy";
import { invitationTemplate, resetPasswordTemplate, verifyEmailTemplate } from "./email-templates";
import { features, serverEnv } from "./env";
import { inviteProof, isValidInviteProof } from "./secret";
import { getPublicInvite, inviteSeatAvailable, isInviteUsable } from "./team";
import { INVITE_PROOF_HEADER } from "./verify-path";
import { createWorkspace } from "./workspace";

/** Platform-level role stored on `user.role` (the admin plugin's field). */
export const SUPERADMIN_ROLE = "superadmin";

/**
 * The admin plugin only accepts admin roles that exist in its `roles` map, so the
 * platform role is declared here with every default statement except
 * `impersonate-admins`: one superadmin acting as another would launder the audit trail.
 */
const superadminAc = defaultAc.newRole({
  ...defaultStatements,
  user: defaultStatements.user.filter((statement) => statement !== "impersonate-admins"),
});

/**
 * Better Auth endpoints the panel never calls over HTTP. Workspaces, members, invites
 * and API keys go through server actions that enforce plan quotas, the personal
 * workspace rules and the audit log; the raw endpoints would skip all of that.
 * `disabledPaths` only blocks the HTTP router — `auth.api.*` calls keep working.
 */
const SERVER_ONLY_PATHS = [
  "/organization/create",
  "/organization/update",
  "/organization/delete",
  "/organization/invite-member",
  "/organization/cancel-invitation",
  "/organization/remove-member",
  "/organization/update-member-role",
  "/organization/leave",
  "/api-key/create",
  "/api-key/update",
  "/api-key/delete",
  "/api-key/get",
  "/api-key/list",
  "/admin/create-user",
  "/admin/update-user",
  "/admin/set-role",
  "/admin/set-user-password",
  "/admin/ban-user",
  "/admin/unban-user",
  "/admin/impersonate-user",
  "/admin/remove-user",
  "/admin/revoke-user-session",
  "/admin/revoke-user-sessions",
];

/** True when this sign-up came from the emailed invite link, which already proved the inbox. */
async function carriesInviteProof(email: string, request: Request | undefined): Promise<boolean> {
  const raw = request?.headers.get(INVITE_PROOF_HEADER) ?? "";
  const dot = raw.indexOf(".");
  if (dot <= 0) {
    return false;
  }
  const inviteId = raw.slice(0, dot);
  const proof = raw.slice(dot + 1);
  const invite = await getPublicInvite(inviteId);
  if (!invite || !isInviteUsable(invite)) {
    return false;
  }
  if (invite.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return false;
  }
  return isValidInviteProof(invite.id, invite.email, proof);
}

const env = () => serverEnv();

/**
 * Better Auth only treats `baseURL` as set when it is a plain string. A getter is
 * dropped during init, the library then derives the origin from Next's request URL
 * (`http://localhost:3000` even when the panel listens on 3200) and rejects the
 * browser Origin as untrusted.
 */
function addOriginFamily(origins: Set<string>, value: string): void {
  try {
    const url = new URL(value);
    origins.add(url.origin);
    const apex = url.hostname.replace(/^(www|app)\./i, "");
    if (apex === "localhost" || apex.endsWith(".localhost") || !apex.includes(".")) {
      return;
    }
    origins.add(`${url.protocol}//${apex}`);
    origins.add(`${url.protocol}//www.${apex}`);
    origins.add(`${url.protocol}//app.${apex}`);
  } catch {
    // ignore malformed env; serverEnv() will fail the request that actually needs it
  }
}

function trustedAuthOrigins(): string[] {
  // Local dev ports are trusted only outside production; a deployed panel lists its own origins.
  const origins = new Set<string>(
    process.env.NODE_ENV === "production" ? [] : ["http://localhost:3200", "http://127.0.0.1:3200"],
  );
  addOriginFamily(origins, "https://app.short.ky");
  addOriginFamily(origins, "https://app.kisa.ly");
  for (const value of [process.env.APP_URL, process.env.BETTER_AUTH_URL, process.env.SITE_URL]) {
    if (value) {
      addOriginFamily(origins, value);
    }
  }
  return [...origins];
}

const cookieDomain = cookieDomainFromEnv();

export const auth = betterAuth({
  appName: "Short",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: trustedAuthOrigins,
  disabledPaths: SERVER_ONLY_PATHS,
  advanced: {
    // The panel sits behind Cloudflare + Traefik, so X-Forwarded-For carries more than one
    // hop and Better Auth would drop it, putting every visitor in one shared sign-in bucket.
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"],
    },
    ...(cookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: cookieDomain,
          },
        }
      : {}),
  },

  database: drizzleAdapter(getDb(), { provider: "pg", schema }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    // A reset is how someone recovers a hijacked account; it must end the intruder's sessions.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const ctx = await loadBrandEmailContext();
      const template = resetPasswordTemplate(url, ctx);
      await sendEmail({
        to: user.email,
        subject: `${ctx.copy.resetSubject} · ${ctx.brandName}`,
        ...template,
      });
    },
  },

  user: {
    changeEmail: {
      enabled: true,
    },
  },

  account: {
    // Provider access/refresh tokens are encrypted at rest; legacy plaintext rows still read.
    encryptOAuthTokens: true,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, request) => {
      // Only the invite sign-up that already holds the emailed proof skips this mail.
      // A bare pending invite must not: resends and email changes would never arrive.
      if (await carriesInviteProof(user.email, request)) {
        return;
      }
      const ctx = await loadBrandEmailContext();
      const template = verifyEmailTemplate(url, ctx);
      await sendEmail({
        to: user.email,
        subject: `${ctx.copy.verifySubject} · ${ctx.brandName}`,
        ...template,
      });
    },
  },

  socialProviders: features().google
    ? {
        google: {
          clientId: env().GOOGLE_CLIENT_ID ?? "",
          clientSecret: env().GOOGLE_CLIENT_SECRET ?? "",
        },
      }
    : {},

  databaseHooks: {
    user: {
      create: {
        // Every new user gets a personal workspace and a user-scoped subscription so
        // the panel never has to render a "no workspace" state.
        after: async (created) => {
          try {
            await createWorkspace(
              created.id,
              created.name,
              created.email.split("@")[0] ?? "Workspace",
              "personal",
            );
          } catch (error) {
            console.error("failed to create personal workspace", error);
          }
        },
      },
    },
  },

  plugins: [
    organizationPlugin({
      allowUserToCreateOrganization: true,
      organizationLimit: 50,
      creatorRole: "owner",
      membershipLimit: 100,
      invitationExpiresIn: 60 * 60 * 48,
      organizationHooks: {
        // Seats are counted when the invite is sent; a plan downgrade since then must
        // not let the team grow past its current limit.
        beforeAcceptInvitation: async ({ invitation }) => {
          if (!(await inviteSeatAvailable(invitation.id))) {
            throw new APIError("FORBIDDEN", { message: "quota_members" });
          }
        },
      },
      sendInvitationEmail: async (data) => {
        const url = `${env().APP_URL}/invite/${data.id}?t=${inviteProof(data.id, data.email)}`;
        const ctx = await loadBrandEmailContext();
        const template = invitationTemplate({
          url,
          workspaceName: data.organization.name,
          inviterName: data.inviter.user.name || data.inviter.user.email,
          ctx,
        });
        await sendEmail({
          to: data.email,
          subject: interpolateEmail(ctx.copy.inviteSubject, {
            workspace: data.organization.name,
            brand: ctx.brandName,
          }),
          ...template,
        });
      },
    }),
    admin({
      roles: { user: userAc, [SUPERADMIN_ROLE]: superadminAc },
      defaultRole: "user",
      adminRoles: [SUPERADMIN_ROLE],
    }),
    // Keys belong to a workspace rather than a person, so `referenceId` is the
    // organization id and a key keeps working when its creator leaves the team.
    twoFactor({ issuer: "Short" }),
    apiKey({
      references: "organization",
      defaultPrefix: "short_",
      enableMetadata: true,
      rateLimit: { enabled: false },
    }),
    // Must stay last so it can write the Set-Cookie headers produced by other plugins.
    nextCookies(),
  ],
});

export type Auth = typeof auth;
