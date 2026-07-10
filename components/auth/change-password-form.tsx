"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ApiResponse =
  | { success: true; data: { user: { email: string } } }
  | { success: false; error: { message: string } };

export function ChangePasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const newPassword = form.get("newPassword");

    if (newPassword !== form.get("confirmPassword")) {
      setLoading(false);
      setError("Passwords do not match.");
      return;
    }

    const response = await fetch("/api/v1/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword,
      }),
    });
    const payload = (await response.json()) as ApiResponse;
    setLoading(false);

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    setMessage("Password updated.");
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-950">Change password</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <PasswordField name="currentPassword" label="Current password" />
        <PasswordField name="newPassword" label="New password" />
        <PasswordField name="confirmPassword" label="Confirm new password" />
      </div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400"
      >
        {loading ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}

function PasswordField({ name, label }: { name: string; label: string }) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <input
        name={name}
        type="password"
        autoComplete="new-password"
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
        required
      />
    </label>
  );
}

