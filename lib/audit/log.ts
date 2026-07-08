import type { Types } from "mongoose";
import { AuditLog } from "@/models/AuditLog";
import type { SafeUser } from "@/types/domain";

type AuditInput = {
  actor?: SafeUser | null;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | string;
  requestId?: string;
  ipHash?: string;
  userAgent?: string;
  summary?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput) {
  await AuditLog.create({
    actorId: input.actor?.id,
    actorRole: input.actor?.role,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    requestId: input.requestId,
    ipHash: input.ipHash,
    userAgent: input.userAgent,
    summary: input.summary ?? {},
    metadata: input.metadata ?? {},
  });
}

