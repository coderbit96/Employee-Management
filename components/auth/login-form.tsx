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
      className="w-full rounded-lg border border-yellow-400/25 bg-black/72 p-6 text-yellow-50 shadow-2xl shadow-yellow-950/40 backdrop-blur-xl"
    >
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-yellow-400">
          Secure access
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-yellow-50">
          Employee Management System
        </h1>
        <p className="mt-3 text-sm leading-6 text-yellow-100/72">
          Sign in with the account created by your Super Admin.
        </p>
      </div>

      <label className="block text-sm font-medium text-yellow-50" htmlFor="identifier">
        Email or employee login ID
      </label>
      <input
        id="identifier"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        autoComplete="username"
        className="mt-2 w-full rounded-md border border-yellow-500/30 bg-yellow-50/95 px-3 py-2 text-slate-950 shadow-sm transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20"
        required
      />

      <PasswordInput
        id="password"
        label="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        className="mt-4 block text-sm font-medium text-yellow-50"
        inputClassName="mt-2 w-full rounded-md border border-yellow-500/30 bg-yellow-50/95 px-3 py-2 pr-16 text-slate-950 shadow-sm transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20"
      />

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="gold-hover mt-6 w-full rounded-md bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-yellow-950/30 transition hover:bg-yellow-300 hover:shadow-yellow-500/25 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
      >
        <span className="relative z-10">{loading ? "Signing in..." : "Sign in"}</span>
      </button>
      <Link
        href="/forgot-password"
        className="mt-4 block text-center text-sm font-medium text-yellow-300 hover:text-yellow-100"
      >
        Forgot password?
      </Link>
    </motion.form>
  );
}
