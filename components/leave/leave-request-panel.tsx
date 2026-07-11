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
  | {
      success: false;
      error: {
        message: string;
        fieldErrors?: {
          fieldErrors?: Record<string, string[] | undefined>;
          formErrors?: string[];
        };
      };
    };

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
    const startDate = String(form.get("startDate") ?? "");
    const halfDay = form.get("halfDay") === "on";
    setMessage("");
    setError("");
    setLoading(true);

    const response = await fetch("/api/v1/leave-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        leaveType: form.get("leaveType"),
        startDate,
        endDate: halfDay ? startDate : form.get("endDate"),
        halfDay,
        reason: form.get("reason"),
      }),
    });
    const payload = (await response.json()) as ApiResponse;
    setLoading(false);

    if (!payload.success) {
      setError(getApiErrorMessage(payload));
      return;
    }

    setMessage("Leave request submitted.");
    formElement.reset();
    setPreview("Select dates to preview paid/unpaid split.");
    router.refresh();
  }

  async function withdraw(request: LeaveRequest) {
    const reason = window.prompt("Why are you withdrawing this request?");
    if (!reason) return;
    const response = await fetch(`/api/v1/leave-requests/${request.id}/withdraw`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
    const payload = (await response.json()) as ApiResponse;
    if (!payload.success) setError(payload.error.message); else { setMessage("Leave request withdrawn."); router.refresh(); }
  }

  async function requestCancellation(request: LeaveRequest) { const reason = window.prompt("Why should this approved leave be cancelled?"); if (!reason) return; const response = await fetch(`/api/v1/leave-requests/${request.id}/request-cancellation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) }); const payload = (await response.json()) as ApiResponse; if (!payload.success) setError(payload.error.message); else { setMessage("Cancellation sent for approval."); router.refresh(); } }

  async function editRequest(request: LeaveRequest) { const startDate=window.prompt("Start date (YYYY-MM-DD)",request.startDate.slice(0,10)); if(!startDate)return; const endDate=window.prompt("End date (YYYY-MM-DD)",request.endDate.slice(0,10)); if(!endDate)return; const leaveType=window.prompt("Leave type: PAID, UNPAID, SICK, CASUAL, OTHER",request.leaveType); if(!leaveType)return; const reason=window.prompt("Reason",request.reason); if(!reason)return; const response=await fetch(`/api/v1/leave-requests/${request.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({leaveType,startDate,endDate,halfDay:request.halfDay,reason})});const payload=(await response.json()) as ApiResponse;if(!payload.success)setError(payload.error.message);else{setMessage("Leave request updated.");router.refresh();} }

  function updatePreview(event: FormEvent<HTMLFormElement>) {
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const startDate = String(form.get("startDate") ?? "");
    const halfDay = form.get("halfDay") === "on";
    const endDateInput = formElement.elements.namedItem("endDate");
    if (
      halfDay &&
      startDate &&
      endDateInput instanceof HTMLInputElement &&
      endDateInput.value !== startDate
    ) {
      endDateInput.value = startDate;
    }
    const endDate = halfDay ? startDate : String(form.get("endDate") ?? "");
    const leaveType = String(form.get("leaveType") ?? "PAID");

    if (!startDate || !endDate) {
      setPreview("Select dates to preview paid/unpaid split.");
      return;
    }

    const days = halfDay
      ? 0.5
      : countOfficeDays(new Date(startDate), new Date(endDate));
    const paidDays = leaveType === "UNPAID" ? 0 : days;
    const unpaidDays = Math.max(0, days - paidDays);
    setPreview(
      `Preview: ${paidDays} paid day(s), ${unpaidDays} unpaid day(s). Sundays are excluded; holidays and balance are finalized by the server.`,
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
            minLength={3}
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
              {["PENDING", "REJECTED"].includes(request.status) ? <button type="button" onClick={() => withdraw(request)} className="mt-2 text-sm font-medium text-red-700 underline">Withdraw request</button> : null}
              {request.status === "PENDING" ? <button type="button" onClick={() => editRequest(request)} className="ml-3 mt-2 text-sm font-medium text-emerald-700 underline">Edit request</button> : null}
              {request.status === "APPROVED" ? <button type="button" onClick={() => requestCancellation(request)} className="mt-2 text-sm font-medium text-amber-700 underline">Request cancellation</button> : null}
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

function countOfficeDays(startDate: Date, endDate: Date) {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0) {
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

function getApiErrorMessage(payload: Extract<ApiResponse, { success: false }>) {
  const fieldErrors = payload.error.fieldErrors?.fieldErrors;
  const messages = fieldErrors
    ? Object.values(fieldErrors).flatMap((items) => items ?? [])
    : [];
  const formErrors = payload.error.fieldErrors?.formErrors ?? [];
  const details = [...messages, ...formErrors].filter(Boolean);

  return details.length ? details.join(" ") : payload.error.message;
}
