/** Pending verification lives at a stable path. Email never belongs in the URL. */
export function verifyPendingPath(invite = ""): string {
  if (invite === "") {
    return "/verify";
  }
  return `/verify?invite=${encodeURIComponent(invite)}`;
}

/** Sign-up from an emailed invite link carries `${inviteId}.${proof}` so the redundant verify mail is skipped. */
export const INVITE_PROOF_HEADER = "x-invite-proof";
