import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  AttendanceServiceError,
  listAttendanceRecords,
} from "@/services/attendance-service";

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
    const data = await listAttendanceRecords(currentUser);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof AttendanceServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("ATTENDANCE_LIST_FAILED", "Unable to load attendance.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}
