import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings/settings-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationSettings } from "@/services/settings-service";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getOrganizationSettings(user).catch(() => null);

  if (!data) {
    return (
      <p className="rounded-lg border border-yellow-600/20 bg-white p-5">
        Your role cannot view organization settings.
      </p>
    );
  }

  const canEdit =
    user.role === "SUPER_ADMIN" || user.permissions.includes("MANAGE_SETTINGS");

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-yellow-500/25 bg-[#0d0b07] p-6 shadow-xl shadow-yellow-950/10">
        <p className="text-sm font-medium text-yellow-400">
          Organization policy
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-yellow-50">
          Settings
        </h1>
      </section>
      <SettingsForm settings={data.settings} canEdit={canEdit} />
    </div>
  );
}
