import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext, validationError } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { userStatusActionSchema } from "@/lib/validation/user";
import { reactivateUser, UserServiceError } from "@/services/user-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = getRequestContext(request); const actor = await getCurrentUser();
  if (!actor) return apiError("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId: context.requestId });
  const parsed = userStatusActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, context.requestId);
  try { return apiOk(await reactivateUser((await params).id, parsed.data.reason, actor, context), { requestId: context.requestId }); }
  catch (error) { return handle(error, context.requestId); }
}
function handle(error: unknown, requestId: string) { return error instanceof UserServiceError ? apiError(error.code, error.message, { status: error.status, requestId }) : apiError("USER_REACTIVATE_FAILED", "Unable to reactivate account.", { status: 500, requestId }); }
