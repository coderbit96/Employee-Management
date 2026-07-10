import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const LeaveRequestSchema = new Schema(
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
    employeeRole: {
      type: String,
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      enum: ["PAID", "UNPAID", "SICK", "CASUAL", "OTHER"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    halfDay: {
      type: Boolean,
      default: false,
    },
    requestedDays: {
      type: Number,
      required: true,
      min: 0.5,
    },
    paidDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    unpaidDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    excludedDates: [String],
    approvalRoute: [String],
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"],
      default: "PENDING",
      index: true,
    },
    approvalHistory: [
      {
        action: {
          type: String,
          enum: ["APPROVED", "REJECTED", "WITHDRAWN"],
          required: true,
        },
        actorId: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        actorRole: {
          type: String,
          required: true,
        },
        note: String,
        decidedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

LeaveRequestSchema.index({ employeeId: 1, startDate: 1, endDate: 1, status: 1 });

export type LeaveRequestDocument = InferSchemaType<typeof LeaveRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LeaveRequest =
  (mongoose.models.LeaveRequest as Model<LeaveRequestDocument>) ||
  mongoose.model<LeaveRequestDocument>("LeaveRequest", LeaveRequestSchema);
