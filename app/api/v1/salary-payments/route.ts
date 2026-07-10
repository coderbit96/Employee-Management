import { NextRequest } from "next/server";
import {
  apiError,
  apiOk,
  getRequestContext,
  validationError,
} from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createSalaryPaymentSchema,
  listSalaryPaymentsQuerySchema,
} from "@/lib/validation/payroll";
import {
  createSalaryPayment,
  listSalaryPayments,
  PayrollServiceError,
} from "@/services/payroll-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = getRequestContext(request);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return apiError("UNAUTHENTICATED", "Please sign in.", {
      status: 401,
      requestId: context.requestId,
    });
  }

  const parsed = listSalaryPaymentsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const data = await listSalaryPayments(currentUser, parsed.data);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof PayrollServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("PAYROLL_LIST_FAILED", "Unable to load payroll.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

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
  const parsed = createSalaryPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const data = await createSalaryPayment(parsed.data, currentUser, context);
    return apiOk(data, { status: 201, requestId: context.requestId });
  } catch (error) {
    if (error instanceof PayrollServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("PAYROLL_CREATE_FAILED", "Unable to create payment.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

