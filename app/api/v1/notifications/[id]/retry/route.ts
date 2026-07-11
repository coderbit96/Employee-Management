import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { retryEmailNotification } from "@/services/notification-service";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const context = getRequestContext(request); const actor = await getCurrentUser(); if (!actor) return apiError("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId: context.requestId }); try { return apiOk(await retryEmailNotification((await params).id, actor), { requestId: context.requestId }); } catch (error) { return apiError("EMAIL_RETRY_FAILED", error instanceof Error ? error.message : "Unable to retry email.", { status: 400, requestId: context.requestId }); } }
