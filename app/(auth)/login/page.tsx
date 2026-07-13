import { redirect } from "next/navigation";
import { DynamicLoginBackground } from "@/components/auth/dynamic-login-background";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="login-page-shell relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      <DynamicLoginBackground />
      <div className="relative z-10 w-full max-w-[460px]">
        <LoginForm />
      </div>
    </main>
  );
}
