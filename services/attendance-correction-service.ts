import { Types } from "mongoose";
import { Attendance } from "@/models/Attendance";
import { AttendanceCorrection } from "@/models/AttendanceCorrection";
import { writeAuditLog } from "@/lib/audit/log";
import { connectToDatabase } from "@/lib/db/mongoose";
import type { SafeUser } from "@/types/domain";

type Context = { requestId?: string; ipHash?: string; userAgent?: string };
export class AttendanceCorrectionError extends Error { constructor(public code: string, message: string, public status = 400) { super(message); } }

export async function listAttendanceCorrections(actor: SafeUser) {
  await connectToDatabase();
  if (!["SUPER_ADMIN", "ADMIN", "HR"].includes(actor.role)) throw new AttendanceCorrectionError("INSUFFICIENT_PERMISSION", "You cannot view attendance corrections.", 403);
  const corrections = await AttendanceCorrection.find({ status: "PENDING" }).sort({ createdAt: 1 }).limit(100).lean();
  return { corrections: corrections.map((item) => ({ id: item._id.toString(), attendanceId: item.attendanceId.toString(), originalCheckInAt: item.originalCheckInAt.toISOString(), originalCheckOutAt: item.originalCheckOutAt?.toISOString(), proposedCheckInAt: item.proposedCheckInAt.toISOString(), proposedCheckOutAt: item.proposedCheckOutAt?.toISOString(), reason: item.reason, status: item.status })) };
}

export async function requestAttendanceCorrection(attendanceId: string, input: { checkInAt: Date; checkOutAt?: Date; reason: string }, actor: SafeUser, context: Context) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(attendanceId)) throw new AttendanceCorrectionError("NOT_FOUND", "Attendance record not found.", 404);
  const attendance = await Attendance.findOne({ _id: attendanceId, userId: actor.id });
  if (!attendance) throw new AttendanceCorrectionError("NOT_FOUND", "Attendance record not found.", 404);
  if (await AttendanceCorrection.exists({ attendanceId, status: "PENDING" })) throw new AttendanceCorrectionError("CORRECTION_PENDING", "A correction is already pending for this record.", 409);
  const correction = await AttendanceCorrection.create({ attendanceId: attendance._id, requesterId: actor.id, originalCheckInAt: attendance.checkInAt, originalCheckOutAt: attendance.checkOutAt, proposedCheckInAt: input.checkInAt, proposedCheckOutAt: input.checkOutAt, reason: input.reason });
  await writeAuditLog({ actor, action: "ATTENDANCE_CORRECTION_REQUESTED", entityType: "AttendanceCorrection", entityId: correction._id, ...context, summary: { attendanceId } });
  return { correction: { id: correction._id.toString(), status: correction.status } };
}

export async function decideAttendanceCorrection(correctionId: string, input: { action: "APPROVED" | "REJECTED"; note: string }, actor: SafeUser, context: Context) {
  await connectToDatabase();
  if (!["SUPER_ADMIN", "ADMIN", "HR"].includes(actor.role)) throw new AttendanceCorrectionError("INSUFFICIENT_PERMISSION", "You cannot decide attendance corrections.", 403);
  if (!Types.ObjectId.isValid(correctionId)) throw new AttendanceCorrectionError("NOT_FOUND", "Correction not found.", 404);
  const correction = await AttendanceCorrection.findById(correctionId);
  if (!correction) throw new AttendanceCorrectionError("NOT_FOUND", "Correction not found.", 404);
  if (correction.status !== "PENDING") throw new AttendanceCorrectionError("ALREADY_DECIDED", "This correction has already been decided.", 409);
  if (correction.requesterId.toString() === actor.id) throw new AttendanceCorrectionError("SELF_APPROVAL_BLOCKED", "You cannot approve your own correction.", 403);
  if (input.action === "APPROVED") {
    const durationMinutes = correction.proposedCheckOutAt ? Math.max(0, Math.round((correction.proposedCheckOutAt.getTime() - correction.proposedCheckInAt.getTime()) / 60000)) : 0;
    await Attendance.updateOne({ _id: correction.attendanceId }, { checkInAt: correction.proposedCheckInAt, checkOutAt: correction.proposedCheckOutAt, durationMinutes, status: correction.proposedCheckOutAt ? "CHECKED_OUT" : "CHECKED_IN" });
  }
  correction.status = input.action; correction.reviewerId = new Types.ObjectId(actor.id); correction.decisionNote = input.note; correction.decidedAt = new Date(); await correction.save();
  await writeAuditLog({ actor, action: `ATTENDANCE_CORRECTION_${input.action}`, entityType: "AttendanceCorrection", entityId: correction._id, ...context, summary: { note: input.note } });
  return { correction: { id: correction._id.toString(), status: correction.status } };
}
