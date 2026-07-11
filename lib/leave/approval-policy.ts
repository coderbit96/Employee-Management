import type { Role } from "@/types/domain";

const EMPLOYEE_LEAVE_APPROVERS: Role[] = ["HR"];
const HR_LEAVE_APPROVERS: Role[] = ["ADMIN", "SUPER_ADMIN"];

export function canRequestLeave(role: Role) {
  return ["EMPLOYEE", "MANAGER", "HR"].includes(role);
}

export function getLeaveApprovalRoute(employeeRole: Role): Role[] {
  if (employeeRole === "HR") {
    return HR_LEAVE_APPROVERS;
  }

  if (employeeRole === "EMPLOYEE" || employeeRole === "MANAGER") {
    return EMPLOYEE_LEAVE_APPROVERS;
  }

  return [];
}

export function canReceiveLeaveRequest(
  approverRole: Role,
  employeeRole: Role,
) {
  return getLeaveApprovalRoute(employeeRole).includes(approverRole);
}
