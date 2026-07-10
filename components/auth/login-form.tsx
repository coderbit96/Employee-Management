"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PasswordInput } from "@/components/auth/password-input";

type ApiResponse =
  | { success: true; data: { forcePasswordChange: boolean } }
  | { success: false; error: { message: string } };

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    await fetch("/api/v1/auth/logout", { method: "POST" });

    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password }),
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
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      onSubmit={onSubmit}
      className="w-full max-w-md rounded-lg border border-emerald-900/10 bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <p className="text-sm font-medium text-emerald-800">Secure access</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Employee Management System
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign in with the account created by your Super Admin.
        </p>
      </div>

      <label className="block text-sm font-medium text-slate-800" htmlFor="identifier">
        Email or employee login ID
      </label>
      <input
        id="identifier"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        autoComplete="username"
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm"
        required
      />

      <PasswordInput
        id="password"
        label="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        className="mt-4 block text-sm font-medium text-slate-800"
      />

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <Link
        href="/forgot-password"
        className="mt-4 block text-center text-sm font-medium text-emerald-800 hover:text-emerald-900"
      >
        Forgot password?
      </Link>
    </motion.form>
  );
}
