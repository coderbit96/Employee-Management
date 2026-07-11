import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkforceSummary } from "@/services/report-service";
export async function GET(request: NextRequest) { const context = getRequestContext(request); const actor = await getCurrentUser(); if (!actor) return apiError("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId: context.requestId }); try { return apiOk({ summary: await getWorkforceSummary(actor) }, { requestId: context.requestId }); } catch (error) { return apiError("REPORT_FAILED", error instanceof Error ? error.message : "Unable to load report.", { status: 403, requestId: context.requestId }); } }
