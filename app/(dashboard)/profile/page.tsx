import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyEmployeeProfile } from "@/services/employee-service";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { LogoutAllButton } from "@/components/auth/logout-all-button";
export default async function ProfilePage(){const user=await getCurrentUser();if(!user)redirect("/login");const data=await getMyEmployeeProfile(user).catch(()=>null);return <div className="space-y-6"><section><p className="text-sm font-medium text-emerald-800">My account</p><h1 className="mt-2 text-2xl font-semibold">Profile and security</h1></section>{data?<dl className="grid gap-4 rounded-lg border bg-white p-5 sm:grid-cols-2">{Object.entries(data.employee).filter(([,value])=>value).map(([key,value])=><div key={key}><dt className="text-xs uppercase text-slate-500">{key.replace(/([A-Z])/g," $1")}</dt><dd className="mt-1 text-sm font-medium">{String(value)}</dd></div>)}</dl>:<p className="rounded-lg border bg-white p-5">No employee profile is linked to this account.</p>}<ChangePasswordForm/><LogoutAllButton/></div>}
