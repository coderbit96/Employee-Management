import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginSuccessToast } from "@/components/layout/login-success-toast";
import { LogoutButton } from "@/components/layout/logout-button";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="dashboard-shell min-h-screen">
      <LoginSuccessToast />
      <header className="dashboard-topbar sticky top-0 z-[1200] border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-cyan-200">
              {user.role}
            </p>
            <p className="text-lg font-semibold text-white">
              Employee Management System
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="dashboard-nav-link rounded-md px-3 py-2 text-sm font-medium transition"
            >
              Dashboard
            </Link>
            <Link
              href="/users"
              className="dashboard-nav-link rounded-md px-3 py-2 text-sm font-medium transition"
            >
              Users
            </Link>
            <Link
              href="/employees"
              className="dashboard-nav-link rounded-md px-3 py-2 text-sm font-medium transition"
            >
              Employees
            </Link>
            <Link
              href="/payroll"
              className="dashboard-nav-link rounded-md px-3 py-2 text-sm font-medium transition"
            >
              Payroll
            </Link>
            <Link
              href="/audit"
              className="dashboard-nav-link rounded-md px-3 py-2 text-sm font-medium transition"
            >
              Audit
            </Link>
            <Link href="/reports" className="dashboard-nav-link rounded-md px-3 py-2 text-sm font-medium transition">Reports</Link>
            <Link href="/settings" className="dashboard-nav-link rounded-md px-3 py-2 text-sm font-medium transition">Settings</Link>
            <Link href="/profile" className="dashboard-nav-link rounded-md px-3 py-2 text-sm font-medium transition">Profile</Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
