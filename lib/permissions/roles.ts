import type { Role, SafeUser } from "@/types/domain";

export function canCreateRole(actor: SafeUser, targetRole: Role) {
  return (
    actor.role === "SUPER_ADMIN" &&
    ["HR", "MANAGER", "EMPLOYEE"].includes(targetRole)
  );
}

export function canManageUsers(actor: SafeUser) {
  return actor.role === "SUPER_ADMIN";
}

export function canManageEmployeeProfiles(actor: SafeUser) {
  return ["SUPER_ADMIN", "HR"].includes(actor.role);
}

export function canViewEmployeeDirectory(actor: SafeUser) {
  return ["SUPER_ADMIN", "HR", "MANAGER"].includes(actor.role);
}
