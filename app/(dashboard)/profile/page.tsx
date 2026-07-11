import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { LogoutAllButton } from "@/components/auth/logout-all-button";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyEmployeeProfile } from "@/services/employee-service";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getMyEmployeeProfile(user).catch(() => null);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-yellow-500/25 bg-[#0d0b07] p-6 shadow-xl shadow-yellow-950/10">
        <p className="text-sm font-medium text-yellow-400">My account</p>
        <h1 className="mt-2 text-2xl font-semibold text-yellow-50">
          Profile and security
        </h1>
      </section>
      {data ? (
        <dl className="grid gap-4 rounded-lg border border-yellow-600/20 bg-white p-5 shadow-sm sm:grid-cols-2">
          {Object.entries(data.employee)
            .filter(([, value]) => value)
            .map(([key, value]) => (
              <div
                key={key}
                className="rounded-md border border-yellow-600/10 bg-yellow-50/40 p-3 transition hover:border-yellow-500/45 hover:bg-yellow-50"
              >
                <dt className="text-xs uppercase text-slate-500">
                  {key.replace(/([A-Z])/g, " $1")}
                </dt>
                <dd className="mt-1 text-sm font-medium text-[#161006]">
                  {String(value)}
                </dd>
              </div>
            ))}
        </dl>
      ) : (
        <p className="rounded-lg border border-yellow-600/20 bg-white p-5">
          No employee profile is linked to this account.
        </p>
      )}
      <ChangePasswordForm />
      <LogoutAllButton />
    </div>
  );
}
