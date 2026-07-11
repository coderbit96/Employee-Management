import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasSession = Boolean(sessionToken);
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  if (sessionToken) {
    const session = await verifySessionToken(sessionToken).catch(() => null);
    const allowedDuringPasswordChange = pathname === "/dashboard" || pathname === "/api/v1/auth/change-password" || pathname === "/api/v1/auth/logout" || pathname === "/api/v1/auth/me";
    if (
      session?.forcePasswordChange &&
      session.role !== "SUPER_ADMIN" &&
      !allowedDuringPasswordChange
    ) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ success: false, error: { code: "PASSWORD_CHANGE_REQUIRED", message: "Change your temporary password first." } }, { status: 428 });
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

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
      pathname === "/reports" ||
      pathname === "/settings" ||
      pathname === "/profile" ||
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
    "/reports",
    "/settings",
    "/profile",
    "/audit",
    "/api/:path*",
  ],
};
