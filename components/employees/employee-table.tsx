"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmployeeListItem } from "@/services/employee-service";

type ApiResponse =
  | { success: true; data: unknown }
  | { success: false; error: { message: string } };

export function EmployeeTable({
  employees,
  canManage,
}: {
  employees: EmployeeListItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<EmployeeListItem | null>(null);
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState("");

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editing) {
      return;
    }

    setError("");
    setLoadingId(editing.id);

    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/employees/${editing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        department: form.get("department"),
        designation: form.get("designation"),
        joiningDate: form.get("joiningDate"),
        baseSalary: form.get("baseSalary"),
        employmentStatus: form.get("employmentStatus"),
      }),
    });
    const payload = (await response.json()) as ApiResponse;
    setLoadingId("");

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    setEditing(null);
    router.refresh();
  }

  async function removeEmployee(employee: EmployeeListItem) {
    const confirmed = window.confirm(
      `Delete ${employee.name}? This will permanently delete the employee, login, attendance, leave, and salary records from MongoDB.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setLoadingId(employee.id);

    const response = await fetch(`/api/v1/employees/${employee.id}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as ApiResponse;
    setLoadingId("");

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    router.refresh();
  }

  async function offboard(employee: EmployeeListItem) {
    const exitReason = window.prompt(`Exit reason for ${employee.name}?`);

    if (!exitReason) {
      return;
    }

    const exitDate =
      window.prompt("Exit date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10)) ??
      "";

    if (!exitDate) {
      return;
    }

    setError("");
    setLoadingId(employee.id);

    const response = await fetch(`/api/v1/employees/${employee.id}/offboard`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ exitDate, exitReason }),
    });
    const payload = (await response.json()) as ApiResponse;
    setLoadingId("");

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-5 py-3 font-medium">Employee</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Department</th>
              <th className="px-5 py-3 font-medium">Designation</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Base salary</th>
              {canManage ? (
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-950">{employee.name}</p>
                  <p className="text-xs text-slate-500">
                    {employee.employeeNumber}
                  </p>
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {employee.email ?? "Not linked"}
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {employee.department}
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {employee.designation}
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {employee.employmentStatus}
                  {employee.exitDate ? (
                    <p className="text-xs text-slate-500">
                      Exit: {new Date(employee.exitDate).toLocaleDateString("en-IN")}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {employee.salary.currency}{" "}
                  {employee.salary.baseAmount.toLocaleString("en-IN")}
                </td>
                {canManage ? (
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(employee)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEmployee(employee)}
                      disabled={loadingId === employee.id}
                      className="ml-2 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {loadingId === employee.id ? "Deleting..." : "Delete"}
                    </button>
                    {employee.employmentStatus !== "OFFBOARDED" ? (
                      <button
                        type="button"
                        onClick={() => offboard(employee)}
                        disabled={loadingId === employee.id}
                        className="ml-2 rounded-md border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
                      >
                        Offboard
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
            {!employees.length ? (
              <tr>
                <td
                  className="px-5 py-5 text-slate-600"
                  colSpan={canManage ? 7 : 6}
                >
                  No employee profiles found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-5">
          <form onSubmit={saveEmployee} className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-3">
              <h2 className="text-base font-semibold text-slate-950">
                Edit {editing.name}
              </h2>
            </div>
            <Field
              name="firstName"
              label="First name"
              defaultValue={editing.firstName}
            />
            <Field
              name="lastName"
              label="Last name"
              defaultValue={editing.lastName}
            />
            <Field
              name="department"
              label="Department"
              defaultValue={editing.department}
            />
            <Field
              name="designation"
              label="Designation"
              defaultValue={editing.designation}
            />
            <Field
              name="joiningDate"
              label="Joining date"
              type="date"
              defaultValue={editing.joiningDate.slice(0, 10)}
            />
            <Field
              name="baseSalary"
              label="Base salary"
              type="number"
              defaultValue={String(editing.salary.baseAmount)}
            />
            <label className="block text-sm font-medium text-slate-800">
              Status
              <select
                name="employmentStatus"
                defaultValue={editing.employmentStatus}
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="OFFBOARDED">OFFBOARDED</option>
              </select>
            </label>

            <div className="flex gap-2 md:col-span-3">
              <button
                type="submit"
                disabled={loadingId === editing.id}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400"
              >
                {loadingId === editing.id ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
        required
      />
    </label>
  );
}
