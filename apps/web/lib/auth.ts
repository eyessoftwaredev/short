import { apiKey } from "@better-auth/api-key";
import { getDb, schema } from "@short/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, organization as organizationPlugin } from "better-auth/plugins";
import { defaultAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";
import { sendEmail } from "./email";
import { invitationTemplate, resetPasswordTemplate, verifyEmailTemplate } from "./email-templates";
import { features, serverEnv } from "./env";
import { createWorkspace } from "./workspace";

/** Platform-level role stored on `user.role` (the admin plugin's field). */
export const SUPERADMIN_ROLE = "superadmin";

/**
 * The admin plugin only accepts admin roles that exist in its `roles` map, so the
 * platform role is declared here with every default statement granted — including
 * `impersonate-admins`, which the built-in `admin` role deliberately leaves out.
 */
const superadminAc = defaultAc.newRole(defaultStatements);

const env = () => serverEnv();

/**
 * Better Auth only treats `baseURL` as set when it is a plain string. A getter is
 * dropped during init, the library then derives the origin from Next's request URL
 * (`http://localhost:3000` even when the panel listens on 3200) and rejects the
 * browser Origin as untrusted.
 */
function trustedAuthOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:3200",
    "http://127.0.0.1:3200",
    "https://app.short.ky",
    "https://www.short.ky",
    "https://short.ky",
  ]);
  for (const value of [process.env.APP_URL, process.env.BETTER_AUTH_URL]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      // ignore malformed env; serverEnv() will fail the request that actually needs it
    }
  }
  return [...origins];
}

export const auth = betterAuth({
  appName: "Short",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: trustedAuthOrigins,

  database: drizzleAdapter(getDb(), { provider: "pg", schema }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    sendResetPassword: async ({ user, url }) => {
      const template = resetPasswordTemplate(url);
      await sendEmail({ to: user.email, subject: "Reset your password", ...template });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const template = verifyEmailTemplate(url);
      await sendEmail({ to: user.email, subject: "Confirm your email", ...template });
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
        // Every new user gets a personal workspace on the free plan so the panel never
        // has to render a "no workspace" state.
        after: async (created) => {
          try {
            await createWorkspace(
              created.id,
              created.name,
              created.email.split("@")[0] ?? "Workspace",
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
      organizationLimit: 10,
      creatorRole: "owner",
      membershipLimit: 100,
      invitationExpiresIn: 60 * 60 * 48,
      sendInvitationEmail: async (data) => {
        const url = `${env().APP_URL}/invite/${data.id}`;
        const template = invitationTemplate({
          url,
          workspaceName: data.organization.name,
          inviterName: data.inviter.user.name || data.inviter.user.email,
        });
        await sendEmail({
          to: data.email,
          subject: `Join ${data.organization.name} on Short`,
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
