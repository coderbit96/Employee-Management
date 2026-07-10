import { NextRequest } from "next/server";
import {
  apiError,
  apiOk,
  getRequestContext,
  validationError,
} from "@/lib/api/response";
import { setSessionCookie } from "@/lib/auth/session";
import { activateAccountSchema } from "@/lib/validation/auth";
import { activateAccount, AuthError } from "@/services/auth-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const body = await request.json().catch(() => null);
  const parsed = activateAccountSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const result = await activateAccount(parsed.data, context);
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

    return apiError("ACTIVATION_FAILED", "Unable to activate account.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

