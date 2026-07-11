import { describe, expect, it } from "vitest";
import { toSafeUser } from "@/lib/auth/session";

const id = { toString: () => "user-1" };

describe("safe session user", () => {
  it("does not apply provisioned-account password gating to the seeded Super Admin", () => {
    const user = toSafeUser({
      _id: id,
      email: "admin@example.com",
      role: "SUPER_ADMIN",
      permissions: [],
      status: "ACTIVE",
      forcePasswordChange: true,
    });

    expect(user.forcePasswordChange).toBe(false);
  });

  it("preserves mandatory password changes for provisioned accounts", () => {
    const user = toSafeUser({
      _id: id,
      email: "employee@example.com",
      role: "EMPLOYEE",
      permissions: [],
      status: "ACTIVE",
      forcePasswordChange: true,
    });

    expect(user.forcePasswordChange).toBe(true);
  });
});
