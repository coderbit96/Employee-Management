"use client";

import { useState } from "react";
import type { AttendanceSummary } from "@/services/attendance-service";
import { AttendanceMap } from "@/components/attendance/attendance-map";

export function AttendanceHistory({
  records,
}: {
  records: AttendanceSummary[];
}) {
  const [message, setMessage] = useState("");

  async function requestCorrection(record: AttendanceSummary) {
    const checkInAt = window.prompt("Correct check-in time (ISO date/time):", record.checkInAt);
    if (!checkInAt) return;
    const checkOutAt = window.prompt("Correct check-out time (ISO date/time, optional):", record.checkOutAt ?? "");
    const reason = window.prompt("Reason for correction:");
    if (!reason) return;
    const response = await fetch(`/api/v1/attendance/${record.id}/corrections`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checkInAt, checkOutAt: checkOutAt || undefined, reason }) });
    const payload = await response.json();
    setMessage(payload.success ? "Correction request submitted." : payload.error?.message ?? "Unable to request correction.");
  }
  const mapPoints = records.flatMap((record) => record.id && record.checkInLocation ? [{ id: record.id, employeeName: record.employeeName, workDate: record.workDate, ...record.checkInLocation }] : []);
  return (<div className="space-y-4">
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-sm font-medium text-emerald-800">Attendance records</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          Recent completed records
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-5 py-3 font-medium">Employee</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Check in</th>
              <th className="px-5 py-3 font-medium">Check out</th>
              <th className="px-5 py-3 font-medium">Duration</th>
              <th className="px-5 py-3 font-medium">Exception</th>
              <th className="px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => (
              <tr key={record.id}>
                <td className="px-5 py-3 text-slate-900">
                  {record.employeeName ?? "Me"}
                </td>
                <td className="px-5 py-3 text-slate-700">{record.workDate}</td>
                <td className="px-5 py-3 text-slate-700">
                  {formatTime(record.checkInAt)}
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {formatTime(record.checkOutAt)}
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {formatDuration(record.durationMinutes)}
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {record.exception ?? "NONE"}
                </td>
                <td className="px-5 py-3">{record.ownedByActor ? <button type="button" onClick={() => requestCorrection(record)} className="text-emerald-700 underline">Request correction</button> : "-"}</td>
              </tr>
            ))}
            {!records.length ? (
              <tr>
                <td className="px-5 py-5 text-slate-600" colSpan={7}>
                  No attendance records yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {message ? <p className="border-t border-slate-200 px-5 py-3 text-sm text-slate-700">{message}</p> : null}
    </section>
    <AttendanceMap points={mapPoints} />
  </div>
  );
}

function formatTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
