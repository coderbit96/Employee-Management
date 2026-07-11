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
      <section className="rounded-lg border border-yellow-500/25 bg-[#0d0b07] p-6 shadow-xl shadow-yellow-950/10">
        <p className="text-sm font-medium text-yellow-400">User provisioning</p>
        <h1 className="mt-2 text-2xl font-semibold text-yellow-50">
          Accounts and access
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-yellow-100/70">
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
