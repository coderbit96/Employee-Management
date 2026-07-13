"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AuditLogItem = {
  id: string;
  actorRole?: string | null;
  action: string;
  entityType: string;
  summary: Record<string, unknown>;
  createdAt?: string;
};

export function AuditLogTable({
  auditLogs,
  canClear,
}: {
  auditLogs: AuditLogItem[];
  canClear: boolean;
}) {
  const router = useRouter();
  const [logs, setLogs] = useState(auditLogs);
  const [message, setMessage] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  async function clearAuditLogs() {
    if (!canClear || !logs.length || isClearing) {
      return;
    }

    setIsClearing(true);
    setMessage("");

    const response = await fetch("/api/v1/audit-logs", {
      method: "DELETE",
    });
    const payload = (await response.json()) as
      | { success: true; data: { deletedCount: number } }
      | { success: false; error: { message: string } };

    setIsClearing(false);

    if (!payload.success) {
      setMessage(payload.error.message);
      return;
    }

    setLogs([]);
    setMessage(`Cleared ${payload.data.deletedCount} audit log(s).`);
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-lg border border-yellow-600/20 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">Audit history</h2>
        {canClear ? (
          <button
            type="button"
            onClick={clearAuditLogs}
            disabled={!logs.length || isClearing}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-yellow-500 hover:bg-yellow-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
          >
            {isClearing ? "Clearing..." : "Clear logs"}
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-5 py-3 font-medium">Time</th>
              <th className="px-5 py-3 font-medium">Actor</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Entity</th>
              <th className="px-5 py-3 font-medium">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-5 py-3 text-slate-700">
                  {log.createdAt
                    ? new Date(log.createdAt).toLocaleString("en-IN")
                    : "-"}
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {log.actorRole ?? "SYSTEM"}
                </td>
                <td className="px-5 py-3 font-medium text-slate-950">
                  {log.action}
                </td>
                <td className="px-5 py-3 text-slate-700">{log.entityType}</td>
                <td className="max-w-md truncate px-5 py-3 text-slate-600">
                  {JSON.stringify(log.summary)}
                </td>
              </tr>
            ))}
            {!logs.length ? (
              <tr>
                <td className="px-5 py-5 text-slate-600" colSpan={5}>
                  No audit logs found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {message ? (
        <p className="border-t border-slate-200 px-5 py-3 text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
