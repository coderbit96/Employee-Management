import { NextRequest } from "next/server";
import {
  apiError,
  apiOk,
  getRequestContext,
  validationError,
} from "@/lib/api/response";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { requestPasswordReset } from "@/services/auth-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const result = await requestPasswordReset(parsed.data, context);
    return apiOk(
      {
        accepted: true,
        resetUrl: result.resetUrl,
        message:
          "If the account exists and can be reset, a reset link will be sent.",
      },
      { requestId: context.requestId },
    );
  } catch {
    return apiError("RESET_REQUEST_FAILED", "Unable to request reset.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

