"use client";

type Account = {
  id: string;
  email: string;
  role: string;
  status: string;
  forcePasswordChange: boolean;
};

export function UserTable({ users }: { users: Account[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">Recent accounts</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-5 py-3 font-medium">Email/Login</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Password</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((account) => (
              <tr key={account.id}>
                <td className="px-5 py-3 text-slate-900">{account.email}</td>
                <td className="px-5 py-3 text-slate-700">{account.role}</td>
                <td className="px-5 py-3 text-slate-700">{account.status}</td>
                <td className="px-5 py-3 text-slate-700">
                  {account.forcePasswordChange ? "Change required" : "Set"}
                </td>
              </tr>
            ))}
            {!users.length ? (
              <tr>
                <td className="px-5 py-5 text-slate-600" colSpan={4}>
                  No accounts found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
