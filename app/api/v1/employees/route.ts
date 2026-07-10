import { NextRequest } from "next/server";
import {
  apiError,
  apiOk,
  getRequestContext,
  validationError,
} from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { listEmployeesQuerySchema } from "@/lib/validation/employee";
import {
  EmployeeServiceError,
  listEmployees,
} from "@/services/employee-service";

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

  const query = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = listEmployeesQuerySchema.safeParse(query);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const data = await listEmployees(currentUser, parsed.data);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof EmployeeServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("EMPLOYEES_LIST_FAILED", "Unable to list employees.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

