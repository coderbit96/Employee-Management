"use client";

import { FormEvent, useState } from "react";

type ApiResponse =
  | {
      success: true;
      data: { message: string; resetUrl?: string };
    }
  | { success: false; error: { message: string } };

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setResetUrl("");
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: form.get("identifier") }),
    });
    const payload = (await response.json()) as ApiResponse;
    setLoading(false);

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    setMessage(payload.data.message);
    setResetUrl(payload.data.resetUrl ?? "");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md rounded-lg border border-emerald-900/10 bg-white p-6 shadow-sm"
    >
      <p className="text-sm font-medium text-emerald-800">Password help</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-950">
        Request a reset link
      </h1>

      <label className="mt-5 block text-sm font-medium text-slate-800">
        Email or login ID
        <input
          name="identifier"
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
          required
        />
      </label>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p>{message}</p>
          {resetUrl ? (
            <p className="mt-2 break-all">
              Dev reset link: <a href={resetUrl}>{resetUrl}</a>
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400"
      >
        {loading ? "Requesting..." : "Request reset"}
      </button>
    </form>
  );
}

