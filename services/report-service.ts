import { Attendance } from "@/models/Attendance";
import { EmployeeProfile } from "@/models/EmployeeProfile";
import { LeaveRequest } from "@/models/LeaveRequest";
import { SalaryPayment } from "@/models/SalaryPayment";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getPolicySettings } from "@/services/settings-service";
import type { SafeUser } from "@/types/domain";

export async function getWorkforceSummary(actor: SafeUser) {
  await connectToDatabase();
  if (!["SUPER_ADMIN", "ADMIN", "HR", "MANAGER"].includes(actor.role)) throw new Error("You cannot view workforce reports.");
  let employeeFilter: Record<string, unknown> = { deletedAt: { $exists: false } };
  if (actor.role === "MANAGER") {
    const manager = await EmployeeProfile.findOne({ userId: actor.id }).select("_id").lean();
    employeeFilter = manager ? { ...employeeFilter, managerId: manager._id } : { _id: { $in: [] } };
  }
  const employees = await EmployeeProfile.find(employeeFilter).select("_id userId employmentStatus").lean();
  const employeeIds = employees.map((item) => item._id); const userIds = employees.map((item) => item.userId);
  const policy = await getPolicySettings();
  const workDate = new Intl.DateTimeFormat("en-CA", { timeZone: policy.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [activeUsers, attendanceToday, shortToday, pendingLeave, draftPayments, paidPayments] = await Promise.all([
    User.countDocuments({ _id: { $in: userIds }, status: "ACTIVE" }),
    Attendance.countDocuments({ employeeId: { $in: employeeIds }, workDate }),
    Attendance.countDocuments({ employeeId: { $in: employeeIds }, workDate, exception: { $ne: "NONE" } }),
    LeaveRequest.countDocuments({ employeeId: { $in: employeeIds }, status: "PENDING" }),
    SalaryPayment.countDocuments({ employeeId: { $in: employeeIds }, status: { $in: ["DRAFT", "PROCESSING", "FAILED"] } }),
    SalaryPayment.countDocuments({ employeeId: { $in: employeeIds }, status: "PAID" }),
  ]);
  return { workDate, scope: actor.role === "MANAGER" ? "DIRECT_TEAM" : "ORGANIZATION", headcount: employees.length, activeUsers, inactiveUsers: employees.length - activeUsers, attendanceToday, absentOrNotCheckedIn: Math.max(0, activeUsers - attendanceToday), attendanceExceptions: shortToday, pendingLeave, openPayrollItems: draftPayments, paidPayments };
}
