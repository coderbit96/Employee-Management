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
      <section className="dashboard-hero rounded-lg border p-6 shadow-xl">
        <p className="text-sm font-medium text-cyan-200">
          Organization policy
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Settings
        </h1>
      </section>
      <SettingsForm settings={data.settings} canEdit={canEdit} />
    </div>
  );
}
