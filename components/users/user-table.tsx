"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  email: string;
  role: string;
  status: string;
  forcePasswordChange: boolean;
};

export function UserTable({ users }: { users: Account[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function runAction(account: Account, action: "suspend" | "reactivate" | "reset-password") {
    const value = window.prompt(action === "reset-password" ? "Enter a temporary password (at least 10 characters):" : "Enter the reason for this account change:");
    if (!value) return;
    const response = await fetch(`/api/v1/users/${account.id}/${action}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(action === "reset-password" ? { password: value } : { reason: value }),
    });
    const payload = await response.json();
    setMessage(payload.success ? "Account updated." : payload.error?.message ?? "Account update failed.");
    if (payload.success) router.refresh();
  }

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
              <th className="px-5 py-3 font-medium">Actions</th>
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
                <td className="px-5 py-3"><div className="flex flex-wrap gap-2">
                  {account.status === "SUSPENDED" ? <button className="text-emerald-700 underline" onClick={() => runAction(account, "reactivate")}>Reactivate</button> : <button className="text-amber-700 underline" onClick={() => runAction(account, "suspend")}>Suspend</button>}
                  <button className="text-slate-700 underline" onClick={() => runAction(account, "reset-password")}>Reset password</button>
                </div></td>
              </tr>
            ))}
            {!users.length ? (
              <tr>
                <td className="px-5 py-5 text-slate-600" colSpan={5}>
                  No accounts found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {message ? <p className="border-t border-slate-200 px-5 py-3 text-sm text-slate-700">{message}</p> : null}
    </section>
  );
}
