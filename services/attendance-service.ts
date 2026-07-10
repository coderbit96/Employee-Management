import { Attendance } from "@/models/Attendance";
import { EmployeeProfile } from "@/models/EmployeeProfile";
import { writeAuditLog } from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import type { SafeUser } from "@/types/domain";

type RequestContext = {
  requestId?: string;
  ipHash?: string;
  userAgent?: string;
};

export class AttendanceServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type AttendanceSummary = {
  id?: string;
  workDate: string;
  checkInAt?: string;
  checkOutAt?: string;
  durationMinutes: number;
  status: "NOT_STARTED" | "CHECKED_IN" | "CHECKED_OUT";
};

export async function getTodayAttendance(actor: SafeUser) {
  await connectToDatabase();
  const profile = await getActiveProfile(actor.id);
  const workDate = getWorkDate();
  const attendance = await Attendance.findOne({
    employeeId: profile._id,
    workDate,
  }).lean();

  return toSummary(workDate, attendance);
}

export async function checkIn(actor: SafeUser, context: RequestContext) {
  await connectToDatabase();
  const profile = await getActiveProfile(actor.id);
  const workDate = getWorkDate();
  const existing = await Attendance.findOne({
    employeeId: profile._id,
    workDate,
  });

  if (existing) {
    throw new AttendanceServiceError(
      "ALREADY_CHECKED_IN",
      "You already checked in today.",
      409,
    );
  }

  const attendance = await Attendance.create({
    employeeId: profile._id,
    userId: actor.id,
    workDate,
    checkInAt: new Date(),
    status: "CHECKED_IN",
  });

  await writeAuditLog({
    actor,
    action: "ATTENDANCE_CHECK_IN",
    entityType: "Attendance",
    entityId: attendance._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: { workDate },
  });

  return toSummary(workDate, attendance);
}

export async function checkOut(actor: SafeUser, context: RequestContext) {
  await connectToDatabase();
  const profile = await getActiveProfile(actor.id);
  const workDate = getWorkDate();
  const attendance = await Attendance.findOne({
    employeeId: profile._id,
    workDate,
  });

  if (!attendance) {
    throw new AttendanceServiceError(
      "CHECK_IN_REQUIRED",
      "Please check in before checking out.",
      422,
    );
  }

  if (attendance.checkOutAt) {
    throw new AttendanceServiceError(
      "ALREADY_CHECKED_OUT",
      "You already checked out today.",
      409,
    );
  }

  const checkOutAt = new Date();
  attendance.checkOutAt = checkOutAt;
  attendance.durationMinutes = Math.max(
    0,
    Math.round((checkOutAt.getTime() - attendance.checkInAt.getTime()) / 60000),
  );
  attendance.status = "CHECKED_OUT";
  await attendance.save();

  await writeAuditLog({
    actor,
    action: "ATTENDANCE_CHECK_OUT",
    entityType: "Attendance",
    entityId: attendance._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: { workDate, durationMinutes: attendance.durationMinutes },
  });

  return toSummary(workDate, attendance);
}

async function getActiveProfile(userId: string) {
  const profile = await EmployeeProfile.findOne({
    userId,
    deletedAt: { $exists: false },
  });

  if (!profile || profile.employmentStatus !== "ACTIVE") {
    throw new AttendanceServiceError(
      "PROFILE_NOT_ACTIVE",
      "Only active employee profiles can use attendance.",
      403,
    );
  }

  return profile;
}

function getWorkDate(date = new Date()) {
  const timezone = process.env.DEFAULT_TIMEZONE ?? "Asia/Kolkata";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toSummary(
  workDate: string,
  attendance: {
    _id: { toString(): string };
    checkInAt: Date;
    checkOutAt?: Date | null;
    durationMinutes?: number | null;
    status: "CHECKED_IN" | "CHECKED_OUT";
  } | null,
): AttendanceSummary {
  if (!attendance) {
    return {
      workDate,
      durationMinutes: 0,
      status: "NOT_STARTED",
    };
  }

  return {
    id: attendance._id.toString(),
    workDate,
    checkInAt: attendance.checkInAt.toISOString(),
    checkOutAt: attendance.checkOutAt?.toISOString(),
    durationMinutes: attendance.durationMinutes ?? 0,
    status: attendance.status,
  };
}

