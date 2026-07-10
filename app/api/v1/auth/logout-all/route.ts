import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext } from "@/lib/api/response";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth/session";
import { AuthError, logoutAllSessions } from "@/services/auth-service";

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
    const data = await logoutAllSessions(currentUser.id, context);
    const response = apiOk(data, { requestId: context.requestId });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("LOGOUT_ALL_FAILED", "Unable to log out all sessions.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}
