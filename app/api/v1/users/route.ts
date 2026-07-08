import { NextRequest } from "next/server";
import {
  apiError,
  apiOk,
  getRequestContext,
  validationError,
} from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { createUserSchema, listUsersQuerySchema } from "@/lib/validation/user";
import {
  createProvisionedUser,
  listUsers,
  UserServiceError,
} from "@/services/user-service";

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
  const parsed = listUsersQuerySchema.safeParse(query);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const data = await listUsers(currentUser, parsed.data);
    return apiOk(data, { requestId: context.requestId });
  } catch (error) {
    if (error instanceof UserServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("USERS_LIST_FAILED", "Unable to list users.", {
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
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error, context.requestId);
  }

  try {
    const data = await createProvisionedUser(parsed.data, currentUser, context);
    return apiOk(data, { status: 201, requestId: context.requestId });
  } catch (error) {
    if (error instanceof UserServiceError) {
      return apiError(error.code, error.message, {
        status: error.status,
        requestId: context.requestId,
      });
    }

    return apiError("USER_CREATE_FAILED", "Unable to create account.", {
      status: 500,
      requestId: context.requestId,
    });
  }
}

