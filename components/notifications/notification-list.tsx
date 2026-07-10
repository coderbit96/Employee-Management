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
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-emerald-800">Notifications</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-950">
        Inbox and email events
      </h2>
      <div className="mt-4 divide-y divide-slate-100">
        {notifications.map((notification) => (
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
        {!notifications.length ? (
          <p className="py-3 text-sm text-slate-600">No notifications yet.</p>
        ) : null}
      </div>
    </section>
  );
}
