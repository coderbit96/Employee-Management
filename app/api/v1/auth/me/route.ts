import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = getRequestContext(request);
  const user = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "Please sign in.", {
      status: 401,
      requestId: context.requestId,
    });
  }

  return apiOk({ user }, { requestId: context.requestId });
}

