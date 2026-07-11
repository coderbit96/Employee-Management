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
  it("allows Super Admin to create Admin, HR, Manager, and Employee accounts", () => {
    const superAdmin = user({ role: "SUPER_ADMIN" });

    expect(canCreateRole(superAdmin, "ADMIN")).toBe(true);
    expect(canCreateRole(superAdmin, "HR")).toBe(true);
    expect(canCreateRole(superAdmin, "MANAGER")).toBe(true);
    expect(canCreateRole(superAdmin, "EMPLOYEE")).toBe(true);
  });

  it("allows Admin operational provisioning and blocks non-admin roles", () => {
    expect(canCreateRole(user({ role: "ADMIN" }), "EMPLOYEE")).toBe(true);
    expect(canCreateRole(user({ role: "ADMIN" }), "ADMIN")).toBe(false);
    expect(canCreateRole(user({ role: "HR" }), "EMPLOYEE")).toBe(false);
    expect(canCreateRole(user({ role: "MANAGER" }), "EMPLOYEE")).toBe(false);
    expect(canCreateRole(user({ role: "EMPLOYEE" }), "EMPLOYEE")).toBe(false);
  });
});

describe("employee directory permissions", () => {
  it("allows Super Admin, Admin, HR, and Manager to view the directory", () => {
    expect(canViewEmployeeDirectory(user({ role: "SUPER_ADMIN" }))).toBe(true);
    expect(canViewEmployeeDirectory(user({ role: "ADMIN" }))).toBe(true);
    expect(canViewEmployeeDirectory(user({ role: "HR" }))).toBe(true);
    expect(canViewEmployeeDirectory(user({ role: "MANAGER" }))).toBe(true);
  });

  it("blocks Employee from viewing the full directory", () => {
    expect(canViewEmployeeDirectory(user({ role: "EMPLOYEE" }))).toBe(false);
  });

  it("limits employee profile management to Super Admin, Admin and HR", () => {
    expect(canManageEmployeeProfiles(user({ role: "SUPER_ADMIN" }))).toBe(true);
    expect(canManageEmployeeProfiles(user({ role: "ADMIN" }))).toBe(true);
    expect(canManageEmployeeProfiles(user({ role: "HR" }))).toBe(true);
    expect(canManageEmployeeProfiles(user({ role: "MANAGER" }))).toBe(false);
    expect(canManageEmployeeProfiles(user({ role: "EMPLOYEE" }))).toBe(false);
  });
});
