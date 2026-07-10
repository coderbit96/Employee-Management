import { EmployeeProfile } from "@/models/EmployeeProfile";
import { LeaveMessage } from "@/models/LeaveMessage";
import { writeAuditLog } from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import type { CreateLeaveMessageInput } from "@/lib/validation/leave-message";
import type { SafeUser } from "@/types/domain";

type RequestContext = {
  requestId?: string;
  ipHash?: string;
  userAgent?: string;
};

export class LeaveMessageServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function sendLeaveMessage(
  input: CreateLeaveMessageInput,
  actor: SafeUser,
  context: RequestContext,
) {
  await connectToDatabase();
  const profile = await EmployeeProfile.findOne({
    userId: actor.id,
    deletedAt: { $exists: false },
  });

  if (!profile || profile.employmentStatus !== "ACTIVE") {
    throw new LeaveMessageServiceError(
      "PROFILE_NOT_ACTIVE",
      "Only active employees can send leave mail.",
      403,
    );
  }

  const leaveMessage = await LeaveMessage.create({
    employeeId: profile._id,
    userId: actor.id,
    employeeName: `${profile.firstName} ${profile.lastName}`,
    employeeEmail: actor.email,
    subject: input.subject,
    message: input.message,
    startDate: input.startDate,
    endDate: input.endDate,
    status: "UNREAD",
  });

  await writeAuditLog({
    actor,
    action: "LEAVE_MAIL_SENT",
    entityType: "LeaveMessage",
    entityId: leaveMessage._id,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    summary: {
      subject: input.subject,
      startDate: input.startDate.toISOString(),
      endDate: input.endDate.toISOString(),
    },
  });

  return {
    leaveMessage: toLeaveMessage(leaveMessage),
  };
}

export async function listLeaveInbox(actor: SafeUser) {
  await connectToDatabase();

  if (!["SUPER_ADMIN", "HR"].includes(actor.role)) {
    throw new LeaveMessageServiceError(
      "INSUFFICIENT_PERMISSION",
      "Only HR or Super Admin can view leave mail.",
      403,
    );
  }

  const messages = await LeaveMessage.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return {
    messages: messages.map(toLeaveMessage),
  };
}

function toLeaveMessage(message: {
  _id: { toString(): string };
  employeeName: string;
  employeeEmail: string;
  subject: string;
  message: string;
  startDate: Date;
  endDate: Date;
  status: "UNREAD" | "READ";
  createdAt?: Date;
}) {
  return {
    id: message._id.toString(),
    employeeName: message.employeeName,
    employeeEmail: message.employeeEmail,
    subject: message.subject,
    message: message.message,
    startDate: message.startDate.toISOString(),
    endDate: message.endDate.toISOString(),
    status: message.status,
    createdAt: message.createdAt?.toISOString(),
  };
}
