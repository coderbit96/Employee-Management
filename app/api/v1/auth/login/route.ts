import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext, validationError } from "@/lib/api/response";
import { setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { AuthError, loginUser } from "@/services/auth-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const result = await loginUser(parsed.data, context);
    const response = apiOk(
      {
        user: result.user,
        forcePasswordChange: result.user.forcePasswordChange,
      },
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

    return apiError("LOGIN_FAILED", "Unable to sign in right now.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

