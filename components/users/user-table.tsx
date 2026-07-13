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

type UserAction = "suspend" | "reactivate" | "reset-password";

export function UserTable({ users }: { users: Account[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isClearingDeleted, setIsClearingDeleted] = useState(false);
  const [clearedDeleted, setClearedDeleted] = useState(false);
  const visibleUsers = clearedDeleted
    ? users.filter((account) => account.status !== "DELETED")
    : users;
  const hasDeletedUsers = visibleUsers.some(
    (account) => account.status === "DELETED",
  );

  async function runAction(account: Account, action: UserAction) {
    const value =
      action === "reset-password"
        ? window.prompt("Enter a temporary password (at least 10 characters):")
        : getStatusActionReason(action);

    if (!value) {
      return;
    }

    const response = await fetch(`/api/v1/users/${account.id}/${action}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(action === "reset-password" ? { password: value } : { reason: value }),
    });
    const payload = await response.json();
    setMessage(payload.success ? "Account updated." : payload.error?.message ?? "Account update failed.");
    if (payload.success) router.refresh();
  }

  async function clearDeletedAccounts() {
    if (!hasDeletedUsers || isClearingDeleted) {
      return;
    }

    setIsClearingDeleted(true);
    setMessage("");

    const response = await fetch("/api/v1/users/deleted", {
      method: "DELETE",
    });
    const payload = (await response.json()) as
      | { success: true; data: { deletedCount: number } }
      | { success: false; error: { message: string } };

    setIsClearingDeleted(false);

    if (!payload.success) {
      setMessage(payload.error.message);
      return;
    }

    setClearedDeleted(true);
    setMessage(`Cleared ${payload.data.deletedCount} deleted account(s).`);
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">Recent accounts</h2>
        <button
          type="button"
          onClick={clearDeletedAccounts}
          disabled={!hasDeletedUsers || isClearingDeleted}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-yellow-500 hover:bg-yellow-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        >
          {isClearingDeleted ? "Clearing..." : "Clear all"}
        </button>
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
            {visibleUsers.map((account) => {
              const statusAction = getStatusAction(account);
              const canManageAccount = isManageableAccount(account);

              return (
                <tr key={account.id}>
                  <td className="px-5 py-3 text-slate-900">{account.email}</td>
                  <td className="px-5 py-3 text-slate-700">{account.role}</td>
                  <td className="px-5 py-3 text-slate-700">
                    <StatusBadge status={account.status} />
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {account.forcePasswordChange ? "Change required" : "Set"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      {statusAction ? (
                        <button
                          type="button"
                          className={statusAction.className}
                          onClick={() => runAction(account, statusAction.action)}
                        >
                          {statusAction.label}
                        </button>
                      ) : null}
                      {canManageAccount ? (
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
                          onClick={() => runAction(account, "reset-password")}
                        >
                          Reset password
                        </button>
                      ) : null}
                      {!canManageAccount ? (
                        <span className="text-slate-400">No actions</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!visibleUsers.length ? (
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

function getStatusAction(account: Account):
  | { action: "suspend" | "reactivate"; label: string; className: string }
  | null {
  if (!isManageableAccount(account)) {
    return null;
  }

  if (account.status === "ACTIVE") {
    return {
      action: "suspend",
      label: "Deactivate",
      className:
        "rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:border-amber-500 hover:bg-amber-100",
    };
  }

  if (account.status === "SUSPENDED") {
    return {
      action: "reactivate",
      label: "Activate",
      className:
        "rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:border-emerald-500 hover:bg-emerald-100",
    };
  }

  return null;
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";

  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
      <span>{status}</span>
    </span>
  );
}

function isManageableAccount(account: Account) {
  return (
    account.role !== "SUPER_ADMIN" &&
    !["DELETED", "OFFBOARDED"].includes(account.status)
  );
}

function getStatusActionReason(action: Exclude<UserAction, "reset-password">) {
  return action === "suspend"
    ? "Account deactivated by administrator."
    : "Account activated by administrator.";
}
