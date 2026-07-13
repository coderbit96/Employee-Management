"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

    window.sessionStorage.setItem("ems_login_success", "1");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="login-form-enter login-glass-card w-full px-10 pb-12 pt-10 text-white"
    >
      <div className="mx-auto mb-9 flex h-[110px] w-[110px] items-center justify-center rounded-full border-[4px] border-cyan-300/80 text-cyan-200 shadow-[0_0_26px_rgba(60,200,255,0.5)]">
        <span className="text-3xl font-black tracking-[0.08em]">EMS</span>
      </div>

      <label className="sr-only" htmlFor="identifier">
        Username
      </label>
      <span className="login-field relative block">
        <span className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-white/85">
          <UserIcon />
        </span>
        <input
          id="identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          autoComplete="username"
          placeholder="Username"
          className="h-14 w-full border-0 bg-transparent pl-16 pr-5 text-xl font-semibold tracking-[0.08em] text-white outline-none placeholder:text-white/80 focus:ring-0"
          required
        />
      </span>

      <label className="sr-only" htmlFor="password">
        Password
      </label>
      <span className="login-field relative mt-5 block">
        <span className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-white/85">
          <LockIcon />
        </span>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="************"
          className="h-14 w-full border-0 bg-transparent pl-16 pr-5 text-xl font-semibold tracking-[0.18em] text-white outline-none placeholder:text-white/90 focus:ring-0"
          required
        />
      </span>

      <div className="mt-5 flex items-center justify-between gap-3 text-sm font-semibold text-white/85">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            defaultChecked
            className="h-4 w-4 rounded-sm border-cyan-200/70 bg-sky-950/60 accent-cyan-300"
          />
          Remember me
        </label>
        <Link href="/forgot-password" className="italic hover:text-white">
          Forgot Password?
        </Link>
      </div>

      {error ? (
        <p className="mt-4 rounded border border-red-200/70 bg-red-950/45 px-3 py-2 text-xs font-medium text-red-100">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="neon-login-button mt-10 h-16 w-full rounded-lg bg-gradient-to-r from-[#07336a] to-[#048ed4] px-6 text-lg font-bold uppercase tracking-[0.32em] text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="relative z-10">{loading ? "Signing in..." : "Login"}</span>
      </button>
    </form>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M3.5 18a6.5 6.5 0 0 1 13 0H3.5Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        clipRule="evenodd"
        d="M5 8V6a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h1Zm2 0h6V6a3 3 0 1 0-6 0v2Z"
        fillRule="evenodd"
      />
    </svg>
  );
}
