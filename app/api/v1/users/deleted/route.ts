import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { clearDeletedUsers, UserServiceError } from "@/services/user-service";

export const runtime = "nodejs";

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
    const data = await clearDeletedUsers(currentUser, context);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof UserServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("DELETED_USERS_CLEAR_FAILED", "Unable to clear deleted users.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}
