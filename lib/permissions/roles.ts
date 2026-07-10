import type { Permission, Role, SafeUser } from "@/types/domain";

export function hasPermission(user: SafeUser, permission: Permission) {
  return user.role === "SUPER_ADMIN" || user.permissions.includes(permission);
}

export function canCreateRole(actor: SafeUser, targetRole: Role) {
  if (actor.role === "SUPER_ADMIN") {
    return true;
  }

  if (actor.role === "ADMIN") {
    if (targetRole === "ADMIN") {
      return hasPermission(actor, "CREATE_ADMIN");
    }

    return ["HR", "MANAGER", "EMPLOYEE"].includes(targetRole);
  }

  return false;
}

export function canManageUsers(actor: SafeUser) {
  return actor.role === "SUPER_ADMIN" || actor.role === "ADMIN";
}

export function canManageEmployeeProfiles(actor: SafeUser) {
  return ["SUPER_ADMIN", "ADMIN", "HR"].includes(actor.role);
}

export function canViewEmployeeDirectory(actor: SafeUser) {
  return ["SUPER_ADMIN", "ADMIN", "HR", "MANAGER"].includes(actor.role);
}
