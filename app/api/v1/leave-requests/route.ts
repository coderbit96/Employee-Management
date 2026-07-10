import { NextRequest } from "next/server";
import {
  apiError,
  apiOk,
  getRequestContext,
  validationError,
} from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createLeaveRequestSchema,
  listLeaveRequestsQuerySchema,
} from "@/lib/validation/leave-request";
import {
  createLeaveRequest,
  LeaveRequestServiceError,
  listLeaveRequests,
} from "@/services/leave-request-service";

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

  const parsed = listLeaveRequestsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const data = await listLeaveRequests(currentUser, parsed.data);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof LeaveRequestServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("LEAVE_REQUESTS_FAILED", "Unable to load leave requests.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return apiError("UNAUTHENTICATED", "Please sign in.", {
      status: 401,
      requestId: context.requestId,
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = createLeaveRequestSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const data = await createLeaveRequest(parsed.data, currentUser, context);
    return apiOk(data, { status: 201, requestId: context.requestId });
  } catch (error) {
    if (error instanceof LeaveRequestServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("LEAVE_REQUEST_FAILED", "Unable to request leave.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

