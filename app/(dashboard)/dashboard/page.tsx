import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { AttendanceCard } from "@/components/attendance/attendance-card";
import { HrLeaveInbox } from "@/components/leave/hr-leave-inbox";
import { LeaveMailForm } from "@/components/leave/leave-mail-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getTodayAttendance } from "@/services/attendance-service";
import { listLeaveInbox } from "@/services/leave-message-service";

const cards = [
  {
    title: "Account provisioning",
    body: "Admins create HR, Manager, and Employee accounts with immediate login credentials.",
  },
  {
    title: "Daily attendance",
    body: "Employees can check in and check out once per work date.",
  },
  {
    title: "Leave mailbox",
    body: "Employee leave mail appears in HR and Admin dashboards.",
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
  const leaveInbox = ["SUPER_ADMIN", "ADMIN", "HR"].includes(user.role)
    ? await listLeaveInbox(user).catch(() => ({ messages: [] }))
    : null;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-emerald-800">Signed in as {user.email}</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          {user.role.replace("_", " ")} dashboard
        </h1>
        {user.forcePasswordChange ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This account is marked for first-login password change. The password
            setup screen is the next identity feature to complete.
          </p>
        ) : null}
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

      {showEmployeeTools ? <LeaveMailForm /> : null}

      {leaveInbox ? <HrLeaveInbox messages={leaveInbox.messages} /> : null}

      <ChangePasswordForm />
    </div>
  );
}
