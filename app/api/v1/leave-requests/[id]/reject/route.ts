import { NextRequest } from "next/server";
import {
  apiError,
  apiOk,
  getRequestContext,
  validationError,
} from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { leaveDecisionSchema } from "@/lib/validation/leave-request";
import {
  LeaveRequestServiceError,
  rejectLeaveRequest,
} from "@/services/leave-request-service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = getRequestContext(request);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return apiError("UNAUTHENTICATED", "Please sign in.", {
      status: 401,
      requestId: context.requestId,
    });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = leaveDecisionSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const { id } = await params;
    const data = await rejectLeaveRequest(id, parsed.data, currentUser, context);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof LeaveRequestServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("LEAVE_REJECTION_FAILED", "Unable to reject leave.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

