import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  deleteSalaryPaymentHistory,
  PayrollServiceError,
} from "@/services/payroll-service";

export const runtime = "nodejs";

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

