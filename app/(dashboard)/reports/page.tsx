import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkforceSummary } from "@/services/report-service";

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!["SUPER_ADMIN", "ADMIN", "HR", "MANAGER"].includes(user.role)) {
    return (
      <p className="rounded-lg border border-yellow-600/20 bg-white p-5">
        Your role cannot view workforce reports.
      </p>
    );
  }

  const summary = await getWorkforceSummary(user);
  const metrics = [
    { label: "Headcount", value: summary.headcount },
    { label: "Active users", value: summary.activeUsers },
    { label: "Inactive users", value: summary.inactiveUsers },
    { label: `Attendance ${summary.workDate}`, value: summary.attendanceToday },
    { label: "Not checked in", value: summary.absentOrNotCheckedIn },
    { label: "Attendance exceptions", value: summary.attendanceExceptions },
    { label: "Pending leave", value: summary.pendingLeave },
    { label: "Open payroll items", value: summary.openPayrollItems },
    { label: "Paid records", value: summary.paidPayments },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-yellow-500/25 bg-[#0d0b07] p-6 shadow-xl shadow-yellow-950/10">
        <p className="text-sm font-medium text-yellow-400">
          {summary.scope.replace("_", " ")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-yellow-50">
          Workforce report
        </h1>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-lg border border-yellow-600/20 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-yellow-500/55 hover:shadow-xl hover:shadow-yellow-900/10"
          >
            <p className="text-sm text-slate-600">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold text-[#161006]">
              {metric.value}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
