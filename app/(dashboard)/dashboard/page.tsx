import { redirect } from "next/navigation";
import { AttendanceHistory } from "@/components/attendance/attendance-history";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { AttendanceCard } from "@/components/attendance/attendance-card";
import { AttendanceCorrectionInbox } from "@/components/attendance/attendance-correction-inbox";
import { LeaveApprovalInbox } from "@/components/leave/leave-approval-inbox";
import { LeaveRequestPanel } from "@/components/leave/leave-request-panel";
import { NotificationList } from "@/components/notifications/notification-list";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getTodayAttendance,
  listAttendanceRecords,
} from "@/services/attendance-service";
import { listLeaveRequests } from "@/services/leave-request-service";
import { listNotifications } from "@/services/notification-service";
import { listAttendanceCorrections } from "@/services/attendance-correction-service";

const cards = [
  {
    title: "Account provisioning",
    body: "Authorized Admins create unique accounts with temporary login credentials.",
  },
  {
    title: "Daily attendance",
    body: "Employees can check in and check out once per work date.",
  },
  {
    title: "Leave management",
    body: "Employees submit one formal leave request for balance tracking and approval.",
  },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const showEmployeeTools = ["EMPLOYEE", "HR", "MANAGER"].includes(user.role);
  const attendance = showEmployeeTools
    ? await getTodayAttendance(user).catch(() => null)
    : null;
  const myLeaveRequests = showEmployeeTools
    ? await listLeaveRequests(user, { scope: "mine" }).catch(() => ({
        leaveRequests: [],
      }))
    : null;
  const pendingLeaveRequests = ["SUPER_ADMIN", "ADMIN", "HR"].includes(user.role)
    ? { leaveRequests: (await Promise.all(["PENDING", "CANCELLATION_PENDING"].map((status) => listLeaveRequests(user, { scope: "inbox", status: status as "PENDING" | "CANCELLATION_PENDING" }).catch(() => ({ leaveRequests: [] }))))).flatMap((item) => item.leaveRequests) }
    : null;
  const attendanceRecords = await listAttendanceRecords(user).catch(() => ({
    records: [],
  }));
  const notifications = await listNotifications(user).catch(() => ({
    notifications: [],
  }));
  const corrections = ["SUPER_ADMIN", "ADMIN", "HR"].includes(user.role) ? await listAttendanceCorrections(user).catch(() => ({ corrections: [] })) : null;

  if (user.forcePasswordChange) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Change your temporary password before using the application.
        </div>
        <ChangePasswordForm />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-yellow-500/25 bg-[#0d0b07] p-6 shadow-xl shadow-yellow-950/10">
        <p className="text-sm font-medium text-yellow-400">Signed in as {user.email}</p>
        <h1 className="mt-2 text-2xl font-semibold text-yellow-50">
          {user.role.replace("_", " ")} dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-yellow-100/70">
          Manage daily operations from a focused workspace tuned for attendance,
          leave, payroll, and secure account access.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-lg border border-yellow-600/20 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-yellow-500/55 hover:shadow-xl hover:shadow-yellow-900/10"
          >
            <h2 className="text-base font-semibold text-[#161006]">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
          </article>
        ))}
      </section>

      {attendance ? <AttendanceCard initialAttendance={attendance} /> : null}

      <AttendanceHistory records={attendanceRecords.records} />

      {corrections ? <AttendanceCorrectionInbox corrections={corrections.corrections} /> : null}

      <NotificationList notifications={notifications.notifications} />

      {myLeaveRequests ? (
        <LeaveRequestPanel requests={myLeaveRequests.leaveRequests} />
      ) : null}

      {pendingLeaveRequests ? (
        <LeaveApprovalInbox requests={pendingLeaveRequests.leaveRequests} />
      ) : null}

      <ChangePasswordForm />
    </div>
  );
}
