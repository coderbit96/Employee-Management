import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/db/mongoose";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionToken, toSafeUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";
import type { LoginInput } from "@/lib/validation/auth";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 401,
  ) {
    super(message);
  }
}

export async function loginUser(
  input: LoginInput,
  context: { requestId?: string; ipHash?: string; userAgent?: string },
) {
  await connectToDatabase();

  const identifier = input.identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: identifier }, { loginId: identifier }],
  }).select("+passwordHash +failedLoginCount +lockUntil +sessionVersion");

  if (!user) {
    throw new AuthError("INVALID_CREDENTIALS", "Invalid credentials.");
  }

  if (user.status === "SUSPENDED" || user.status === "OFFBOARDED") {
    throw new AuthError("ACCOUNT_DISABLED", "This account cannot sign in.", 403);
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new AuthError(
      "ACCOUNT_LOCKED",
      "Too many failed attempts. Please try again later.",
      423,
    );
  }

  const validPassword = await verifyPassword(input.password, user.passwordHash);

  if (!validPassword) {
    user.failedLoginCount = (user.failedLoginCount ?? 0) + 1;

    if (user.failedLoginCount >= MAX_FAILED_LOGINS) {
      user.status = "LOCKED";
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    }

    await user.save();
    await writeAuditLog({
      action: "AUTH_LOGIN_FAILED",
      entityType: "User",
      entityId: user._id,
      requestId: context.requestId,
      ipHash: context.ipHash,
      userAgent: context.userAgent,
      summary: { identifier },
    });

    throw new AuthError("INVALID_CREDENTIALS", "Invalid credentials.");
  }

  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  user.status = user.status === "INVITED" || user.status === "LOCKED" ? "ACTIVE" : user.status;
  user.lastLoginAt = new Date();
  await user.save();

  const safeUser = toSafeUser(user);
  const token = await signSessionToken({
    sub: user._id.toString(),
    role: user.role,
    permissions: user.permissions ?? [],
    sessionVersion: user.sessionVersion,
  });

  await writeAuditLog({
    actor: safeUser,
    action: "AUTH_LOGIN_SUCCEEDED",
    entityType: "User",
    entityId: user._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
  });

  return {
    user: safeUser,
    token,
  };
}

