import { NextRequest } from "next/server";
import {
  apiError,
  apiOk,
  getRequestContext,
  validationError,
} from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { offboardEmployeeSchema } from "@/lib/validation/employee";
import {
  EmployeeServiceError,
  offboardEmployee,
} from "@/services/employee-service";

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

  const body = await request.json().catch(() => null);
  const parsed = offboardEmployeeSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const { id } = await params;
    const data = await offboardEmployee(id, parsed.data, currentUser, context);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof EmployeeServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("EMPLOYEE_OFFBOARD_FAILED", "Unable to offboard employee.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}
