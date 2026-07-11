"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LeaveRequest = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  paidDays: number;
  unpaidDays: number;
  reason: string;
  status: string;
};

type ApiResponse =
  | { success: true; data: unknown }
  | { success: false; error: { message: string } };

export function LeaveApprovalInbox({
  requests,
}: {
  requests: LeaveRequest[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");

  async function decide(id: string, action: "approve" | "reject") {
    setError("");
    setLoading(`${action}:${id}`);

    const request = requests.find((item) => item.id === id);
    const endpoint = request?.status === "CANCELLATION_PENDING" ? `${action}-cancellation` : action;
    const response = await fetch(`/api/v1/leave-requests/${id}/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    const payload = (await response.json()) as ApiResponse;
    setLoading("");

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    router.refresh();
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-800">Approval inbox</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Pending leave and cancellation requests
          </h2>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
          {requests.length} pending
        </span>
      </div>
      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 divide-y divide-slate-100">
        {requests.map((request) => (
          <article key={request.id} className="py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">
                  {request.employeeName} - {request.leaveType}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {request.employeeEmail} - {request.employeeRole}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatDate(request.startDate)} to {formatDate(request.endDate)} -{" "}
                  {request.requestedDays} day(s)
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Paid: {request.paidDays} day(s), unpaid: {request.unpaidDays} day(s)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => decide(request.id, "approve")}
                  disabled={Boolean(loading)}
                  className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400"
                >
                  {loading === `approve:${request.id}` ? "Approving..." : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => decide(request.id, "reject")}
                  disabled={Boolean(loading)}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {loading === `reject:${request.id}` ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {request.reason}
            </p>
          </article>
        ))}
        {!requests.length ? (
          <p className="py-5 text-sm text-slate-600">
            No pending leave requests.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
