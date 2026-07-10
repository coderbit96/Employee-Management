"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LeaveRequest = {
  id: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  requestedDays: number;
  paidDays: number;
  unpaidDays: number;
  excludedDates: string[];
  approvalRoute: string[];
  reason: string;
  status: string;
};

type ApiResponse =
  | { success: true; data: { leaveRequest?: LeaveRequest } }
  | { success: false; error: { message: string } };

export function LeaveRequestPanel({
  requests,
}: {
  requests: LeaveRequest[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(
    "Select dates to preview paid/unpaid split.",
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setMessage("");
    setError("");
    setLoading(true);

    const response = await fetch("/api/v1/leave-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        leaveType: form.get("leaveType"),
        startDate: form.get("startDate"),
        endDate: form.get("endDate"),
        halfDay: form.get("halfDay") === "on",
        reason: form.get("reason"),
      }),
    });
    const payload = (await response.json()) as ApiResponse;
    setLoading(false);

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    setMessage("Leave request submitted.");
    formElement.reset();
    setPreview("Select dates to preview paid/unpaid split.");
    router.refresh();
  }

  function updatePreview(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    const startDate = String(form.get("startDate") ?? "");
    const endDate = String(form.get("endDate") ?? "");
    const halfDay = form.get("halfDay") === "on";
    const leaveType = String(form.get("leaveType") ?? "PAID");

    if (!startDate || !endDate) {
      setPreview("Select dates to preview paid/unpaid split.");
      return;
    }

    const days = halfDay
      ? 0.5
      : countWeekdays(new Date(startDate), new Date(endDate));
    const paidDays = leaveType === "UNPAID" ? 0 : days;
    const unpaidDays = Math.max(0, days - paidDays);
    setPreview(
      `Preview: ${paidDays} paid day(s), ${unpaidDays} unpaid day(s). Weekends are excluded; holidays and balance are finalized by the server.`,
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Request leave</h2>
      <form
        onSubmit={onSubmit}
        onChange={updatePreview}
        className="mt-4 grid gap-4 md:grid-cols-2"
      >
        <label className="block text-sm font-medium text-slate-800">
          Leave type
          <select
            name="leaveType"
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            defaultValue="PAID"
          >
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="SICK">Sick</option>
            <option value="CASUAL">Casual</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <Field name="startDate" label="Start date" type="date" />
        <Field name="endDate" label="End date" type="date" />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input name="halfDay" type="checkbox" className="h-4 w-4" />
          Half day
        </label>
        <label className="block text-sm font-medium text-slate-800 md:col-span-2">
          Reason
          <textarea
            name="reason"
            className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2"
            required
          />
        </label>
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 md:col-span-2">
          {preview}
        </p>
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
          disabled={loading}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400 md:col-span-2"
        >
          {loading ? "Submitting..." : "Submit leave request"}
        </button>
      </form>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-950">My leave requests</h3>
        <div className="mt-3 divide-y divide-slate-100">
          {requests.map((request) => (
            <article key={request.id} className="py-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-medium text-slate-950">
                  {request.leaveType} - {request.requestedDays} day(s)
                </p>
                <span className="text-slate-600">{request.status}</span>
              </div>
              <p className="mt-1 text-slate-600">
                {formatDate(request.startDate)} to {formatDate(request.endDate)}
              </p>
              <p className="mt-1 text-slate-600">
                Paid: {request.paidDays} day(s), unpaid: {request.unpaidDays} day(s)
                {request.excludedDates.length
                  ? `, excluded: ${request.excludedDates.join(", ")}`
                  : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Approval route: {request.approvalRoute.join(" -> ") || "-"}
              </p>
              <p className="mt-1 text-slate-700">{request.reason}</p>
            </article>
          ))}
          {!requests.length ? (
            <p className="py-3 text-sm text-slate-600">
              No leave requests submitted yet.
            </p>
          ) : null}
        </div>
      </div>
    </section>
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
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
        required
      />
    </label>
  );
}

function countWeekdays(startDate: Date, endDate: Date) {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
