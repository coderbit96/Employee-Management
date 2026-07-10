type LeaveInboxMessage = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  subject: string;
  message: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt?: string;
};

export function HrLeaveInbox({
  messages,
}: {
  messages: LeaveInboxMessage[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-800">HR mailbox</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Leave mail from employees
          </h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
          {messages.length} messages
        </span>
      </div>
      <div className="mt-4 divide-y divide-slate-100">
        {messages.map((item) => (
          <article key={item.id} className="py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">{item.subject}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {item.employeeName} • {item.employeeEmail}
                </p>
              </div>
              <p className="text-sm text-slate-500">
                {formatDate(item.startDate)} to {formatDate(item.endDate)}
              </p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {item.message}
            </p>
          </article>
        ))}
        {!messages.length ? (
          <p className="py-5 text-sm text-slate-600">
            No leave mail has arrived yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

