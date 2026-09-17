import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DELETION_GRACE_MS,
  isScheduledDeletionDue,
  scheduledDeletionAt,
  shouldCancelScheduledDeletion,
} from "../account-deletion";

describe("scheduledDeletionAt", () => {
  it("is seven days after the request", () => {
    const from = new Date("2026-09-17T12:00:00.000Z");
    expect(scheduledDeletionAt(from).toISOString()).toBe("2026-09-24T12:00:00.000Z");
    expect(ACCOUNT_DELETION_GRACE_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("isScheduledDeletionDue", () => {
  it("finalizes at or after the scheduled instant", () => {
    const scheduled = new Date("2026-09-24T12:00:00.000Z");
    expect(isScheduledDeletionDue(scheduled, new Date("2026-09-24T11:59:59.000Z"))).toBe(false);
    expect(isScheduledDeletionDue(scheduled, scheduled)).toBe(true);
    expect(isScheduledDeletionDue(scheduled, new Date("2026-09-25T00:00:00.000Z"))).toBe(true);
  });
});

describe("shouldCancelScheduledDeletion", () => {
  it("cancels only while the grace window is still open", () => {
    const scheduled = new Date("2026-09-24T12:00:00.000Z");
    const now = new Date("2026-09-20T12:00:00.000Z");
    expect(shouldCancelScheduledDeletion(scheduled, null, now)).toBe(true);
    expect(shouldCancelScheduledDeletion(scheduled, null, scheduled)).toBe(false);
    expect(shouldCancelScheduledDeletion(scheduled, new Date("2026-09-24T12:00:00.000Z"), now)).toBe(
      false,
    );
    expect(shouldCancelScheduledDeletion(null, null, now)).toBe(false);
  });
});
