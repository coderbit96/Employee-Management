import { NextRequest } from "next/server";
import {
  apiError,
  apiOk,
  getRequestContext,
  validationError,
} from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { markPaidSchema } from "@/lib/validation/payroll";
import {
  markSalaryPaymentPaid,
  PayrollServiceError,
} from "@/services/payroll-service";

export const runtime = "nodejs";

export async function POST(
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

  const body = await request.json().catch(() => ({}));
  const parsed = markPaidSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const { id } = await params;
    const data = await markSalaryPaymentPaid(
      id,
      parsed.data,
      currentUser,
      context,
    );
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof PayrollServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("PAYROLL_MARK_PAID_FAILED", "Unable to mark paid.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

