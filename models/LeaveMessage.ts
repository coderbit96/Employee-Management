import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const LeaveMessageSchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "EmployeeProfile",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    employeeEmail: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["UNREAD", "READ"],
      default: "UNREAD",
      index: true,
    },
  },
  { timestamps: true },
);

LeaveMessageSchema.index({ createdAt: -1, status: 1 });

export type LeaveMessageDocument = InferSchemaType<typeof LeaveMessageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LeaveMessage =
  (mongoose.models.LeaveMessage as Model<LeaveMessageDocument>) ||
  mongoose.model<LeaveMessageDocument>("LeaveMessage", LeaveMessageSchema);

