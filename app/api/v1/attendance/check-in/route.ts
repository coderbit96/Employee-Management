import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { AttendanceServiceError, checkIn } from "@/services/attendance-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return apiError("UNAUTHENTICATED", "Please sign in.", {
      status: 401,
      requestId: context.requestId,
    });
  }

  try {
    const attendance = await checkIn(currentUser, context);
    return apiOk({ attendance }, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof AttendanceServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("CHECK_IN_FAILED", "Unable to check in.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

