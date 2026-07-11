"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-md border border-yellow-400/35 px-3 py-2 text-sm font-medium text-yellow-100 transition hover:border-yellow-300 hover:bg-yellow-400 hover:text-black hover:shadow-lg hover:shadow-yellow-900/30"
    >
      Logout
    </button>
  );
}
