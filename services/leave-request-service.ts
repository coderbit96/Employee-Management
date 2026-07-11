import { Types } from "mongoose";
import { EmployeeProfile } from "@/models/EmployeeProfile";
import { LeaveLedger } from "@/models/LeaveLedger";
import { LeaveRequest } from "@/models/LeaveRequest";
import { User } from "@/models/User";
import { writeAuditLog } from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  canReceiveLeaveRequest,
  canRequestLeave,
  getLeaveApprovalRoute,
} from "@/lib/leave/approval-policy";
import { createNotifications } from "@/services/notification-service";
import { getPolicySettings } from "@/services/settings-service";
import type {
  CreateLeaveRequestInput,
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
  assertLeaveRequestRole(actor);
  const profile = await getActiveProfile(actor.id);

  await assertNoOverlap(profile._id, input.startDate, input.endDate);
  const leaveBreakdown = await calculateLeaveBreakdown(
    profile._id,
    input,
  );

  if (leaveBreakdown.requestedDays <= 0) {
    throw new LeaveRequestServiceError(
      "NO_WORKING_DAYS",
      "Selected dates contain only Sundays or holidays.",
      422,
    );
  }

  const approvalRoute = getLeaveApprovalRoute(actor.role);

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
      "Only HR, Admin, or Super Admin can view leave requests.",
      403,
    );
  } else {
    filter.employeeRole =
      actor.role === "HR"
        ? { $in: ["EMPLOYEE", "MANAGER"] }
        : "HR";
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
  actor: SafeUser,
  context: RequestContext,
) {
  return decideLeaveRequest(requestId, "APPROVED", actor, context);
}

export async function rejectLeaveRequest(
  requestId: string,
  actor: SafeUser,
  context: RequestContext,
) {
  return decideLeaveRequest(requestId, "REJECTED", actor, context);
}

export async function withdrawLeaveRequest(
  requestId: string,
  reason: string,
  actor: SafeUser,
  context: RequestContext,
) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(requestId)) throw new LeaveRequestServiceError("NOT_FOUND", "Leave request not found.", 404);
  const request = await LeaveRequest.findOne({ _id: requestId, userId: actor.id });
  if (!request) throw new LeaveRequestServiceError("NOT_FOUND", "Leave request not found.", 404);
  if (!["PENDING", "REJECTED"].includes(request.status)) {
    throw new LeaveRequestServiceError("CANCELLATION_REQUIRED", "Approved leave requires an approver-managed cancellation workflow.", 409);
  }
  request.status = "WITHDRAWN";
  request.approvalHistory.push({ action: "WITHDRAWN", actorId: new Types.ObjectId(actor.id), actorRole: actor.role, note: reason, decidedAt: new Date() });
  await request.save();
  await writeAuditLog({ actor, action: "LEAVE_REQUEST_WITHDRAWN", entityType: "LeaveRequest", entityId: request._id, ...context, summary: { reason } });
  return { leaveRequest: toLeaveRequest(request) };
}

export async function updateLeaveRequest(requestId: string, input: CreateLeaveRequestInput, actor: SafeUser, context: RequestContext) {
  await connectToDatabase(); if (!Types.ObjectId.isValid(requestId)) throw new LeaveRequestServiceError("NOT_FOUND", "Leave request not found.", 404);
  const request = await LeaveRequest.findOne({ _id: requestId, userId: actor.id }); if (!request) throw new LeaveRequestServiceError("NOT_FOUND", "Leave request not found.", 404);
  if (request.status !== "PENDING") throw new LeaveRequestServiceError("LEAVE_LOCKED", "Only pending leave requests can be edited.", 409);
  await assertNoOverlap(request.employeeId, input.startDate, input.endDate, request._id);
  const breakdown = await calculateLeaveBreakdown(request.employeeId, input); if (breakdown.requestedDays <= 0) throw new LeaveRequestServiceError("NO_WORKING_DAYS", "Selected dates contain only Sundays or holidays.", 422);
  request.leaveType = input.leaveType; request.startDate = normalizeStart(input.startDate); request.endDate = normalizeEnd(input.endDate); request.halfDay = input.halfDay; request.reason = input.reason; request.requestedDays = breakdown.requestedDays; request.paidDays = breakdown.paidDays; request.unpaidDays = breakdown.unpaidDays; request.excludedDates = breakdown.excludedDates; await request.save();
  await writeAuditLog({ actor, action: "LEAVE_REQUEST_UPDATED", entityType: "LeaveRequest", entityId: request._id, ...context, summary: { requestedDays: request.requestedDays } }); return { leaveRequest: toLeaveRequest(request) };
}

