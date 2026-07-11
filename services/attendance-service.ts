import { Types } from "mongoose";
import { Attendance } from "@/models/Attendance";
import { EmployeeProfile } from "@/models/EmployeeProfile";
import { writeAuditLog } from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import type { AttendancePunchInput } from "@/lib/validation/attendance";
import { getPolicySettings } from "@/services/settings-service";
import type { SafeUser } from "@/types/domain";
import { canUseDailyAttendance, isWorkingDay } from "@/lib/attendance/policy";

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
  employeeName?: string;
  ownedByActor?: boolean;
  workDate: string;
  checkInAt?: string;
  checkOutAt?: string;
  durationMinutes: number;
  grossDurationMinutes?: number;
  breakDurationMinutes?: number;
  exception?: "NONE" | "SHORT_DAY" | "MISSING_CHECKOUT";
  checkInLocation?: LocationSnapshot;
  checkOutLocation?: LocationSnapshot;
  checkInPhotoDataUrl?: string;
  status: "NOT_STARTED" | "CHECKED_IN" | "CHECKED_OUT";
};

type LocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
};

type MaybeLocationSnapshot = {
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
};

export async function getTodayAttendance(actor: SafeUser) {
  await connectToDatabase();
  assertAttendanceRole(actor);
  const profile = await getActiveProfile(actor.id);
  const policy = await getPolicySettings();
  const workDate = getWorkDate(new Date(), policy.timezone);
  const attendance = await Attendance.findOne({
    employeeId: profile._id,
    workDate,
  }).lean();

  return toSummary(workDate, attendance);
}

