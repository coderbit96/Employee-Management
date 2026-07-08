"use client";

import { FormEvent, useState } from "react";

type CreateUserResult =
  | {
      success: true;
      data: {
        user: { email: string; role: string; status: string };
        temporaryPassword: string;
      };
    }
  | { success: false; error: { message: string } };

const roles = ["ADMIN", "HR", "MANAGER", "EMPLOYEE"];

export function CreateUserForm() {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult("");
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        loginId: form.get("loginId") || undefined,
        role: form.get("role"),
        permissions:
          form.get("createAdmin") === "on" ? ["CREATE_ADMIN"] : [],
        employeeNumber: form.get("employeeNumber"),
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        department: form.get("department"),
        designation: form.get("designation"),
        joiningDate: form.get("joiningDate"),
        baseSalary: form.get("baseSalary") || 0,
      }),
    });
    const payload = (await response.json()) as CreateUserResult;
    setLoading(false);

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    setResult(
      `Created ${payload.data.user.email}. Temporary password: ${payload.data.temporaryPassword}`,
    );
    event.currentTarget.reset();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <h2 className="text-lg font-semibold text-slate-950">Create account</h2>
        <p className="mt-1 text-sm text-slate-600">
          Every account receives unique credentials and an audit entry.
        </p>
      </div>

      <Field name="email" label="Email" type="email" />
      <Field name="loginId" label="Login ID" />

      <label className="block text-sm font-medium text-slate-800">
        Role
        <select
          name="role"
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          defaultValue="EMPLOYEE"
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>

      <Field name="employeeNumber" label="Employee number" />
      <Field name="firstName" label="First name" />
      <Field name="lastName" label="Last name" />
      <Field name="department" label="Department" />
      <Field name="designation" label="Designation" />
      <Field name="joiningDate" label="Joining date" type="date" />
      <Field name="baseSalary" label="Base salary" type="number" />

      <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
        <input type="checkbox" name="createAdmin" className="h-4 w-4" />
        Grant CREATE_ADMIN permission when creating an Admin account
      </label>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
          {error}
        </p>
      ) : null}

      {result ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:col-span-2">
          {result}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400 md:col-span-2"
      >
        {loading ? "Creating..." : "Create account"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
}: {
  name: string;
  label: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <input
        name={name}
        type={type}
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
        required={name !== "loginId"}
      />
    </label>
  );
}

