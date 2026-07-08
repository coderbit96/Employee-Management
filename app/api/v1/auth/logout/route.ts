import { NextRequest } from "next/server";
import { apiOk, getRequestContext } from "@/lib/api/response";
import { clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const context = getRequestContext(request);
  const response = apiOk({ loggedOut: true }, { requestId: context.requestId });
  clearSessionCookie(response);
  return response;
}

