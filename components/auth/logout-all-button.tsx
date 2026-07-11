"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function LogoutAllButton() { const router = useRouter(); const [loading,setLoading]=useState(false); async function logoutAll(){if(!window.confirm("Sign out every active session?"))return;setLoading(true);await fetch("/api/v1/auth/logout-all",{method:"POST"});router.replace("/login");router.refresh();} return <button onClick={logoutAll} disabled={loading} className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">{loading?"Signing out…":"Sign out all devices"}</button>; }
