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
    <div className="min-h-screen bg-[#f8f3df]">
      <header className="sticky top-0 z-30 border-b border-yellow-500/20 bg-[#090805]/95 shadow-lg shadow-yellow-950/10 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm font-medium tracking-[0.18em] text-yellow-400">
              {user.role}
            </p>
            <p className="text-lg font-semibold text-yellow-50">
              Employee Management System
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium text-yellow-50/82 transition hover:bg-yellow-400 hover:text-black hover:shadow-lg hover:shadow-yellow-900/30"
            >
              Dashboard
            </Link>
            <Link
              href="/users"
              className="rounded-md px-3 py-2 text-sm font-medium text-yellow-50/82 transition hover:bg-yellow-400 hover:text-black hover:shadow-lg hover:shadow-yellow-900/30"
            >
              Users
            </Link>
            <Link
              href="/employees"
              className="rounded-md px-3 py-2 text-sm font-medium text-yellow-50/82 transition hover:bg-yellow-400 hover:text-black hover:shadow-lg hover:shadow-yellow-900/30"
            >
              Employees
            </Link>
            <Link
              href="/payroll"
              className="rounded-md px-3 py-2 text-sm font-medium text-yellow-50/82 transition hover:bg-yellow-400 hover:text-black hover:shadow-lg hover:shadow-yellow-900/30"
            >
              Payroll
            </Link>
            <Link
              href="/audit"
              className="rounded-md px-3 py-2 text-sm font-medium text-yellow-50/82 transition hover:bg-yellow-400 hover:text-black hover:shadow-lg hover:shadow-yellow-900/30"
            >
              Audit
            </Link>
            <Link href="/reports" className="rounded-md px-3 py-2 text-sm font-medium text-yellow-50/82 transition hover:bg-yellow-400 hover:text-black hover:shadow-lg hover:shadow-yellow-900/30">Reports</Link>
            <Link href="/settings" className="rounded-md px-3 py-2 text-sm font-medium text-yellow-50/82 transition hover:bg-yellow-400 hover:text-black hover:shadow-lg hover:shadow-yellow-900/30">Settings</Link>
            <Link href="/profile" className="rounded-md px-3 py-2 text-sm font-medium text-yellow-50/82 transition hover:bg-yellow-400 hover:text-black hover:shadow-lg hover:shadow-yellow-900/30">Profile</Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
