import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), geolocation=(self), microphone=()",
  );
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; frame-ancestors 'none'",
  );

  if (
    pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    const origin = request.headers.get("origin");

    if (origin && new URL(origin).host !== request.nextUrl.host) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_ORIGIN",
            message: "Cross-origin mutation requests are not allowed.",
          },
        },
        { status: 403 },
      );
    }
  }

  if (
    (pathname === "/dashboard" ||
      pathname === "/users" ||
      pathname === "/employees" ||
      pathname === "/payroll" ||
      pathname === "/audit") &&
    !hasSession
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/dashboard",
    "/users",
    "/employees",
    "/payroll",
    "/audit",
    "/api/:path*",
  ],
};
