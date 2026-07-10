import { describe, expect, it } from "vitest";
import {
  canCreateRole,
  canManageEmployeeProfiles,
  canViewEmployeeDirectory,
} from "@/lib/permissions/roles";
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
  it("allows Super Admin to create HR, Manager, and Employee accounts", () => {
    const superAdmin = user({ role: "SUPER_ADMIN" });

    expect(canCreateRole(superAdmin, "HR")).toBe(true);
    expect(canCreateRole(superAdmin, "MANAGER")).toBe(true);
    expect(canCreateRole(superAdmin, "EMPLOYEE")).toBe(true);
  });

  it("blocks HR, Manager, and Employee from creating accounts", () => {
    expect(canCreateRole(user({ role: "HR" }), "EMPLOYEE")).toBe(false);
    expect(canCreateRole(user({ role: "MANAGER" }), "EMPLOYEE")).toBe(false);
    expect(canCreateRole(user({ role: "EMPLOYEE" }), "EMPLOYEE")).toBe(false);
  });
});

describe("employee directory permissions", () => {
  it("allows Super Admin, HR, and Manager to view the directory", () => {
    expect(canViewEmployeeDirectory(user({ role: "SUPER_ADMIN" }))).toBe(true);
    expect(canViewEmployeeDirectory(user({ role: "HR" }))).toBe(true);
    expect(canViewEmployeeDirectory(user({ role: "MANAGER" }))).toBe(true);
  });

  it("blocks Employee from viewing the full directory", () => {
    expect(canViewEmployeeDirectory(user({ role: "EMPLOYEE" }))).toBe(false);
  });

  it("limits employee profile management to Super Admin and HR", () => {
    expect(canManageEmployeeProfiles(user({ role: "SUPER_ADMIN" }))).toBe(true);
    expect(canManageEmployeeProfiles(user({ role: "HR" }))).toBe(true);
    expect(canManageEmployeeProfiles(user({ role: "MANAGER" }))).toBe(false);
    expect(canManageEmployeeProfiles(user({ role: "EMPLOYEE" }))).toBe(false);
  });
});
