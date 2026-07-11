import { NextRequest } from "next/server";
import { apiError, apiOk, getRequestContext } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { AttendanceCorrectionError, listAttendanceCorrections } from "@/services/attendance-correction-service";
export async function GET(request: NextRequest) { const context = getRequestContext(request); const actor = await getCurrentUser(); if (!actor) return apiError("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId: context.requestId }); try { return apiOk(await listAttendanceCorrections(actor), { requestId: context.requestId }); } catch (error) { return error instanceof AttendanceCorrectionError ? apiError(error.code, error.message, { status: error.status, requestId: context.requestId }) : apiError("CORRECTIONS_FAILED", "Unable to load corrections.", { status: 500, requestId: context.requestId }); } }
