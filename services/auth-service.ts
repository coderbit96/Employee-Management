import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  generateSecureToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "@/lib/auth/password";
import { signSessionToken, toSafeUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";
import { ROLES } from "@/types/domain";
import { sendEmail } from "@/lib/email/mailer";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from "@/lib/validation/auth";

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

  if (!ROLES.includes(user.role)) {
    throw new AuthError(
      "UNSUPPORTED_ROLE",
      "This account role is no longer supported. Please contact the Super Admin.",
      403,
    );
  }

  if (user.status === "SUSPENDED" || user.status === "OFFBOARDED") {
    throw new AuthError("ACCOUNT_DISABLED", "This account cannot sign in.", 403);
  }

  if (user.status === "INVITED") {
    throw new AuthError(
      "ACCOUNT_INVITED",
      "This account is not active. Please contact the Super Admin.",
      403,
    );
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
  user.status = user.status === "LOCKED" ? "ACTIVE" : user.status;
  if (user.role === "SUPER_ADMIN" && user.forcePasswordChange) {
    user.forcePasswordChange = false;
  }
  user.lastLoginAt = new Date();
  await user.save();

  const safeUser = toSafeUser(user);
  const token = await signSessionToken({
    sub: user._id.toString(),
    role: user.role,
    permissions: user.permissions ?? [],
    sessionVersion: user.sessionVersion,
    forcePasswordChange: user.forcePasswordChange,
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

export async function changePassword(
  input: ChangePasswordInput,
  actorId: string,
  context: { requestId?: string; ipHash?: string; userAgent?: string },
) {
  await connectToDatabase();

  const user = await User.findById(actorId).select(
    "+passwordHash +sessionVersion",
  );

  if (!user || user.status !== "ACTIVE") {
    throw new AuthError("UNAUTHENTICATED", "Please sign in.", 401);
  }

  const validPassword = await verifyPassword(
    input.currentPassword,
    user.passwordHash,
  );

  if (!validPassword) {
    throw new AuthError(
      "INVALID_CURRENT_PASSWORD",
      "Current password is incorrect.",
      400,
    );
  }

  user.passwordHash = await hashPassword(input.newPassword);
  user.forcePasswordChange = false;
  user.sessionVersion += 1;
  await user.save();

  const safeUser = toSafeUser(user);
  const token = await signSessionToken({
    sub: user._id.toString(),
    role: user.role,
    permissions: user.permissions ?? [],
    sessionVersion: user.sessionVersion,
    forcePasswordChange: user.forcePasswordChange,
  });

  await writeAuditLog({
    actor: safeUser,
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: user._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
  });

  return { user: safeUser, token };
}

export async function logoutAllSessions(
  actorId: string,
  context: { requestId?: string; ipHash?: string; userAgent?: string },
) {
  await connectToDatabase();

  const user = await User.findById(actorId).select("+sessionVersion");

  if (!user || user.status !== "ACTIVE") {
    throw new AuthError("UNAUTHENTICATED", "Please sign in.", 401);
  }

  user.sessionVersion += 1;
  await user.save();

  const safeUser = toSafeUser(user);

  await writeAuditLog({
    actor: safeUser,
    action: "AUTH_LOGOUT_ALL",
    entityType: "User",
    entityId: user._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
  });

  return { loggedOutAll: true };
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
  context: { requestId?: string; ipHash?: string; userAgent?: string },
) {
  await connectToDatabase();

  const identifier = input.identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: identifier }, { loginId: identifier }],
  }).select("+passwordResetTokenHash +passwordResetExpiresAt");

  if (!user || !["ACTIVE", "LOCKED"].includes(user.status)) {
    return { resetUrl: undefined };
  }

  const token = generateSecureToken();
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  await writeAuditLog({
    action: "PASSWORD_RESET_REQUESTED",
    entityType: "User",
    entityId: user._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: { identifier },
  });

  const resetUrl = buildUrl(`/reset-password/${token}`);
  if (user.email) {
    await sendEmail({ to: user.email, subject: "Reset your Employee Management password", text: `Use this single-use link within one hour: ${resetUrl}` }).catch(() => undefined);
  }
  return { resetUrl: process.env.NODE_ENV === "production" ? undefined : resetUrl };
}

export async function resetPassword(
  input: ResetPasswordInput,
  context: { requestId?: string; ipHash?: string; userAgent?: string },
) {
  await connectToDatabase();

  const tokenHash = hashToken(input.token);
  const user = await User.findOne({ passwordResetTokenHash: tokenHash }).select(
    "+passwordResetTokenHash +passwordResetExpiresAt +sessionVersion",
  );

  if (
    !user ||
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt < new Date()
  ) {
    throw new AuthError("RESET_INVALID", "This reset link is invalid or expired.", 400);
  }

  if (user.status === "SUSPENDED" || user.status === "OFFBOARDED") {
    throw new AuthError("ACCOUNT_DISABLED", "This account cannot be reset.", 403);
  }

  user.passwordHash = await hashPassword(input.password);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.forcePasswordChange = false;
  user.failedLoginCount = 0;
  user.lockUntil = undefined;
  user.status = user.status === "LOCKED" ? "ACTIVE" : user.status;
  user.sessionVersion += 1;
  user.lastLoginAt = new Date();
  await user.save();

  const safeUser = toSafeUser(user);
  const token = await signSessionToken({
    sub: user._id.toString(),
    role: user.role,
    permissions: user.permissions ?? [],
    sessionVersion: user.sessionVersion,
    forcePasswordChange: user.forcePasswordChange,
  });

  await writeAuditLog({
    actor: safeUser,
    action: "PASSWORD_RESET_COMPLETED",
    entityType: "User",
    entityId: user._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
  });

  return { user: safeUser, token };
}

function buildUrl(path: string) {
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  return new URL(path, baseUrl).toString();
}
