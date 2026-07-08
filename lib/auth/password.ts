import crypto from "crypto";
import bcrypt from "bcryptjs";

const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, rounds);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function generateTemporaryPassword() {
  return crypto.randomBytes(18).toString("base64url");
}

