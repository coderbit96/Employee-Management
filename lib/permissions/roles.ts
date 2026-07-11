import type { Role, SafeUser } from "@/types/domain";

export function canCreateRole(actor: SafeUser, targetRole: Role) {
  if (targetRole === "SUPER_ADMIN") return false;
  if (targetRole === "ADMIN") {
    return actor.role === "SUPER_ADMIN" || actor.permissions.includes("CREATE_ADMIN");
  }
  return ["SUPER_ADMIN", "ADMIN"].includes(actor.role);
}

export function canManageUsers(actor: SafeUser) {
  return ["SUPER_ADMIN", "ADMIN"].includes(actor.role) || actor.permissions.includes("MANAGE_USERS");
}

export function canManageEmployeeProfiles(actor: SafeUser) {
  return ["SUPER_ADMIN", "ADMIN", "HR"].includes(actor.role) || actor.permissions.includes("MANAGE_EMPLOYEES");
}

export function canViewEmployeeDirectory(actor: SafeUser) {
  return ["SUPER_ADMIN", "ADMIN", "HR", "MANAGER"].includes(actor.role);
}