export async function requestLeaveCancellation(requestId: string, reason: string, actor: SafeUser, context: RequestContext) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(requestId)) throw new LeaveRequestServiceError("NOT_FOUND", "Leave request not found.", 404);
  const request = await LeaveRequest.findOne({ _id: requestId, userId: actor.id });
  if (!request) throw new LeaveRequestServiceError("NOT_FOUND", "Leave request not found.", 404);
  if (request.status !== "APPROVED") throw new LeaveRequestServiceError("INVALID_STATUS", "Only approved leave can enter cancellation review.", 409);
  request.status = "CANCELLATION_PENDING";
  request.approvalHistory.push({ action: "CANCELLATION_REQUESTED", actorId: new Types.ObjectId(actor.id), actorRole: actor.role, note: reason, decidedAt: new Date() });
  await request.save();
  await writeAuditLog({ actor, action: "LEAVE_CANCELLATION_REQUESTED", entityType: "LeaveRequest", entityId: request._id, ...context, summary: { reason } });
  return { leaveRequest: toLeaveRequest(request) };
}

export async function decideLeaveCancellation(requestId: string, approved: boolean, actor: SafeUser, context: RequestContext) {
  await connectToDatabase();
  if (!canViewLeaveInbox(actor)) throw new LeaveRequestServiceError("INSUFFICIENT_PERMISSION", "You cannot decide leave cancellations.", 403);
  if (!Types.ObjectId.isValid(requestId)) throw new LeaveRequestServiceError("NOT_FOUND", "Leave request not found.", 404);
  const request = await LeaveRequest.findById(requestId);
  if (!request) throw new LeaveRequestServiceError("NOT_FOUND", "Leave request not found.", 404);
  if (request.status !== "CANCELLATION_PENDING") throw new LeaveRequestServiceError("INVALID_STATUS", "This cancellation is no longer pending.", 409);
  if (request.userId.toString() === actor.id) throw new LeaveRequestServiceError("SELF_APPROVAL_BLOCKED", "You cannot decide your own cancellation.", 403);
  assertCanDecideLeaveRequest(actor, request.employeeRole);
  request.status = approved ? "CANCELLED" : "APPROVED";
  request.approvalHistory.push({ action: approved ? "CANCELLED" : "CANCELLATION_REJECTED", actorId: new Types.ObjectId(actor.id), actorRole: actor.role, decidedAt: new Date() });
  await request.save();
  if (approved && request.paidDays > 0) await LeaveLedger.updateOne({ employeeId: request.employeeId, year: getWorkYear(request.startDate) }, { $inc: { usedPaidDays: -request.paidDays } });
  await createNotifications([{ recipientUserId: request.userId, title: approved ? "Leave cancellation approved" : "Leave cancellation rejected", message: approved ? "Your approved leave was cancelled." : "Your leave remains approved.", entityType: "LeaveRequest", entityId: request._id }]);
  await writeAuditLog({ actor, action: approved ? "LEAVE_CANCELLATION_APPROVED" : "LEAVE_CANCELLATION_REJECTED", entityType: "LeaveRequest", entityId: request._id, ...context });
  return { leaveRequest: toLeaveRequest(request) };
}

async function decideLeaveRequest(
  requestId: string,
  action: "APPROVED" | "REJECTED",
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

  assertCanDecideLeaveRequest(actor, request.employeeRole);

  request.status = action;
  request.approvalHistory.push({
    action,
    actorId: new Types.ObjectId(actor.id),
    actorRole: actor.role,
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
      message: `Your leave request was ${action.toLowerCase()}.`,
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
  excludeId?: Types.ObjectId,
) {
  const overlap = await LeaveRequest.findOne({
    employeeId,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    status: { $in: ["PENDING", "APPROVED", "CANCELLATION_PENDING"] },
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
  return ["SUPER_ADMIN", "ADMIN", "HR"].includes(actor.role);
}

function assertLeaveRequestRole(actor: SafeUser) {
  if (!canRequestLeave(actor.role)) {
    throw new LeaveRequestServiceError(
      "LEAVE_ROLE_REQUIRED",
      "Leave requests are available only to Employee, Manager, and HR accounts.",
      403,
    );
  }
}

function assertCanDecideLeaveRequest(actor: SafeUser, employeeRole: string) {
  if (!canReceiveLeaveRequest(actor.role, employeeRole as Role)) {
    throw new LeaveRequestServiceError(
      "LEAVE_APPROVER_RESTRICTED",
      "This leave request is not assigned to your dashboard.",
      403,
    );
  }
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
    return day !== 0 && !holidays.has(key);
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

async function findApproverUsers(employeeRole: string) {
  return User.find({
    role: { $in: getLeaveApprovalRoute(employeeRole as Role) },
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
