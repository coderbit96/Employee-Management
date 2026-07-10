import { Types } from "mongoose";
import { EmployeeProfile } from "@/models/EmployeeProfile";
import { LeaveLedger } from "@/models/LeaveLedger";
import { LeaveRequest } from "@/models/LeaveRequest";
import { User } from "@/models/User";
import { writeAuditLog } from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import { createNotifications } from "@/services/notification-service";
import { getPolicySettings } from "@/services/settings-service";
import type {
  CreateLeaveRequestInput,
  LeaveDecisionInput,
  ListLeaveRequestsQuery,
} from "@/lib/validation/leave-request";
import type { Role, SafeUser } from "@/types/domain";

type RequestContext = {
  requestId?: string;
  ipHash?: string;
  userAgent?: string;
};

export class LeaveRequestServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function createLeaveRequest(
  input: CreateLeaveRequestInput,
  actor: SafeUser,
  context: RequestContext,
) {
  await connectToDatabase();
  const profile = await getActiveProfile(actor.id);

  await assertNoOverlap(profile._id, input.startDate, input.endDate);
  const leaveBreakdown = await calculateLeaveBreakdown(
    profile._id,
    input,
  );

  if (leaveBreakdown.requestedDays <= 0) {
    throw new LeaveRequestServiceError(
      "NO_WORKING_DAYS",
      "Selected dates contain only weekends or holidays.",
      422,
    );
  }

  const approvalRoute = getApprovalRoute(actor.role);

  const request = await LeaveRequest.create({
    employeeId: profile._id,
    userId: actor.id,
    employeeName: `${profile.firstName} ${profile.lastName}`,
    employeeEmail: actor.email,
    employeeRole: actor.role,
    leaveType: input.leaveType,
    startDate: normalizeStart(input.startDate),
    endDate: normalizeEnd(input.endDate),
    halfDay: input.halfDay,
    requestedDays: leaveBreakdown.requestedDays,
    paidDays: leaveBreakdown.paidDays,
    unpaidDays: leaveBreakdown.unpaidDays,
    excludedDates: leaveBreakdown.excludedDates,
    approvalRoute,
    reason: input.reason,
    status: "PENDING",
  });

  const approvers = await findApproverUsers(actor.role);
  await createNotifications(
    approvers.flatMap((approver) => [
      {
        recipientUserId: approver._id,
        title: "Leave request pending",
        message: `${request.employeeName} requested ${request.requestedDays} day(s) of leave.`,
        entityType: "LeaveRequest",
        entityId: request._id,
        channel: "IN_APP" as const,
      },
      {
        recipientUserId: approver._id,
        title: "Leave request email",
        message: `${request.employeeName} requested leave from ${input.startDate.toDateString()} to ${input.endDate.toDateString()}.`,
        entityType: "LeaveRequest",
        entityId: request._id,
        channel: "EMAIL" as const,
      },
    ]),
  );

  await writeAuditLog({
    actor,
    action: "LEAVE_REQUEST_CREATED",
    entityType: "LeaveRequest",
    entityId: request._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: {
      leaveType: input.leaveType,
      startDate: input.startDate.toISOString(),
      endDate: input.endDate.toISOString(),
      paidDays: request.paidDays,
      unpaidDays: request.unpaidDays,
    },
  });

  return { leaveRequest: toLeaveRequest(request) };
}

export async function listLeaveRequests(
  actor: SafeUser,
  query: ListLeaveRequestsQuery,
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.scope === "mine") {
    filter.userId = new Types.ObjectId(actor.id);
  } else if (!canViewLeaveInbox(actor)) {
    throw new LeaveRequestServiceError(
      "INSUFFICIENT_PERMISSION",
      "Only HR or Super Admin can view leave requests.",
      403,
    );
  }

  const requests = await LeaveRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return { leaveRequests: requests.map(toLeaveRequest) };
}

