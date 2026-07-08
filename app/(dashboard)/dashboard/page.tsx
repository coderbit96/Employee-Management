import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

const cards = [
  {
    title: "Controlled provisioning",
    body: "No public signup route is exposed. Admin-created accounts start invited and force a first password change.",
  },
  {
    title: "Role boundaries",
    body: "Super Admin, Admin, HR, Manager, and Employee checks are centralized for backend authorization.",
  },
  {
    title: "Audit trail",
    body: "Login attempts, account creation, and seed actions write append-only operational audit records.",
  },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-emerald-800">Signed in as {user.email}</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          {user.role.replace("_", " ")} dashboard
        </h1>
        {user.forcePasswordChange ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This account is marked for first-login password change. The password
            setup screen is the next identity feature to complete.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-base font-semibold text-slate-950">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

