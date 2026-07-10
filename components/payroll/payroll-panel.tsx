"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmployeeListItem } from "@/services/employee-service";

type SalaryPayment = {
  id: string;
  employeeName: string;
  payPeriod: string;
  netAmount: number;
  currency: string;
  status: string;
  paymentDate?: string;
  exceptionSnapshot?: {
    attendanceDays: number;
    incompleteAttendanceDays: number;
    approvedLeaveDays: number;
    unpaidLeaveDays: number;
    notes: string[];
  };
};

type ApiResponse =
  | { success: true; data: { salaryPayment?: SalaryPayment; salaryPayments?: SalaryPayment[] } }
  | { success: false; error: { message: string } };

export function PayrollPanel({
  employees,
  payments,
  canProcess,
  canReverse,
}: {
  employees: EmployeeListItem[];
  payments: SalaryPayment[];
  canProcess: boolean;
  canReverse: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");

  async function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setMessage("");
    setLoading("create");

    const response = await fetch("/api/v1/salary-payments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        employeeIds: form.getAll("employeeIds"),
        payPeriod: form.get("payPeriod"),
        deductions: form.get("deductions") || 0,
        bonuses: form.get("bonuses") || 0,
        paymentMethod: form.get("paymentMethod") || undefined,
        paymentReference: form.get("paymentReference") || undefined,
      }),
    });
    const payload = (await response.json()) as ApiResponse;
    setLoading("");

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    setMessage(
      `${payload.data.salaryPayments?.length ?? 1} salary payment draft(s) created.`,
    );
    formElement.reset();
    router.refresh();
  }

  async function markPaid(payment: SalaryPayment) {
    const paymentReference = window.prompt("Enter payment reference");

    if (!paymentReference) {
      return;
    }

    const paymentMethod = window.prompt("Payment method", "Bank transfer") ?? "";
    setError("");
    setMessage("");
    setLoading(`paid:${payment.id}`);

    const response = await fetch(
      `/api/v1/salary-payments/${payment.id}/mark-paid`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentReference, paymentMethod }),
      },
    );
    const payload = (await response.json()) as ApiResponse;
    setLoading("");

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    setMessage("Salary payment marked paid.");
    router.refresh();
  }

  async function reverse(payment: SalaryPayment) {
    const reason = window.prompt("Reason for reversing this payment?");

    if (!reason) {
      return;
    }

    setError("");
    setMessage("");
    setLoading(`reverse:${payment.id}`);

    const response = await fetch(
      `/api/v1/salary-payments/${payment.id}/reverse`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );
    const payload = (await response.json()) as ApiResponse;
    setLoading("");

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    setMessage("Salary payment reversed.");
    router.refresh();
  }

  async function deleteHistory(payment: SalaryPayment) {
    const confirmed = window.confirm(
      `Delete salary history for ${payment.employeeName} (${payment.payPeriod})?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setLoading(`delete:${payment.id}`);

    const response = await fetch(`/api/v1/salary-payments/${payment.id}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as ApiResponse;
    setLoading("");

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    setMessage("Salary history deleted.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {canProcess ? (
        <form
          onSubmit={createPayment}
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold text-slate-950">
              Create salary payment
            </h2>
          </div>
          <label className="block text-sm font-medium text-slate-800">
            Employee
            <select
              name="employeeIds"
              multiple
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              required
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.employeeNumber})
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              Hold Ctrl to select more than one employee.
            </span>
          </label>
          <Field name="payPeriod" label="Pay period" placeholder="2026-07" />
          <Field name="deductions" label="Deductions" type="number" />
          <Field name="bonuses" label="Bonuses" type="number" />
          <Field name="paymentMethod" label="Payment method" required={false} />
          <Field
            name="paymentReference"
            label="Payment reference"
            required={false}
          />
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:col-span-2">
              {message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={Boolean(loading)}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400 md:col-span-2"
          >
            {loading === "create" ? "Creating..." : "Create payment"}
          </button>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">
            Salary payment history
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Period</th>
                <th className="px-5 py-3 font-medium">Net</th>
                <th className="px-5 py-3 font-medium">Exceptions</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Paid date</th>
                {canProcess ? (
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-5 py-3 text-slate-900">
                    {payment.employeeName}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {payment.payPeriod}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {payment.currency}{" "}
                    {payment.netAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {payment.exceptionSnapshot?.notes.length
                      ? payment.exceptionSnapshot.notes.join(", ")
                      : "None"}
                  </td>
                  <td className="px-5 py-3 text-slate-700">{payment.status}</td>
                  <td className="px-5 py-3 text-slate-700">
                    {payment.paymentDate
                      ? new Date(payment.paymentDate).toLocaleDateString("en-IN")
                      : "-"}
                  </td>
                  {canProcess ? (
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      {payment.status !== "PAID" &&
                      payment.status !== "REVERSED" ? (
                        <button
                          type="button"
                          onClick={() => markPaid(payment)}
                          disabled={Boolean(loading)}
                          className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400"
                        >
                          Mark paid
                        </button>
                      ) : null}
                      {canReverse && payment.status === "PAID" ? (
                        <button
                          type="button"
                          onClick={() => reverse(payment)}
                          disabled={Boolean(loading)}
                          className="ml-2 rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          Reverse
                        </button>
                      ) : null}
                      {canReverse ? (
                        <button
                          type="button"
                          onClick={() => deleteHistory(payment)}
                          disabled={Boolean(loading)}
                          className="ml-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {loading === `delete:${payment.id}`
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
              {!payments.length ? (
                <tr>
                  <td
                    className="px-5 py-5 text-slate-600"
                    colSpan={canProcess ? 7 : 6}
                  >
                    No salary payments found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
        required={required}
      />
    </label>
  );
}
