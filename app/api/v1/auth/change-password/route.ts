import { NextRequest } from "next/server";
import {
  apiError,
  apiOk,
  getRequestContext,
  validationError,
} from "@/lib/api/response";
import { getCurrentUser, setSessionCookie } from "@/lib/auth/session";
import { changePasswordSchema } from "@/lib/validation/auth";
import { AuthError, changePassword } from "@/services/auth-service";

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

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const result = await changePassword(parsed.data, currentUser.id, context);
    const response = apiOk(
      { user: result.user },
      { requestId: context.requestId },
    );
    setSessionCookie(response, result.token);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("PASSWORD_CHANGE_FAILED", "Unable to change password.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

