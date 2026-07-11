import type { Role } from "@/types/domain";

export function canUseDailyAttendance(role: Role) {
  return ["EMPLOYEE", "HR", "MANAGER"].includes(role);
}

export function isWorkingDay(workDate: string, holidayDates: string[]) {
  const day = new Date(`${workDate}T00:00:00.000Z`).getUTCDay();
  return day !== 0 && !holidayDates.includes(workDate);
}