export async function getMyLeaveBalance(actor: SafeUser) {
  await connectToDatabase();
  const profile = await getActiveProfile(actor.id);
  const policy = await getPolicySettings();
  const year = getWorkYear(new Date());
  const ledger = await LeaveLedger.findOne({
    employeeId: profile._id,
    year,
  }).lean();
  const pendingRequests = await LeaveRequest.find({
    employeeId: profile._id,
    status: "PENDING",
    startDate: {
      $gte: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
      $lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
    },
  }).lean();
  const openingPaidDays =
    ledger?.openingPaidDays ?? policy.annualPaidLeaveDays;
  const usedPaidDays = ledger?.usedPaidDays ?? 0;
  const pendingPaidDays = pendingRequests.reduce(
    (total, request) => total + (request.paidDays ?? 0),
    0,
  );
  const pendingUnpaidDays = pendingRequests.reduce(
    (total, request) => total + (request.unpaidDays ?? 0),
    0,
  );

  return {
    balance: {
      year,
      openingPaidDays,
      usedPaidDays,
      pendingPaidDays,
      pendingUnpaidDays,
      remainingPaidDays: Math.max(
        0,
        openingPaidDays - usedPaidDays - pendingPaidDays,
      ),
    },
  };
}

export async function approveLeaveRequest(
  requestId: string,
  input: LeaveDecisionInput,
  actor: SafeUser,
  context: RequestContext,
) {
  return decideLeaveRequest(requestId, "APPROVED", input, actor, context);
}

export async function rejectLeaveRequest(
  requestId: string,
  input: LeaveDecisionInput,
  actor: SafeUser,
  context: RequestContext,
) {
  return decideLeaveRequest(requestId, "REJECTED", input, actor, context);
}

async function decideLeaveRequest(
  requestId: string,
  action: "APPROVED" | "REJECTED",
  input: LeaveDecisionInput,
  actor: SafeUser,
  context: RequestContext,
) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(requestId)) {
    throw new LeaveRequestServiceError("NOT_FOUND", "Leave request not found.", 404);
  }

  if (!canViewLeaveInbox(actor)) {
    throw new LeaveRequestServiceError(
      "INSUFFICIENT_PERMISSION",
      "You cannot decide leave requests.",
      403,
    );
  }

  const request = await LeaveRequest.findById(requestId);

  if (!request) {
    throw new LeaveRequestServiceError("NOT_FOUND", "Leave request not found.", 404);
  }

  if (request.status !== "PENDING") {
    throw new LeaveRequestServiceError(
      "LEAVE_ALREADY_DECIDED",
      "Only pending leave requests can be decided.",
      409,
    );
  }

  if (request.userId.toString() === actor.id) {
    throw new LeaveRequestServiceError(
      "SELF_APPROVAL_BLOCKED",
      "You cannot approve or reject your own leave request.",
      403,
    );
  }

  if (request.employeeRole === "HR" && actor.role === "HR") {
    throw new LeaveRequestServiceError(
      "HR_APPROVAL_RESTRICTED",
      "HR leave must be approved by the Super Admin.",
      403,
    );
  }

  request.status = action;
  request.approvalHistory.push({
    action,
    actorId: new Types.ObjectId(actor.id),
    actorRole: actor.role,
    note: input.note,
    decidedAt: new Date(),
  });
  await request.save();

  if (action === "APPROVED" && request.paidDays > 0) {
    const policy = await getPolicySettings();
    const year = getWorkYear(request.startDate);
    await LeaveLedger.updateOne(
      { employeeId: request.employeeId, year },
      {
        $setOnInsert: {
          employeeId: request.employeeId,
          userId: request.userId,
          year,
          openingPaidDays: policy.annualPaidLeaveDays,
        },
        $inc: { usedPaidDays: request.paidDays },
      },
      { upsert: true },
    );
  }

  await createNotifications([
    {
      recipientUserId: request.userId,
      title: `Leave request ${action.toLowerCase()}`,
      message: input.note
        ? `Your leave request was ${action.toLowerCase()}: ${input.note}`
        : `Your leave request was ${action.toLowerCase()}.`,
      entityType: "LeaveRequest",
      entityId: request._id,
    },
  ]);

  await writeAuditLog({
    actor,
    action: `LEAVE_REQUEST_${action}`,
    entityType: "LeaveRequest",
    entityId: request._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: {
      employeeName: request.employeeName,
      note: input.note,
    },
  });

  return { leaveRequest: toLeaveRequest(request) };
}

