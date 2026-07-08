import { describe, expect, it } from "vitest";
import { canCreateRole } from "@/lib/permissions/roles";
import type { SafeUser } from "@/types/domain";

function user(overrides: Partial<SafeUser>): SafeUser {
  return {
    id: "user_1",
    email: "user@example.com",
    role: "EMPLOYEE",
    permissions: [],
    status: "ACTIVE",
    forcePasswordChange: false,
    ...overrides,
  };
}

describe("role provisioning permissions", () => {
  it("allows Super Admin to create Admin accounts", () => {
    expect(canCreateRole(user({ role: "SUPER_ADMIN" }), "ADMIN")).toBe(true);
  });

  it("allows Admin to create HR, Manager, and Employee accounts", () => {
    const admin = user({ role: "ADMIN" });

    expect(canCreateRole(admin, "HR")).toBe(true);
    expect(canCreateRole(admin, "MANAGER")).toBe(true);
    expect(canCreateRole(admin, "EMPLOYEE")).toBe(true);
  });

  it("blocks Admin from creating Admin unless CREATE_ADMIN is granted", () => {
    expect(canCreateRole(user({ role: "ADMIN" }), "ADMIN")).toBe(false);
    expect(
      canCreateRole(
        user({ role: "ADMIN", permissions: ["CREATE_ADMIN"] }),
        "ADMIN",
      ),
    ).toBe(true);
  });

  it("blocks HR, Manager, and Employee from creating Admin accounts", () => {
    expect(canCreateRole(user({ role: "HR" }), "ADMIN")).toBe(false);
    expect(canCreateRole(user({ role: "MANAGER" }), "ADMIN")).toBe(false);
    expect(canCreateRole(user({ role: "EMPLOYEE" }), "ADMIN")).toBe(false);
  });
});

