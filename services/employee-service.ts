import { Types } from "mongoose";
import { EmployeeProfile } from "@/models/EmployeeProfile";
import { User } from "@/models/User";
import { writeAuditLog } from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  canManageEmployeeProfiles,
  canViewEmployeeDirectory,
} from "@/lib/permissions/roles";
import type {
  ListEmployeesQuery,
  UpdateEmployeeInput,
} from "@/lib/validation/employee";
import type { SafeUser } from "@/types/domain";

export class EmployeeServiceError extends Error {
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

export type EmployeeListItem = {
  id: string;
  userId: string;
  email?: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  name: string;
  department: string;
  designation: string;
  managerId?: string;
  joiningDate: string;
  employmentStatus: string;
  salary: {
    baseAmount: number;
    currency: string;
  };
};

export async function listEmployees(actor: SafeUser, input: ListEmployeesQuery) {
  await connectToDatabase();

  if (!canViewEmployeeDirectory(actor)) {
    throw new EmployeeServiceError(
      "INSUFFICIENT_PERMISSION",
      "You cannot view the employee directory.",
      403,
    );
  }

  const filter: Record<string, unknown> = {
    deletedAt: { $exists: false },
  };

  if (input.department) {
    filter.department = input.department;
  }

  if (input.status) {
    filter.employmentStatus = input.status;
  }

  if (input.q) {
    const expression = new RegExp(
      input.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [
      { firstName: expression },
      { lastName: expression },
      { employeeNumber: expression },
      { department: expression },
      { designation: expression },
    ];
  }

  const skip = (input.page - 1) * input.limit;
  const [profiles, total] = await Promise.all([
    EmployeeProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(input.limit)
      .lean(),
    EmployeeProfile.countDocuments(filter),
  ]);

  const userIds = profiles.map((profile) => profile.userId);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const emailByUserId = new Map(
    users.map((user) => [user._id.toString(), user.email ?? undefined]),
  );

  return {
    employees: profiles.map((profile): EmployeeListItem => ({
      id: profile._id.toString(),
      userId: profile.userId.toString(),
      email: emailByUserId.get(profile.userId.toString()),
      employeeNumber: profile.employeeNumber,
      firstName: profile.firstName,
      lastName: profile.lastName,
      name: `${profile.firstName} ${profile.lastName}`,
      department: profile.department,
      designation: profile.designation,
      managerId: profile.managerId?.toString(),
      joiningDate: profile.joiningDate.toISOString(),
      employmentStatus: profile.employmentStatus,
      salary: {
        baseAmount: profile.salary?.baseAmount ?? 0,
        currency: profile.salary?.currency ?? "INR",
      },
    })),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      pages: Math.ceil(total / input.limit),
    },
  };
}

export async function updateEmployee(
  employeeId: string,
  input: UpdateEmployeeInput,
  actor: SafeUser,
  context: RequestContext,
) {
  await connectToDatabase();

  if (!canManageEmployeeProfiles(actor)) {
    throw new EmployeeServiceError(
      "INSUFFICIENT_PERMISSION",
      "You cannot update employee profiles.",
      403,
    );
  }

  if (!Types.ObjectId.isValid(employeeId)) {
    throw new EmployeeServiceError("NOT_FOUND", "Employee was not found.", 404);
  }

  const profile = await EmployeeProfile.findOne({
    _id: employeeId,
    deletedAt: { $exists: false },
  });

  if (!profile) {
    throw new EmployeeServiceError("NOT_FOUND", "Employee was not found.", 404);
  }

  if (input.managerId !== undefined) {
    await assertValidManagerAssignment(employeeId, input.managerId);
    profile.managerId = input.managerId ? new Types.ObjectId(input.managerId) : undefined;
  }

  if (input.firstName !== undefined) profile.firstName = input.firstName;
  if (input.lastName !== undefined) profile.lastName = input.lastName;
  if (input.department !== undefined) profile.department = input.department;
  if (input.designation !== undefined) profile.designation = input.designation;
  if (input.joiningDate !== undefined) profile.joiningDate = input.joiningDate;
  if (input.employmentStatus !== undefined) {
    profile.employmentStatus = input.employmentStatus;
  }
  if (input.baseSalary !== undefined) {
    profile.salary = {
      ...(profile.salary ?? { currency: "INR" }),
      baseAmount: input.baseSalary,
    };
  }

  await profile.save();

  await writeAuditLog({
    actor,
    action: "EMPLOYEE_PROFILE_UPDATED",
    entityType: "EmployeeProfile",
    entityId: profile._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: {
      employeeNumber: profile.employeeNumber,
      fields: Object.keys(input),
    },
  });

  return {
    employee: {
      id: profile._id.toString(),
      employeeNumber: profile.employeeNumber,
      name: `${profile.firstName} ${profile.lastName}`,
      department: profile.department,
      designation: profile.designation,
      employmentStatus: profile.employmentStatus,
    },
  };
}

export async function deleteEmployee(
  employeeId: string,
  actor: SafeUser,
  context: RequestContext,
) {
  await connectToDatabase();

  if (!canManageEmployeeProfiles(actor)) {
    throw new EmployeeServiceError(
      "INSUFFICIENT_PERMISSION",
      "You cannot delete employee profiles.",
      403,
    );
  }

  if (!Types.ObjectId.isValid(employeeId)) {
    throw new EmployeeServiceError("NOT_FOUND", "Employee was not found.", 404);
  }

  const profile = await EmployeeProfile.findOne({
    _id: employeeId,
    deletedAt: { $exists: false },
  });

  if (!profile) {
    throw new EmployeeServiceError("NOT_FOUND", "Employee was not found.", 404);
  }

  profile.deletedAt = new Date();
  profile.deletedBy = new Types.ObjectId(actor.id);
  profile.employmentStatus = "OFFBOARDED";
  profile.exitDate = new Date();
  await profile.save();

  await User.updateOne(
    { _id: profile.userId },
    {
      $set: { status: "DELETED" },
      $inc: { sessionVersion: 1 },
    },
  );

  await writeAuditLog({
    actor,
    action: "EMPLOYEE_PROFILE_DELETED",
    entityType: "EmployeeProfile",
    entityId: profile._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: {
      employeeNumber: profile.employeeNumber,
      name: `${profile.firstName} ${profile.lastName}`,
    },
  });

  return {
    deleted: true,
    employeeId,
  };
}

async function assertValidManagerAssignment(
  employeeId: string,
  managerId: string | null,
) {
  if (!managerId) {
    return;
  }

  if (!Types.ObjectId.isValid(managerId)) {
    throw new EmployeeServiceError("INVALID_MANAGER", "Manager was not found.");
  }

  if (employeeId === managerId) {
    throw new EmployeeServiceError(
      "INVALID_MANAGER",
      "An employee cannot be assigned as their own manager.",
      422,
    );
  }

  const manager = await EmployeeProfile.findById(managerId).lean();

  if (!manager) {
    throw new EmployeeServiceError("INVALID_MANAGER", "Manager was not found.");
  }

  let currentManagerId = manager.managerId?.toString();
  const visited = new Set<string>();

  while (currentManagerId) {
    if (currentManagerId === employeeId) {
      throw new EmployeeServiceError(
        "MANAGER_CYCLE",
        "Manager assignment would create a reporting cycle.",
        422,
      );
    }

    if (visited.has(currentManagerId)) {
      throw new EmployeeServiceError(
        "MANAGER_CYCLE",
        "Existing reporting chain contains a cycle.",
        422,
      );
    }

    visited.add(currentManagerId);
    const next = await EmployeeProfile.findById(currentManagerId)
      .select("managerId")
      .lean();
    currentManagerId = next?.managerId?.toString();
  }
}
