import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const NotificationSchema = new Schema(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["IN_APP", "EMAIL"],
      default: "IN_APP",
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: String,
    entityId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    status: {
      type: String,
      enum: ["UNREAD", "READ"],
      default: "UNREAD",
      index: true,
    },
    deliveryStatus: { type: String, enum: ["NOT_APPLICABLE", "PENDING", "SENT", "FAILED"], default: "NOT_APPLICABLE", index: true },
    deliveryAttempts: { type: Number, default: 0 },
    lastDeliveryError: { type: String, select: false },
  },
  { timestamps: true },
);

NotificationSchema.index({ recipientUserId: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<
  typeof NotificationSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const Notification =
  (mongoose.models.Notification as Model<NotificationDocument>) ||
  mongoose.model<NotificationDocument>("Notification", NotificationSchema);
