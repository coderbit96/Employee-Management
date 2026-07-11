import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listAuditLogs } from "@/services/audit-log-service";

export default async function AuditPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role) && !user.permissions.includes("VIEW_AUDIT_LOGS")) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Your role cannot view audit logs.
      </div>
    );
  }

  const data = await listAuditLogs(user);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-yellow-500/25 bg-[#0d0b07] p-6 shadow-xl shadow-yellow-950/10">
        <p className="text-sm font-medium text-yellow-400">Audit</p>
        <h1 className="mt-2 text-2xl font-semibold text-yellow-50">
          Operational audit logs
        </h1>
      </section>
      <section className="overflow-hidden rounded-lg border border-yellow-600/20 bg-white shadow-sm">
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
              {data.auditLogs.map((log) => (
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
              {!data.auditLogs.length ? (
                <tr>
                  <td className="px-5 py-5 text-slate-600" colSpan={5}>
                    No audit logs found.
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
