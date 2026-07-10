import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext, validationError } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { AuthError, loginUser } from "@/services/auth-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const rateLimit = checkRateLimit(request, "auth-login", {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: 10,
  });

  if (rateLimit.limited) {
    return apiError("RATE_LIMITED", "Too many login attempts. Please try again later.", {
      status: 429,
      requestId: context.requestId,
    });
  }

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

    if (
      process.env.NODE_ENV !== "production" &&
      error instanceof Error &&
      error.message.includes("MongoDB")
    ) {
      return apiError("CONFIGURATION_ERROR", error.message, {
        status: 500,
        requestId: context.requestId,
      });
    }

    return apiError("LOGIN_FAILED", "Unable to sign in right now.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}
