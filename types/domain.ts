export const ROLES = [
  "SUPER_ADMIN",
  "HR",
  "MANAGER",
  "EMPLOYEE",
] as const;

export type Role = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = [
  "INVITED",
  "ACTIVE",
  "SUSPENDED",
  "LOCKED",
  "OFFBOARDED",
  "DELETED",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const PERMISSIONS = [
  "CREATE_ADMIN",
  "MANAGE_USERS",
  "MANAGE_EMPLOYEES",
  "VIEW_AUDIT_LOGS",
  "MANAGE_SETTINGS",
  "PROCESS_PAYROLL",
  "APPROVE_LEAVE",
  "ARCHIVE_ATTENDANCE",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type SafeUser = {
  id: string;
  email: string;
  loginId?: string;
  role: Role;
  permissions: Permission[];
  status: AccountStatus;
  forcePasswordChange: boolean;
  lastLoginAt?: string;
};
