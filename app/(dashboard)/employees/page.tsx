import { redirect } from "next/navigation";
import { EmployeeTable } from "@/components/employees/employee-table";
import { getCurrentUser } from "@/lib/auth/session";
import {
  canManageEmployeeProfiles,
  canViewEmployeeDirectory,
} from "@/lib/permissions/roles";
import { listEmployees } from "@/services/employee-service";

export default async function EmployeesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canViewEmployeeDirectory(user)) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Your role cannot view the employee directory.
      </div>
    );
  }

  const data = await listEmployees(user, { page: 1, limit: 25 });
  const canManage = canManageEmployeeProfiles(user);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-emerald-800">
          Employee directory
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Profiles and reporting lines
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Employee profiles are created during account provisioning. Profile
          updates go through the employee API, including manager cycle checks.
        </p>
      </section>

      <EmployeeTable employees={data.employees} canManage={canManage} />
    </div>
  );
}
