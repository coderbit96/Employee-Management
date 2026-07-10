"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/auth/password-input";

type ApiResponse =
  | { success: true; data: { user: { email: string } } }
  | { success: false; error: { message: string } };

export function SetupPasswordForm({ token }: { token: string }) {
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

    const response = await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
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
        Password reset
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-950">
        Set your password
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Enter the password you want to use for this account.
      </p>

      <PasswordInput
        name="password"
        label="New password"
        autoComplete="new-password"
        className="mt-5 block text-sm font-medium text-slate-800"
        inputClassName="w-full rounded-md border border-slate-300 px-3 py-2 pr-16"
      />

      <PasswordInput
        name="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        className="mt-4 block text-sm font-medium text-slate-800"
        inputClassName="w-full rounded-md border border-slate-300 px-3 py-2 pr-16"
      />

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
