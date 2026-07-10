import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const EmployeeProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    employeeNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: "EmployeeProfile",
      index: true,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    exitDate: Date,
    employmentStatus: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "OFFBOARDED"],
      default: "ACTIVE",
      index: true,
    },
    salary: {
      baseAmount: {
        type: Number,
        min: 0,
        default: 0,
      },
      currency: {
        type: String,
        default: "INR",
      },
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    deletedAt: {
      type: Date,
      index: true,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

EmployeeProfileSchema.index({ department: 1, employmentStatus: 1 });

export type EmployeeProfileDocument = InferSchemaType<
  typeof EmployeeProfileSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const EmployeeProfile =
  (mongoose.models.EmployeeProfile as Model<EmployeeProfileDocument>) ||
  mongoose.model<EmployeeProfileDocument>(
    "EmployeeProfile",
    EmployeeProfileSchema,
  );
