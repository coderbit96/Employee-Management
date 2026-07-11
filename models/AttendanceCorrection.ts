import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AttendanceCorrectionSchema = new Schema({
  attendanceId: { type: Schema.Types.ObjectId, ref: "Attendance", required: true, index: true },
  requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  originalCheckInAt: { type: Date, required: true },
  originalCheckOutAt: Date,
  proposedCheckInAt: { type: Date, required: true },
  proposedCheckOutAt: Date,
  reason: { type: String, required: true },
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
  reviewerId: { type: Schema.Types.ObjectId, ref: "User" },
  decisionNote: String,
  decidedAt: Date,
}, { timestamps: true });

AttendanceCorrectionSchema.index({ attendanceId: 1, status: 1 });
export type AttendanceCorrectionDocument = InferSchemaType<typeof AttendanceCorrectionSchema> & { _id: mongoose.Types.ObjectId };
export const AttendanceCorrection = (mongoose.models.AttendanceCorrection as Model<AttendanceCorrectionDocument>) || mongoose.model<AttendanceCorrectionDocument>("AttendanceCorrection", AttendanceCorrectionSchema);
