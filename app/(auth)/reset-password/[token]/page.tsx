import { SetupPasswordForm } from "@/components/auth/setup-password-form";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <SetupPasswordForm token={token} mode="reset" />
    </main>
  );
}

