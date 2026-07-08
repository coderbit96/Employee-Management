import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

type ApiErrorOptions = {
  status?: number;
  fieldErrors?: unknown;
  requestId?: string;
};

export function apiOk<T>(data: T, init?: { status?: number; requestId?: string }) {
  return NextResponse.json(
    {
      success: true,
      data,
      requestId: init?.requestId,
    },
    { status: init?.status ?? 200 },
  );
}

export function apiError(
  code: string,
  message: string,
  options: ApiErrorOptions = {},
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        fieldErrors: options.fieldErrors,
      },
      requestId: options.requestId,
    },
    { status: options.status ?? 500 },
  );
}

export function validationError(error: ZodError, requestId?: string) {
  return apiError("VALIDATION_ERROR", "Please correct the highlighted fields.", {
    status: 400,
    fieldErrors: error.flatten(),
    requestId,
  });
}

export function getRequestContext(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id") ?? crypto.randomUUID().slice(0, 12);
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() ?? "";
  const ipHash = ip
    ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 24)
    : undefined;

  return {
    requestId,
    ipHash,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}

