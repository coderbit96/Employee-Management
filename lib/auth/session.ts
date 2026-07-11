import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ROLES, type Permission, type Role, type SafeUser } from "@/types/domain";

export const SESSION_COOKIE_NAME = "ems_session";

type SessionPayload = {
  sub: string;
  role: Role;
  permissions: Permission[];
  sessionVersion: number;
  forcePasswordChange: boolean;
};

function getSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is required.");
  }

  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT({
    role: payload.role,
    permissions: [...payload.permissions],
    sessionVersion: payload.sessionVersion,
    forcePasswordChange: payload.forcePasswordChange,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_TTL ?? "8h")
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return {
    sub: payload.sub,
    role: payload.role,
    permissions: payload.permissions,
    sessionVersion: payload.sessionVersion,
    forcePasswordChange: Boolean(payload.forcePasswordChange),
  } as SessionPayload & { sub: string };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function toSafeUser(user: {
  _id: { toString(): string };
  email?: string | null;
  loginId?: string | null;
  role: Role;
  permissions: Permission[];
  status: SafeUser["status"];
  forcePasswordChange: boolean;
  lastLoginAt?: Date | null;
}): SafeUser {
  return {
    id: user._id.toString(),
    email: user.email ?? user.loginId ?? "unknown",
    loginId: user.loginId ?? undefined,
    role: user.role,
    permissions: Array.from(user.permissions ?? []),
    status: user.status,
    // The bootstrap Super Admin is created directly by the trusted seed process,
    // not with an administrator-issued temporary password. Provisioned accounts
    // still have to complete their mandatory first-login password change.
    forcePasswordChange:
      user.role === "SUPER_ADMIN" ? false : user.forcePasswordChange,
    lastLoginAt: user.lastLoginAt?.toISOString(),
  };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const session = await verifySessionToken(token);
    await connectToDatabase();
    const user = await User.findById(session.sub)
      .select("+sessionVersion")
      .lean();

    if (
      !user ||
      !ROLES.includes(user.role) ||
      user.status !== "ACTIVE" ||
      user.sessionVersion !== session.sessionVersion
    ) {
      return null;
    }

    return toSafeUser(user);
  } catch {
    return null;
  }
}
