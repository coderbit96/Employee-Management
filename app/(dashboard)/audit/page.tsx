import { redirect } from "next/navigation";
import { AuditLogTable } from "@/components/audit/audit-log-table";
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
      <section className="dashboard-hero rounded-lg border p-6 shadow-xl">
        <p className="text-sm font-medium text-cyan-200">Audit</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Operational audit logs
        </h1>
      </section>
      <AuditLogTable
        auditLogs={data.auditLogs}
        canClear={user.role === "SUPER_ADMIN"}
      />
    </div>
  );
}
