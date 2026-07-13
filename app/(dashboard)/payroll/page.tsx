import { redirect } from "next/navigation";
import { PayrollPanel } from "@/components/payroll/payroll-panel";
import { getCurrentUser } from "@/lib/auth/session";
import { listEmployees } from "@/services/employee-service";
import { listSalaryPayments } from "@/services/payroll-service";

export default async function PayrollPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const canProcess = ["SUPER_ADMIN", "HR", "MANAGER"].includes(user.role);
  const canReverse = user.role === "SUPER_ADMIN";
  const canClearHistory = ["SUPER_ADMIN", "ADMIN", "HR"].includes(user.role);
  const [employees, payments] = await Promise.all([
    canProcess
      ? listEmployees(user, { page: 1, limit: 100, status: "ACTIVE", sortBy: "name", sortOrder: "asc" }).catch(() => ({
          employees: [],
          pagination: { page: 1, limit: 100, total: 0, pages: 0 },
        }))
      : Promise.resolve({
          employees: [],
          pagination: { page: 1, limit: 100, total: 0, pages: 0 },
        }),
    listSalaryPayments(user, {}).catch(() => ({ salaryPayments: [] })),
  ]);

  return (
    <div className="space-y-6">
      <section className="dashboard-hero rounded-lg border p-6 shadow-xl">
        <p className="text-sm font-medium text-cyan-200">Payroll</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Salary payments
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50/78">
          Store salary payment snapshots by pay period, mark them paid, and keep
          reversal history auditable.
        </p>
      </section>
      <PayrollPanel
        employees={employees.employees}
        payments={payments.salaryPayments}
        canProcess={canProcess}
        canReverse={canReverse}
        canClearHistory={canClearHistory}
      />
    </div>
  );
}