async function getActiveProfile(userId: string) {
  const profile = await EmployeeProfile.findOne({
    userId,
    deletedAt: { $exists: false },
  });

  if (!profile || profile.employmentStatus !== "ACTIVE") {
    throw new LeaveRequestServiceError(
      "PROFILE_NOT_ACTIVE",
      "Only active employee profiles can request leave.",
      403,
    );
  }

  return profile;
}

async function assertNoOverlap(
  employeeId: Types.ObjectId,
  startDate: Date,
  endDate: Date,
) {
  const overlap = await LeaveRequest.findOne({
    employeeId,
    status: { $in: ["PENDING", "APPROVED"] },
    startDate: { $lte: normalizeEnd(endDate) },
    endDate: { $gte: normalizeStart(startDate) },
  }).lean();

  if (overlap) {
    throw new LeaveRequestServiceError(
      "LEAVE_OVERLAP",
      "This leave overlaps an existing pending or approved request.",
      409,
    );
  }
}

function canViewLeaveInbox(actor: SafeUser) {
  return ["SUPER_ADMIN", "HR"].includes(actor.role);
}

async function calculateLeaveBreakdown(
  employeeId: Types.ObjectId,
  input: CreateLeaveRequestInput,
) {
  const dates = input.halfDay
    ? [normalizeStart(input.startDate)]
    : enumerateDates(input.startDate, input.endDate);
  const policy = await getPolicySettings();
  const holidays = new Set(policy.holidayDates);
  const workingDates = dates.filter((date) => {
    const day = date.getUTCDay();
    const key = date.toISOString().slice(0, 10);
    return day !== 0 && day !== 6 && !holidays.has(key);
  });
  const excludedDates = dates
    .filter((date) => !workingDates.some((workDate) => sameUtcDate(date, workDate)))
    .map((date) => date.toISOString().slice(0, 10));
  const requestedDays = input.halfDay ? 0.5 : workingDates.length;
  const year = getWorkYear(input.startDate);
  const ledger = await LeaveLedger.findOne({ employeeId, year }).lean();
  const usedPaidDays = ledger?.usedPaidDays ?? 0;
  const paidBalance = Math.max(0, policy.annualPaidLeaveDays - usedPaidDays);
  const paidDays =
    input.leaveType === "UNPAID" ? 0 : Math.min(requestedDays, paidBalance);

  return {
    requestedDays,
    paidDays,
    unpaidDays: Math.max(0, requestedDays - paidDays),
    excludedDates,
    paidBalance,
  };
}

function getApprovalRoute(employeeRole: string): Role[] {
  return employeeRole === "HR" ? ["SUPER_ADMIN"] : ["HR", "SUPER_ADMIN"];
}

async function findApproverUsers(employeeRole: string) {
  return User.find({
    role: { $in: getApprovalRoute(employeeRole) },
    status: "ACTIVE",
  })
    .select("_id")
    .lean();
}

function enumerateDates(startDate: Date, endDate: Date) {
  const dates: Date[] = [];
  const current = normalizeStart(startDate);
  const end = normalizeStart(endDate);

  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function sameUtcDate(left: Date, right: Date) {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

function getWorkYear(date: Date) {
  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone: process.env.DEFAULT_TIMEZONE ?? "Asia/Kolkata",
      year: "numeric",
    }).format(date),
  );
}

function normalizeStart(date: Date) {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function normalizeEnd(date: Date) {
  const value = new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value;
}

function toLeaveRequest(request: {
  _id: { toString(): string };
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  halfDay: boolean;
  requestedDays: number;
  paidDays?: number;
  unpaidDays?: number;
  excludedDates?: string[];
  approvalRoute?: string[];
  reason: string;
  status: string;
  createdAt?: Date;
}) {
  return {
    id: request._id.toString(),
    employeeName: request.employeeName,
    employeeEmail: request.employeeEmail,
    employeeRole: request.employeeRole,
    leaveType: request.leaveType,
    startDate: request.startDate.toISOString(),
    endDate: request.endDate.toISOString(),
    halfDay: request.halfDay,
    requestedDays: request.requestedDays,
    paidDays: request.paidDays ?? 0,
    unpaidDays: request.unpaidDays ?? 0,
    excludedDates: request.excludedDates ?? [],
    approvalRoute: request.approvalRoute ?? [],
    reason: request.reason,
    status: request.status,
    createdAt: request.createdAt?.toISOString(),
  };
}
