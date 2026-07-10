import { NextRequest } from "next/server";
import {
  apiError,
  apiOk,
  getRequestContext,
  validationError,
} from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { createLeaveMessageSchema } from "@/lib/validation/leave-message";
import {
  LeaveMessageServiceError,
  listLeaveInbox,
  sendLeaveMessage,
} from "@/services/leave-message-service";

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
    const data = await listLeaveInbox(currentUser);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof LeaveMessageServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("LEAVE_INBOX_FAILED", "Unable to load leave mail.", {
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
  const parsed = createLeaveMessageSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const data = await sendLeaveMessage(parsed.data, currentUser, context);
    return apiOk(data, { status: 201, requestId: context.requestId });
  } catch (error) {
    if (error instanceof LeaveMessageServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("LEAVE_MAIL_FAILED", "Unable to send leave mail.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

