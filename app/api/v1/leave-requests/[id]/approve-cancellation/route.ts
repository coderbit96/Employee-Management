import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  decideLeaveCancellation,
  LeaveRequestServiceError,
} from "@/services/leave-request-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = getRequestContext(request);
  const actor = await getCurrentUser();

  if (!actor) {
    return apiError("UNAUTHENTICATED", "Please sign in.", {
      status: 401,
      requestId: context.requestId,
    });
  }

  try {
    return apiOk(
      await decideLeaveCancellation((await params).id, true, actor, context),
      { requestId: context.requestId },
    );
  } catch (error) {
    return error instanceof LeaveRequestServiceError
      ? apiError(error.code, error.message, {
          status: error.status,
          requestId: context.requestId,
        })
      : apiError("CANCELLATION_DECISION_FAILED", "Unable to decide cancellation.", {
          status: 500,
          requestId: context.requestId,
        });
  }
}
