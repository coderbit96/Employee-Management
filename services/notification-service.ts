import { Types } from "mongoose";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/db/mongoose";
import { sendEmail } from "@/lib/email/mailer";
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

  const created = await Promise.all(
    notifications.map((notification) => Notification.create({
      recipientUserId: notification.recipientUserId,
      title: notification.title,
      message: notification.message,
      entityType: notification.entityType,
      entityId: notification.entityId,
      channel: notification.channel ?? "IN_APP",
      deliveryStatus: notification.channel === "EMAIL" ? "PENDING" : "NOT_APPLICABLE",
    })),
  );
  await Promise.allSettled(created.filter((item) => item.channel === "EMAIL").map(deliverEmailNotification));
}

async function deliverEmailNotification(notification: InstanceType<typeof Notification>) {
  try {
    const user = await User.findById(notification.recipientUserId).select("email").lean();
    if (!user?.email) throw new Error("Recipient does not have an email address.");
    await sendEmail({ to: user.email, subject: notification.title, text: notification.message });
    notification.deliveryStatus = "SENT"; notification.deliveryAttempts += 1; notification.lastDeliveryError = undefined;
  } catch (error) {
    notification.deliveryStatus = "FAILED"; notification.deliveryAttempts += 1; notification.lastDeliveryError = error instanceof Error ? error.message.slice(0, 500) : "Email delivery failed.";
  }
  await notification.save();
}

export async function retryEmailNotification(notificationId: string, actor: SafeUser) {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role) && !actor.permissions.includes("MANAGE_USERS")) throw new Error("Not authorized.");
  const notification = await Notification.findById(notificationId).select("+lastDeliveryError");
  if (!notification || notification.channel !== "EMAIL" || notification.deliveryStatus === "SENT") throw new Error("Email notification cannot be retried.");
  await deliverEmailNotification(notification);
  return { notificationId, deliveryStatus: notification.deliveryStatus };
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
      deliveryStatus: notification.deliveryStatus,
      createdAt: notification.createdAt?.toISOString(),
    })),
  };
}

export async function clearNotificationHistory(actor: SafeUser) {
  await connectToDatabase();

  const result = await Notification.deleteMany({
    recipientUserId: new Types.ObjectId(actor.id),
  });

  return { deletedCount: result.deletedCount ?? 0 };
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
