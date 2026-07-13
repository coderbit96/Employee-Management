import { redirect } from "next/navigation";
import { CreateUserForm } from "@/components/users/create-user-form";
import { UserTable } from "@/components/users/user-table";
import { getCurrentUser } from "@/lib/auth/session";
import { listUsers } from "@/services/user-service";
import { canManageUsers } from "@/lib/permissions/roles";

export default async function UsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const canCreateUsers = canManageUsers(user);
  const userList = canCreateUsers
    ? await listUsers(user, { page: 1, limit: 20 })
    : null;

  return (
    <div className="space-y-6">
      <section className="dashboard-hero rounded-lg border p-6 shadow-xl">
        <p className="text-sm font-medium text-cyan-200">User provisioning</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Accounts and access
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50/78">
          Authorized Admins control account creation. Public signup is intentionally absent.
        </p>
      </section>

      {canCreateUsers ? (
        <>
          <CreateUserForm />
          <UserTable users={userList?.users ?? []} />
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Your role can view scoped work data, but it cannot create user accounts.
        </div>
      )}
    </div>
  );
}
