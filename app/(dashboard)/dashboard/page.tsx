import { redirect } from "next/navigation";
import { AttendanceHistory } from "@/components/attendance/attendance-history";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { AttendanceCard } from "@/components/attendance/attendance-card";
import { HrLeaveInbox } from "@/components/leave/hr-leave-inbox";
import { LeaveApprovalInbox } from "@/components/leave/leave-approval-inbox";
import { LeaveMailForm } from "@/components/leave/leave-mail-form";
import { LeaveRequestPanel } from "@/components/leave/leave-request-panel";
import { NotificationList } from "@/components/notifications/notification-list";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getTodayAttendance,
  listAttendanceRecords,
} from "@/services/attendance-service";
import { listLeaveInbox } from "@/services/leave-message-service";
import { listLeaveRequests } from "@/services/leave-request-service";
import { listNotifications } from "@/services/notification-service";

const cards = [
  {
    title: "Account provisioning",
    body: "Super Admin creates HR, Manager, and Employee accounts with immediate login credentials.",
  },
  {
    title: "Daily attendance",
    body: "Employees can check in and check out once per work date.",
  },
  {
    title: "Leave mailbox",
    body: "Employee leave mail appears in HR and Super Admin dashboards.",
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
  const leaveInbox = ["SUPER_ADMIN", "HR"].includes(user.role)
    ? await listLeaveInbox(user).catch(() => ({ messages: [] }))
    : null;
  const myLeaveRequests = showEmployeeTools
    ? await listLeaveRequests(user, { scope: "mine" }).catch(() => ({
        leaveRequests: [],
      }))
    : null;
  const pendingLeaveRequests = ["SUPER_ADMIN", "HR"].includes(user.role)
    ? await listLeaveRequests(user, {
        scope: "inbox",
        status: "PENDING",
      }).catch(() => ({ leaveRequests: [] }))
    : null;
  const attendanceRecords = await listAttendanceRecords(user).catch(() => ({
    records: [],
  }));
  const notifications = await listNotifications(user).catch(() => ({
    notifications: [],
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-emerald-800">Signed in as {user.email}</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          {user.role.replace("_", " ")} dashboard
        </h1>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-base font-semibold text-slate-950">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
          </article>
        ))}
      </section>

      {attendance ? <AttendanceCard initialAttendance={attendance} /> : null}

      <AttendanceHistory records={attendanceRecords.records} />

      <NotificationList notifications={notifications.notifications} />

      {myLeaveRequests ? (
        <LeaveRequestPanel requests={myLeaveRequests.leaveRequests} />
      ) : null}

      {showEmployeeTools ? <LeaveMailForm /> : null}

      {pendingLeaveRequests ? (
        <LeaveApprovalInbox requests={pendingLeaveRequests.leaveRequests} />
      ) : null}

      {leaveInbox ? <HrLeaveInbox messages={leaveInbox.messages} /> : null}

      <ChangePasswordForm />
    </div>
  );
}
