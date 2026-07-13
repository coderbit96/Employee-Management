import { AuditLog } from "@/models/AuditLog";
import { connectToDatabase } from "@/lib/db/mongoose";
import type { SafeUser } from "@/types/domain";

export class AuditLogServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function listAuditLogs(actor: SafeUser) {
  await connectToDatabase();

  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role) && !actor.permissions.includes("VIEW_AUDIT_LOGS")) {
    throw new AuditLogServiceError(
      "INSUFFICIENT_PERMISSION",
      "You cannot view audit logs.",
      403,
    );
  }

  const logs = await AuditLog.find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return {
    auditLogs: logs.map((log) => ({
      id: log._id.toString(),
      actorRole: log.actorRole,
      action: log.action,
      entityType: log.entityType,
      requestId: log.requestId,
      summary: log.summary ?? {},
      createdAt: log.createdAt?.toISOString(),
    })),
  };
}

export async function clearAuditLogs(actor: SafeUser) {
  await connectToDatabase();

  if (actor.role !== "SUPER_ADMIN") {
    throw new AuditLogServiceError(
      "INSUFFICIENT_PERMISSION",
      "Only the Super Admin can clear audit logs.",
      403,
    );
  }

  const result = await AuditLog.deleteMany({});

  return { deletedCount: result.deletedCount ?? 0 };
}