export async function checkIn(
  actor: SafeUser,
  input: AttendancePunchInput,
  context: RequestContext,
) {
  await connectToDatabase();
  assertAttendanceRole(actor);
  const profile = await getActiveProfile(actor.id);
  const policy = await getPolicySettings();
  assertCapturePolicy(input, { requireLocation: true, requirePhoto: true });
  const workDate = getWorkDate(new Date(), policy.timezone);
  assertWorkingDay(workDate, policy.holidayDates);
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
    checkInLocation: input.location,
    checkInPhotoDataUrl: input.photoDataUrl,
    deviceMetadata: { userAgent: context.userAgent, ipHash: context.ipHash },
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

export async function checkOut(
  actor: SafeUser,
  input: AttendancePunchInput,
  context: RequestContext,
) {
  await connectToDatabase();
  assertAttendanceRole(actor);
  const profile = await getActiveProfile(actor.id);
  const policy = await getPolicySettings();
  assertCapturePolicy(input, { requireLocation: true, requirePhoto: false });
  const workDate = getWorkDate(new Date(), policy.timezone);
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
  attendance.checkOutLocation = input.location;
  const grossDurationMinutes = Math.max(
    0,
    Math.round((checkOutAt.getTime() - attendance.checkInAt.getTime()) / 60000),
  );
  attendance.grossDurationMinutes = grossDurationMinutes;
  attendance.breakDurationMinutes = input.breakDurationMinutes;
  attendance.durationMinutes = Math.max(0, grossDurationMinutes - input.breakDurationMinutes);
  attendance.exception =
    attendance.durationMinutes < policy.fullDayMinutes ? "SHORT_DAY" : "NONE";
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

export async function listAttendanceRecords(actor: SafeUser) {
  await connectToDatabase();

  const filter: Record<string, unknown> = {};

  if (actor.role === "EMPLOYEE") {
    filter.userId = new Types.ObjectId(actor.id);
  } else if (actor.role === "MANAGER") {
    const managerProfile = await EmployeeProfile.findOne({
      userId: actor.id,
      deletedAt: { $exists: false },
    }).lean();

    if (!managerProfile) {
      return { records: [] };
    }

    const team = await EmployeeProfile.find({
      managerId: managerProfile._id,
      deletedAt: { $exists: false },
    })
      .select("_id")
      .lean();
    filter.employeeId = { $in: team.map((profile) => profile._id) };
  } else if (!["SUPER_ADMIN", "ADMIN", "HR"].includes(actor.role)) {
    throw new AttendanceServiceError(
      "INSUFFICIENT_PERMISSION",
      "You cannot view attendance records.",
      403,
    );
  }

  const records = await Attendance.find(filter)
    .sort({ workDate: -1, createdAt: -1 })
    .limit(30)
    .lean();
  const employeeIds = records.map((record) => record.employeeId);
  const employees = await EmployeeProfile.find({ _id: { $in: employeeIds } })
    .select("firstName lastName")
    .lean();
  const nameById = new Map(
    employees.map((employee) => [
      employee._id.toString(),
      `${employee.firstName} ${employee.lastName}`,
    ]),
  );

  return {
    records: records.map((record) =>
      toSummary(record.workDate, {
        ...record,
        employeeName: nameById.get(record.employeeId.toString()),
        ownedByActor: record.userId.toString() === actor.id,
      }),
    ),
  };
}

function assertCapturePolicy(
  input: AttendancePunchInput,
  policy: { requireLocation: boolean; requirePhoto: boolean },
) {
  if (policy.requireLocation && !input.location) {
    throw new AttendanceServiceError("LOCATION_REQUIRED", "Location is required by the attendance policy.", 422);
  }
  if (policy.requirePhoto && !input.photoDataUrl) {
    throw new AttendanceServiceError("PHOTO_REQUIRED", "A check-in photo is required by the attendance policy.", 422);
  }
}

function assertAttendanceRole(actor: SafeUser) {
  if (!canUseDailyAttendance(actor.role)) {
    throw new AttendanceServiceError(
      "ATTENDANCE_ROLE_REQUIRED",
      "Daily attendance is available only to Employee, HR, and Manager accounts.",
      403,
    );
  }
}

function assertWorkingDay(workDate: string, holidayDates: string[]) {
  if (!isWorkingDay(workDate, holidayDates)) {
    throw new AttendanceServiceError(
      "NOT_A_WORKING_DAY",
      "Attendance cannot be recorded on a configured Sunday or holiday.",
      422,
    );
  }
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

function getWorkDate(date = new Date(), timezone = "Asia/Kolkata") {
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
    grossDurationMinutes?: number | null;
    breakDurationMinutes?: number | null;
    status: "CHECKED_IN" | "CHECKED_OUT";
    exception?: "NONE" | "SHORT_DAY" | "MISSING_CHECKOUT" | null;
    employeeName?: string;
    ownedByActor?: boolean;
    checkInLocation?: MaybeLocationSnapshot | null;
    checkOutLocation?: MaybeLocationSnapshot | null;
    checkInPhotoDataUrl?: string | null;
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
    employeeName: attendance.employeeName,
    ownedByActor: attendance.ownedByActor,
    workDate,
    checkInAt: attendance.checkInAt.toISOString(),
    checkOutAt: attendance.checkOutAt?.toISOString(),
    durationMinutes: attendance.durationMinutes ?? 0,
    grossDurationMinutes: attendance.grossDurationMinutes ?? attendance.durationMinutes ?? 0,
    breakDurationMinutes: attendance.breakDurationMinutes ?? 0,
    exception: attendance.exception ?? "NONE",
    checkInLocation: normalizeLocation(attendance.checkInLocation),
    checkOutLocation: normalizeLocation(attendance.checkOutLocation),
    checkInPhotoDataUrl: attendance.checkInPhotoDataUrl ?? undefined,
    status: attendance.status,
  };
}

function normalizeLocation(
  location?: MaybeLocationSnapshot | null,
): LocationSnapshot | undefined {
  if (
    location?.latitude === undefined ||
    location.latitude === null ||
    location.longitude === undefined ||
    location.longitude === null
  ) {
    return undefined;
  }

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracyMeters: location.accuracyMeters ?? undefined,
  };
}
