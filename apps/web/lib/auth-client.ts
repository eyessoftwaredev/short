"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { twoFactorContinueHref } from "./two-factor";

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    adminClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.assign(twoFactorContinueHref());
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession, organization, admin, resetPassword } =
  authClient;
