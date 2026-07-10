"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ApiResponse =
  | { success: true; data: { user: { email: string } } }
  | { success: false; error: { message: string } };

export function SetupPasswordForm({
  token,
  mode,
}: {
  token: string;
  mode: "activate" | "reset";
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    const confirmPassword = form.get("confirmPassword");

    if (password !== confirmPassword) {
      setLoading(false);
      setError("Passwords do not match.");
      return;
    }

    const response = await fetch(
      mode === "activate"
        ? "/api/v1/auth/activate"
        : "/api/v1/auth/reset-password",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      },
    );
    const payload = (await response.json()) as ApiResponse;
    setLoading(false);

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md rounded-lg border border-emerald-900/10 bg-white p-6 shadow-sm"
    >
      <p className="text-sm font-medium text-emerald-800">
        {mode === "activate" ? "Account activation" : "Password reset"}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-950">
        Set your password
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Use at least 12 characters with uppercase, lowercase, and a number.
      </p>

      <label className="mt-5 block text-sm font-medium text-slate-800">
        New password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
          required
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-slate-800">
        Confirm password
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
          required
        />
      </label>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400"
      >
        {loading ? "Saving..." : "Save password"}
      </button>
    </form>
  );
}

