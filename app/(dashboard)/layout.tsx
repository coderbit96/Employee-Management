import Link from "next/link";
import { redirect } from "next/navigation";
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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm font-medium text-emerald-800">{user.role}</p>
            <p className="text-lg font-semibold text-slate-950">
              Employee Management System
            </p>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Dashboard
            </Link>
            <Link
              href="/users"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Users
            </Link>
            <Link
              href="/employees"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Employees
            </Link>
            <Link
              href="/payroll"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Payroll
            </Link>
            <Link
              href="/audit"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Audit
            </Link>
            <Link href="/reports" className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">Reports</Link>
            <Link href="/settings" className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">Settings</Link>
            <Link href="/profile" className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">Profile</Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
