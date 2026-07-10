import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const LeaveLedgerSchema = new Schema(
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
    year: {
      type: Number,
      required: true,
      index: true,
    },
    openingPaidDays: {
      type: Number,
      default: 18,
      min: 0,
    },
    usedPaidDays: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

LeaveLedgerSchema.index({ employeeId: 1, year: 1 }, { unique: true });

export type LeaveLedgerDocument = InferSchemaType<typeof LeaveLedgerSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LeaveLedger =
  (mongoose.models.LeaveLedger as Model<LeaveLedgerDocument>) ||
  mongoose.model<LeaveLedgerDocument>("LeaveLedger", LeaveLedgerSchema);
