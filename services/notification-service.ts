import { Types } from "mongoose";
import { Notification } from "@/models/Notification";
import { connectToDatabase } from "@/lib/db/mongoose";
import type { SafeUser } from "@/types/domain";

export async function createNotifications(
  notifications: Array<{
    recipientUserId: string | Types.ObjectId;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string | Types.ObjectId;
    channel?: "IN_APP" | "EMAIL";
  }>,
) {
  if (!notifications.length) {
    return;
  }

  await Notification.insertMany(
    notifications.map((notification) => ({
      recipientUserId: notification.recipientUserId,
      title: notification.title,
      message: notification.message,
      entityType: notification.entityType,
      entityId: notification.entityId,
      channel: notification.channel ?? "IN_APP",
    })),
  );
}

export async function listNotifications(actor: SafeUser) {
  await connectToDatabase();

  const notifications = await Notification.find({
    recipientUserId: new Types.ObjectId(actor.id),
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return {
    notifications: notifications.map((notification) => ({
      id: notification._id.toString(),
      title: notification.title,
      message: notification.message,
      channel: notification.channel,
      status: notification.status,
      createdAt: notification.createdAt?.toISOString(),
    })),
  };
}

export async function markNotificationRead(notificationId: string, actor: SafeUser) {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(notificationId)) {
    throw new Error("Notification not found.");
  }

  const result = await Notification.updateOne(
    {
      _id: notificationId,
      recipientUserId: new Types.ObjectId(actor.id),
    },
    { status: "READ" },
  );

  if (!result.matchedCount) {
    throw new Error("Notification not found.");
  }

  return { read: true, notificationId };
}
