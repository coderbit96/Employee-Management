import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  AuditLogServiceError,
  clearAuditLogs,
  listAuditLogs,
} from "@/services/audit-log-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = getRequestContext(request);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return apiError("UNAUTHENTICATED", "Please sign in.", {
      status: 401,
      requestId: context.requestId,
    });
  }

  try {
    const data = await listAuditLogs(currentUser);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof AuditLogServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("AUDIT_LOGS_FAILED", "Unable to load audit logs.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

export async function DELETE(request: NextRequest) {
  const context = getRequestContext(request);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return apiError("UNAUTHENTICATED", "Please sign in.", {
      status: 401,
      requestId: context.requestId,
    });
  }

  try {
    const data = await clearAuditLogs(currentUser);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof AuditLogServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("AUDIT_LOGS_CLEAR_FAILED", "Unable to clear audit logs.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}
