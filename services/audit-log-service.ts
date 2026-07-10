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

  if (actor.role !== "SUPER_ADMIN") {
    throw new AuditLogServiceError(
      "INSUFFICIENT_PERMISSION",
      "Only the Super Admin can view audit logs.",
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
