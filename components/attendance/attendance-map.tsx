"use client";

import dynamic from "next/dynamic";
import type { AttendanceMapPoint } from "./attendance-map-client";

const ClientMap = dynamic(() => import("./attendance-map-client"), { ssr: false, loading: () => <p className="p-5 text-sm text-slate-600">Loading map…</p> });
export function AttendanceMap({ points }: { points: AttendanceMapPoint[] }) { return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-lg font-semibold text-slate-950">Attendance map</h2><p className="mt-1 text-sm text-slate-600">Only locations within your authorized attendance scope are shown.</p></div><ClientMap points={points} /></section>; }
