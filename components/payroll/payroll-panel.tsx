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
  canClearHistory,
}: {
  employees: EmployeeListItem[];
  payments: SalaryPayment[];
  canProcess: boolean;
  canReverse: boolean;
  canClearHistory: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");
  const [selectedHistory, setSelectedHistory] = useState<string[]>([]);
  const allVisibleSelected =
    payments.length > 0 && payments.every((payment) => selectedHistory.includes(payment.id));

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
    const paymentMethod = window.prompt("Payment method", "Bank transfer") ?? "";
    setError("");
    setMessage("");
    setLoading(`paid:${payment.id}`);

    const response = await fetch(
      `/api/v1/salary-payments/${payment.id}/mark-paid`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
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

  async function setStatus(payment: SalaryPayment, status: "DRAFT" | "PROCESSING" | "FAILED") { setLoading(`status:${payment.id}`); const response = await fetch(`/api/v1/salary-payments/${payment.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }); const payload = (await response.json()) as ApiResponse; setLoading(""); if (!payload.success) setError(payload.error.message); else { setMessage(`Payment moved to ${status}.`); router.refresh(); } }

  function toggleHistorySelection(paymentId: string) {
    setSelectedHistory((current) =>
      current.includes(paymentId)
        ? current.filter((id) => id !== paymentId)
        : [...current, paymentId],
    );
  }

  function toggleAllHistory() {
    setSelectedHistory(allVisibleSelected ? [] : payments.map((payment) => payment.id));
  }

  async function clearSelectedHistory() {
    if (!selectedHistory.length) {
      setError("Select at least one salary history row to clear.");
      return;
    }

    const confirmed = window.confirm(
      `Clear ${selectedHistory.length} selected salary payment history record(s)? This deletes them from MongoDB.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setLoading("clear-history");

    const results = await Promise.all(
      selectedHistory.map(async (paymentId) => {
        const response = await fetch(`/api/v1/salary-payments/${paymentId}`, {
          method: "DELETE",
        });
        const payload = (await response.json()) as ApiResponse;
        return { paymentId, payload };
      }),
    );
    const failed = results.find((result) => !result.payload.success);
    setLoading("");

    if (failed && !failed.payload.success) {
      setError(failed.payload.error.message);
      return;
    }

    setSelectedHistory([]);
    setMessage(`${results.length} salary history record(s) cleared.`);
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">
            Salary payment history
          </h2>
          {canClearHistory ? (
            <button
              type="button"
              onClick={clearSelectedHistory}
              disabled={!selectedHistory.length || Boolean(loading)}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "clear-history"
                ? "Clearing..."
                : `Clear selected${selectedHistory.length ? ` (${selectedHistory.length})` : ""}`}
            </button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                {canClearHistory ? (
                  <th className="px-5 py-3 font-medium">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllHistory}
                      aria-label="Select all salary history"
                      className="h-4 w-4"
                    />
                  </th>
                ) : null}
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
                  {canClearHistory ? (
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selectedHistory.includes(payment.id)}
                        onChange={() => toggleHistorySelection(payment.id)}
                        aria-label={`Select salary history for ${payment.employeeName} ${payment.payPeriod}`}
                        className="h-4 w-4"
                      />
                    </td>
                  ) : null}
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
                      {["DRAFT", "PROCESSING"].includes(payment.status) ? (
                        <><button
                          type="button"
                          onClick={() => markPaid(payment)}
                          disabled={Boolean(loading)}
                          className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400"
                        >
                          Mark paid
                        </button>{payment.status !== "PROCESSING" ? <button type="button" onClick={() => setStatus(payment, "PROCESSING")} className="ml-2 text-sm text-slate-700 underline">Processing</button> : null}<button type="button" onClick={() => setStatus(payment, payment.status === "FAILED" ? "DRAFT" : "FAILED")} className="ml-2 text-sm text-amber-700 underline">{payment.status === "FAILED" ? "Retry draft" : "Failed"}</button></>
                      ) : null}
                      {payment.status === "FAILED" ? <button type="button" onClick={() => setStatus(payment, "DRAFT")} className="text-sm text-amber-700 underline">Retry as draft</button> : null}
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
                    </td>
                  ) : null}
                </tr>
              ))}
              {!payments.length ? (
                <tr>
                  <td
                    className="px-5 py-5 text-slate-600"
                    colSpan={historyTableColumnCount(canProcess, canClearHistory)}
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

function historyTableColumnCount(canProcess: boolean, canClearHistory: boolean) {
  return 6 + (canProcess ? 1 : 0) + (canClearHistory ? 1 : 0);
}
