"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  channel: string;
  status: string;
  createdAt?: string;
};

export function NotificationList({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [message, setMessage] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  async function clearHistory() {
    if (!items.length || isClearing) {
      return;
    }

    const confirmed = window.confirm("Clear notification history?");
    if (!confirmed) {
      return;
    }

    setIsClearing(true);
    setMessage("");

    const response = await fetch("/api/v1/notifications", {
      method: "DELETE",
    });
    const payload = (await response.json()) as
      | { success: true; data: { deletedCount: number } }
      | { success: false; error: { message: string } };

    setIsClearing(false);

    if (!payload.success) {
      setMessage(payload.error.message);
      return;
    }

    setItems([]);
    setMessage("Notification history cleared.");
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-800">Notifications</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Inbox and email events
          </h2>
        </div>
        <button
          type="button"
          onClick={clearHistory}
          disabled={!items.length || isClearing}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-yellow-500 hover:bg-yellow-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        >
          {isClearing ? "Clearing..." : "Clear history"}
        </button>
      </div>
      <div className="mt-4 divide-y divide-slate-100">
        {items.map((notification) => (
          <article key={notification.id} className="py-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-medium text-slate-950">{notification.title}</p>
              <span className="text-xs uppercase text-slate-500">
                {notification.channel}
              </span>
            </div>
            <p className="mt-1 text-slate-700">{notification.message}</p>
            <p className="mt-1 text-xs text-slate-500">
              {notification.createdAt
                ? new Date(notification.createdAt).toLocaleString("en-IN")
                : ""}
            </p>
          </article>
        ))}
        {!items.length ? (
          <p className="py-3 text-sm text-slate-600">No notifications yet.</p>
        ) : null}
      </div>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
