import { redirect } from "next/navigation";
import { ConstellationBackground } from "@/components/auth/constellation-background";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <ConstellationBackground />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.24)_52%,rgba(0,0,0,0.72)_100%)]" />
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
