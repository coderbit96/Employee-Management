import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationSettings } from "@/services/settings-service";
import { SettingsForm } from "@/components/settings/settings-form";
export default async function SettingsPage() { const user = await getCurrentUser(); if (!user) redirect("/login"); const data = await getOrganizationSettings(user).catch(() => null); if (!data) return <p className="rounded-lg border bg-white p-5">Your role cannot view organization settings.</p>; const canEdit = user.role === "SUPER_ADMIN" || user.permissions.includes("MANAGE_SETTINGS"); return <div className="space-y-6"><section><p className="text-sm font-medium text-emerald-800">Organization policy</p><h1 className="mt-2 text-2xl font-semibold">Settings</h1></section><SettingsForm settings={data.settings} canEdit={canEdit} /></div>; }
