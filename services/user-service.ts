import { EmployeeProfile } from "@/models/EmployeeProfile";
import { User, type UserDocument } from "@/models/User";
import { writeAuditLog } from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  hashPassword,
} from "@/lib/auth/password";
import { canCreateRole } from "@/lib/permissions/roles";
import { toSafeUser } from "@/lib/auth/session";
import type { CreateUserInput } from "@/lib/validation/user";
import type { SafeUser } from "@/types/domain";

export class UserServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

type RequestContext = {
  requestId?: string;
  ipHash?: string;
  userAgent?: string;
};

export async function createProvisionedUser(
  input: CreateUserInput,
  actor: SafeUser,
  context: RequestContext,
) {
  await connectToDatabase();

  if (!canCreateRole(actor, input.role)) {
    throw new UserServiceError(
      "INSUFFICIENT_PERMISSION",
      "You cannot create accounts for this role.",
      403,
    );
  }

  if (input.role === "SUPER_ADMIN") {
    throw new UserServiceError(
      "SUPER_ADMIN_RESTRICTED",
      "The Super Admin account is created only by the seed command.",
      403,
    );
  }

  const identityFilters = [
    ...(input.email ? [{ email: input.email }] : []),
    ...(input.loginId ? [{ loginId: input.loginId }, { email: input.loginId }] : []),
  ];

  const existingUser = await User.findOne({
    $or: identityFilters,
  }).lean();

  if (existingUser) {
    throw new UserServiceError(
      "ACCOUNT_EXISTS",
      "An account with that email or login ID already exists.",
      409,
    );
  }

  const employeeNumber = input.employeeNumber.trim().toUpperCase();
  const existingProfile = await EmployeeProfile.findOne({
    employeeNumber,
  }).lean();

  if (existingProfile) {
    throw new UserServiceError(
      "EMPLOYEE_NUMBER_EXISTS",
      "An employee with that number already exists.",
      409,
    );
  }

  const passwordHash = await hashPassword(input.password);
  let createdUser: UserDocument | null = null;

  try {
    createdUser = await User.create({
      email: input.email ?? input.loginId,
      loginId: input.loginId,
      passwordHash,
      role: input.role,
      permissions: input.permissions,
      status: "ACTIVE",
      forcePasswordChange: false,
      createdBy: actor.id,
    });

    await EmployeeProfile.create({
      userId: createdUser._id,
      employeeNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      department: input.department,
      designation: input.designation,
      managerId: input.managerId || undefined,
      joiningDate: input.joiningDate,
      salary: {
        baseAmount: input.baseSalary,
        currency: "INR",
      },
    });
  } catch (error) {
    if (createdUser) {
      await User.deleteOne({ _id: createdUser._id });
    }

    throw error;
  }

  const safeUser = toSafeUser(createdUser);

  await writeAuditLog({
    actor,
    action: "USER_CREATED",
    entityType: "User",
    entityId: createdUser._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: {
      role: input.role,
      email: input.email ?? input.loginId,
      employeeNumber,
    },
  });

  return {
    user: safeUser,
  };
}

export async function listUsers(
  actor: SafeUser,
  input: {
    role?: string;
    status?: string;
    q?: string;
    page: number;
    limit: number;
  },
) {
  await connectToDatabase();

  if (actor.role !== "SUPER_ADMIN") {
    throw new UserServiceError(
      "INSUFFICIENT_PERMISSION",
      "Only the Super Admin can list user accounts.",
      403,
    );
  }

  const filter: Record<string, unknown> = {};

  if (input.role) {
    filter.role = input.role;
  }

  if (input.status) {
    filter.status = input.status;
  }

  if (input.q) {
    const expression = new RegExp(input.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ email: expression }, { loginId: expression }];
  }

  const skip = (input.page - 1) * input.limit;
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(input.limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map(toSafeUser),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      pages: Math.ceil(total / input.limit),
    },
  };
}
