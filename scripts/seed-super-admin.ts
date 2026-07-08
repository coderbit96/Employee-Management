import "dotenv/config";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { connectToDatabase } from "@/lib/db/mongoose";
import { hashPassword } from "@/lib/auth/password";

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD are required.",
    );
  }

  if (password.length < 12) {
    throw new Error("Seed password must be at least 12 characters.");
  }

  await connectToDatabase();

  const existingSuperAdmin = await User.findOne({
    role: "SUPER_ADMIN",
    status: { $in: ["INVITED", "ACTIVE", "LOCKED", "SUSPENDED"] },
  }).lean();

  if (existingSuperAdmin) {
    console.log("A Super Admin already exists. Seed skipped.");
    return;
  }

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    throw new Error("Seed email is already used by another account.");
  }

  const user = await User.create({
    email,
    loginId: "superadmin",
    passwordHash: await hashPassword(password),
    role: "SUPER_ADMIN",
    permissions: [
      "CREATE_ADMIN",
      "MANAGE_USERS",
      "MANAGE_EMPLOYEES",
      "VIEW_AUDIT_LOGS",
      "MANAGE_SETTINGS",
      "PROCESS_PAYROLL",
      "APPROVE_LEAVE",
      "ARCHIVE_ATTENDANCE",
    ],
    status: "ACTIVE",
    forcePasswordChange: true,
  });

  await AuditLog.create({
    actorId: user._id,
    actorRole: "SUPER_ADMIN",
    action: "SUPER_ADMIN_SEEDED",
    entityType: "User",
    entityId: user._id,
    summary: { email },
  });

  console.log(`Seeded Super Admin: ${email}`);
  console.log("Remove seed credentials from the environment after first login.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import("mongoose");
    await mongoose.disconnect();
  });

