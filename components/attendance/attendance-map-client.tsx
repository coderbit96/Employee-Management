"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

export type AttendanceMapPoint = { id: string; employeeName?: string; workDate: string; latitude: number; longitude: number; accuracyMeters?: number };

export default function AttendanceMapClient({ points }: { points: AttendanceMapPoint[] }) {
  if (!points.length) return <p className="p-5 text-sm text-slate-600">No permitted attendance locations to display.</p>;
  const center: [number, number] = [points[0].latitude, points[0].longitude];
  return <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="relative z-0 isolate h-80 w-full" aria-label="Attendance location map">
    <TileLayer attribution="&copy; OpenStreetMap contributors" url={process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
    {points.map((point) => <CircleMarker key={point.id} center={[point.latitude, point.longitude]} radius={8} pathOptions={{ color: "#047857", fillOpacity: 0.8 }}><Popup><strong>{point.employeeName ?? "Me"}</strong><br />{point.workDate}{point.accuracyMeters ? <><br />Accuracy: {Math.round(point.accuracyMeters)}m</> : null}</Popup></CircleMarker>)}
  </MapContainer>;
}
