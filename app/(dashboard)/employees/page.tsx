import Link from "next/link";
import { redirect } from "next/navigation";
import { EmployeeTable } from "@/components/employees/employee-table";
import { getCurrentUser } from "@/lib/auth/session";
import {
  canManageEmployeeProfiles,
  canViewEmployeeDirectory,
} from "@/lib/permissions/roles";
import { listEmployees } from "@/services/employee-service";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canViewEmployeeDirectory(user)) {
    return (
      <div className="rounded-lg border border-yellow-600/20 bg-white p-5 text-sm text-slate-600">
        Your role cannot view the employee directory.
      </div>
    );
  }

  const query = await searchParams;
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const q = typeof query.q === "string" ? query.q : undefined;
  const department =
    typeof query.department === "string" ? query.department : undefined;
  const status = ["ACTIVE", "SUSPENDED", "OFFBOARDED"].includes(
    String(query.status),
  )
    ? (query.status as "ACTIVE" | "SUSPENDED" | "OFFBOARDED")
    : undefined;
  const sortBy = [
    "name",
    "employeeNumber",
    "department",
    "joiningDate",
    "status",
  ].includes(String(query.sortBy))
    ? (query.sortBy as
        | "name"
        | "employeeNumber"
        | "department"
        | "joiningDate"
        | "status")
    : "name";
  const sortOrder = query.sortOrder === "desc" ? "desc" : "asc";
  const data = await listEmployees(user, {
    page,
    limit: 25,
    q,
    department,
    status,
    sortBy,
    sortOrder,
  });
  const canManage = canManageEmployeeProfiles(user);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-yellow-500/25 bg-[#0d0b07] p-6 shadow-xl shadow-yellow-950/10">
        <p className="text-sm font-medium text-yellow-400">
          Employee directory
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-yellow-50">
          Profiles and reporting lines
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-yellow-100/70">
          Employee profiles are created during account provisioning. Profile
          updates go through the employee API, including manager cycle checks.
        </p>
      </section>

      <form className="grid gap-3 rounded-lg border border-yellow-600/20 bg-white p-4 shadow-sm md:grid-cols-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search employees"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200"
        />
        <input
          name="department"
          defaultValue={department}
          placeholder="Department"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200"
        >
          <option value="">All statuses</option>
          <option>ACTIVE</option>
          <option>SUSPENDED</option>
          <option>OFFBOARDED</option>
        </select>
        <select
          name="sortBy"
          defaultValue={sortBy}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200"
        >
          <option value="name">Name</option>
          <option value="employeeNumber">Employee number</option>
          <option value="department">Department</option>
          <option value="joiningDate">Joining date</option>
          <option value="status">Status</option>
        </select>
        <button className="gold-hover rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-yellow-300 hover:shadow-lg hover:shadow-yellow-900/20">
          <span className="relative z-10">Apply</span>
        </button>
        <input type="hidden" name="sortOrder" value={sortOrder} />
      </form>

      <EmployeeTable employees={data.employees} canManage={canManage} />
      <div className="flex justify-between text-sm text-[#2b2109]">
        <span>
          Page {data.pagination.page} of {Math.max(1, data.pagination.pages)} -{" "}
          {data.pagination.total} employees
        </span>
        <div className="flex gap-3">
          {page > 1 ? (
            <Link
              className="font-medium text-yellow-800 underline hover:text-black"
              href={{ query: { ...query, page: page - 1 } }}
            >
              Previous
            </Link>
          ) : null}
          {page < data.pagination.pages ? (
            <Link
              className="font-medium text-yellow-800 underline hover:text-black"
              href={{ query: { ...query, page: page + 1 } }}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
