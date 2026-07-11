import { redirect } from "next/navigation";
import { EmployeeTable } from "@/components/employees/employee-table";
import { getCurrentUser } from "@/lib/auth/session";
import {
  canManageEmployeeProfiles,
  canViewEmployeeDirectory,
} from "@/lib/permissions/roles";
import { listEmployees } from "@/services/employee-service";
import Link from "next/link";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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

  const query = await searchParams;
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const q = typeof query.q === "string" ? query.q : undefined;
  const department = typeof query.department === "string" ? query.department : undefined;
  const status = ["ACTIVE", "SUSPENDED", "OFFBOARDED"].includes(String(query.status)) ? query.status as "ACTIVE" | "SUSPENDED" | "OFFBOARDED" : undefined;
  const sortBy = ["name", "employeeNumber", "department", "joiningDate", "status"].includes(String(query.sortBy)) ? query.sortBy as "name" | "employeeNumber" | "department" | "joiningDate" | "status" : "name";
  const sortOrder = query.sortOrder === "desc" ? "desc" : "asc";
  const data = await listEmployees(user, { page, limit: 25, q, department, status, sortBy, sortOrder });
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

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-5">
        <input name="q" defaultValue={q} placeholder="Search employees" className="rounded-md border px-3 py-2 text-sm" />
        <input name="department" defaultValue={department} placeholder="Department" className="rounded-md border px-3 py-2 text-sm" />
        <select name="status" defaultValue={status ?? ""} className="rounded-md border px-3 py-2 text-sm"><option value="">All statuses</option><option>ACTIVE</option><option>SUSPENDED</option><option>OFFBOARDED</option></select>
        <select name="sortBy" defaultValue={sortBy} className="rounded-md border px-3 py-2 text-sm"><option value="name">Name</option><option value="employeeNumber">Employee number</option><option value="department">Department</option><option value="joiningDate">Joining date</option><option value="status">Status</option></select>
        <button className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Apply</button>
        <input type="hidden" name="sortOrder" value={sortOrder} />
      </form>

      <EmployeeTable employees={data.employees} canManage={canManage} />
      <div className="flex justify-between text-sm"><span>Page {data.pagination.page} of {Math.max(1, data.pagination.pages)} · {data.pagination.total} employees</span><div className="flex gap-3">{page > 1 ? <Link className="underline" href={{ query: { ...query, page: page - 1 } }}>Previous</Link> : null}{page < data.pagination.pages ? <Link className="underline" href={{ query: { ...query, page: page + 1 } }}>Next</Link> : null}</div></div>
    </div>
  );
}
