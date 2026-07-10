import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const OrganizationSettingsSchema = new Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      index: true,
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    fullDayMinutes: {
      type: Number,
      default: 480,
      min: 0,
    },
    annualPaidLeaveDays: {
      type: Number,
      default: 18,
      min: 0,
    },
    holidayDates: [String],
    attendanceCapture: {
      requireLocation: {
        type: Boolean,
        default: false,
      },
      requirePhoto: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true },
);

export type OrganizationSettingsDocument = InferSchemaType<
  typeof OrganizationSettingsSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const OrganizationSettings =
  (mongoose.models.OrganizationSettings as Model<OrganizationSettingsDocument>) ||
  mongoose.model<OrganizationSettingsDocument>(
    "OrganizationSettings",
    OrganizationSettingsSchema,
  );
