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
      <section className="rounded-lg border border-yellow-500/25 bg-[#0d0b07] p-6 shadow-xl shadow-yellow-950/10">
        <p className="text-sm font-medium text-yellow-400">Payroll</p>
        <h1 className="mt-2 text-2xl font-semibold text-yellow-50">
          Salary payments
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-yellow-100/70">
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
