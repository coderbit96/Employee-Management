import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext, validationError } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  deleteSalaryPaymentHistory,
  PayrollServiceError,
  updateSalaryPayment,
} from "@/services/payroll-service";
import { updateSalaryPaymentSchema } from "@/lib/validation/payroll";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = getRequestContext(request); const actor = await getCurrentUser();
  if (!actor) return apiError("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId: context.requestId });
  const parsed = updateSalaryPaymentSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return validationError(parsed.error, context.requestId);
  try { return apiOk(await updateSalaryPayment((await params).id, parsed.data, actor, context), { requestId: context.requestId }); } catch (error) { return error instanceof PayrollServiceError ? apiError(error.code, error.message, { status: error.status, requestId: context.requestId }) : apiError("PAYROLL_UPDATE_FAILED", "Unable to update salary payment.", { status: 500, requestId: context.requestId }); }
}

export async function DELETE(
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
    const data = await deleteSalaryPaymentHistory(id, currentUser, context);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof PayrollServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("PAYROLL_DELETE_FAILED", "Unable to delete salary history.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}
