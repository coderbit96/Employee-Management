import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SalaryPaymentSchema = new Schema(
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
    payPeriod: {
      type: String,
      required: true,
      index: true,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    bonuses: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["DRAFT", "PROCESSING", "PAID", "FAILED", "REVERSED"],
      default: "DRAFT",
      index: true,
    },
    paymentMethod: String,
    paymentDate: Date,
    exceptionSnapshot: {
      attendanceDays: {
        type: Number,
        default: 0,
      },
      incompleteAttendanceDays: {
        type: Number,
        default: 0,
      },
      approvedLeaveDays: {
        type: Number,
        default: 0,
      },
      unpaidLeaveDays: {
        type: Number,
        default: 0,
      },
      notes: [String],
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    reversedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reversedAt: Date,
    reversalReason: String,
  },
  { timestamps: true },
);

SalaryPaymentSchema.index({ employeeId: 1, payPeriod: 1, status: 1 });

export type SalaryPaymentDocument = InferSchemaType<
  typeof SalaryPaymentSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const SalaryPayment =
  (mongoose.models.SalaryPayment as Model<SalaryPaymentDocument>) ||
  mongoose.model<SalaryPaymentDocument>("SalaryPayment", SalaryPaymentSchema);
