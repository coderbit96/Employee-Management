import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AttendanceSchema = new Schema(
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
    workDate: {
      type: String,
      required: true,
      index: true,
    },
    checkInAt: {
      type: Date,
      required: true,
    },
    checkInLocation: {
      latitude: Number,
      longitude: Number,
      accuracyMeters: Number,
    },
    checkInPhotoDataUrl: String,
    checkOutAt: Date,
    checkOutLocation: {
      latitude: Number,
      longitude: Number,
      accuracyMeters: Number,
    },
    durationMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },
    exception: {
      type: String,
      enum: ["NONE", "SHORT_DAY", "MISSING_CHECKOUT"],
      default: "NONE",
      index: true,
    },
    status: {
      type: String,
      enum: ["CHECKED_IN", "CHECKED_OUT"],
      default: "CHECKED_IN",
      index: true,
    },
  },
  { timestamps: true },
);

AttendanceSchema.index({ employeeId: 1, workDate: 1 }, { unique: true });

export type AttendanceDocument = InferSchemaType<typeof AttendanceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Attendance =
  (mongoose.models.Attendance as Model<AttendanceDocument>) ||
  mongoose.model<AttendanceDocument>("Attendance", AttendanceSchema);
