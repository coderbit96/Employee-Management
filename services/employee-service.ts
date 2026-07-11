import { Types } from "mongoose";
import { Attendance } from "@/models/Attendance";
import { AttendanceCorrection } from "@/models/AttendanceCorrection";
import { EmployeeProfile } from "@/models/EmployeeProfile";
import { LeaveLedger } from "@/models/LeaveLedger";
import { LeaveRequest } from "@/models/LeaveRequest";
import { Notification } from "@/models/Notification";
import { SalaryPayment } from "@/models/SalaryPayment";
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
  exitDate?: string;
  exitReason?: string;
  salary: {
    baseAmount: number;
    currency: string;
  };
};

export async function getMyEmployeeProfile(actor: SafeUser) {
  await connectToDatabase();
  const profile = await EmployeeProfile.findOne({ userId: actor.id, deletedAt: { $exists: false } }).lean();
  if (!profile) throw new EmployeeServiceError("NOT_FOUND", "Employee profile was not found.", 404);
  return { employee: { employeeNumber: profile.employeeNumber, firstName: profile.firstName, lastName: profile.lastName, department: profile.department, designation: profile.designation, joiningDate: profile.joiningDate.toISOString(), employmentStatus: profile.employmentStatus, managerId: profile.managerId?.toString(), exitDate: profile.exitDate?.toISOString() } };
}

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

  if (actor.role === "MANAGER") {
    const manager = await EmployeeProfile.findOne({ userId: actor.id, deletedAt: { $exists: false } }).select("_id").lean();
    if (!manager) return { employees: [], pagination: { page: input.page, limit: input.limit, total: 0, pages: 0 } };
    filter.managerId = manager._id;
  }

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
  const sortFields = { name: "firstName", employeeNumber: "employeeNumber", department: "department", joiningDate: "joiningDate", status: "employmentStatus" } as const;
  const sort = { [sortFields[input.sortBy]]: input.sortOrder === "asc" ? 1 : -1 } as Record<string, 1 | -1>;
  const [profiles, total] = await Promise.all([
    EmployeeProfile.find(filter)
      .sort(sort)
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
      exitDate: profile.exitDate?.toISOString(),
      exitReason: profile.exitReason ?? undefined,
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
    const userStatus =
      input.employmentStatus === "ACTIVE"
        ? "ACTIVE"
        : input.employmentStatus === "SUSPENDED"
          ? "SUSPENDED"
          : "OFFBOARDED";

    await User.updateOne(
      { _id: profile.userId },
      {
        status: userStatus,
        $inc: { sessionVersion: 1 },
      },
    );

    if (input.employmentStatus === "ACTIVE") {
      profile.exitDate = undefined;
      profile.exitReason = undefined;
    } else if (input.employmentStatus === "OFFBOARDED" && !profile.exitDate) {
      profile.exitDate = new Date();
    }
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

  if (profile.userId.toString() === actor.id) {
    throw new EmployeeServiceError(
      "SELF_DELETE_BLOCKED",
      "You cannot delete your own signed-in account.",
      409,
    );
  }

  const linkedUser = await User.findById(profile.userId).select("role").lean();
  if (linkedUser?.role === "SUPER_ADMIN") {
    throw new EmployeeServiceError(
      "SUPER_ADMIN_DELETE_BLOCKED",
      "The Super Admin account cannot be deleted from the employee directory.",
      409,
    );
  }

  const attendanceIds = await Attendance.find({ employeeId: profile._id }).distinct("_id");

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
      hardDelete: true,
    },
  });

  await Promise.all([
    AttendanceCorrection.deleteMany({ attendanceId: { $in: attendanceIds } }),
    Attendance.deleteMany({ employeeId: profile._id }),
    LeaveLedger.deleteMany({ employeeId: profile._id }),
    LeaveRequest.deleteMany({ employeeId: profile._id }),
    SalaryPayment.deleteMany({ employeeId: profile._id }),
    Notification.deleteMany({
      $or: [
        { recipientUserId: profile.userId },
        { entityId: profile._id },
      ],
    }),
    EmployeeProfile.updateMany(
      { managerId: profile._id },
      { $unset: { managerId: "" } },
    ),
    User.deleteOne({ _id: profile.userId }),
    EmployeeProfile.deleteOne({ _id: profile._id }),
  ]);

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
