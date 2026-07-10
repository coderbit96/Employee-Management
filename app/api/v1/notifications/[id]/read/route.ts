import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { markNotificationRead } from "@/services/notification-service";

export const runtime = "nodejs";

export async function PATCH(
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

  try {
    const { id } = await params;
    const data = await markNotificationRead(id, currentUser);
    return apiOk(data, { requestId: context.requestId });
  } catch {
    return apiError("NOTIFICATION_NOT_FOUND", "Notification not found.", {
      status: 404,
      requestId: context.requestId,
    });
  }
}
