"use client";

import { ChangeEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { AttendanceSummary } from "@/services/attendance-service";

type ApiResponse =
  | { success: true; data: { attendance: AttendanceSummary } }
  | { success: false; error: { message: string } };

export function AttendanceCard({
  initialAttendance,
}: {
  initialAttendance: AttendanceSummary;
}) {
  const router = useRouter();
  const [attendance, setAttendance] = useState(initialAttendance);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");

  async function runAction(action: "check-in" | "check-out") {
    setError("");
    setLoading(action);
    const location = await captureLocation().catch(() => undefined);

    const response = await fetch(`/api/v1/attendance/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        location,
        photoDataUrl: action === "check-in" ? photoDataUrl || undefined : undefined,
      }),
    });
    const payload = (await response.json()) as ApiResponse;
    setLoading("");

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    setAttendance(payload.data.attendance);
    setPhotoDataUrl("");
    router.refresh();
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setPhotoDataUrl(await compressImage(file));
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-emerald-800">Daily attendance</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-950">
        {attendance.workDate}
      </h2>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <Metric label="Status" value={attendance.status.replace("_", " ")} />
        <Metric label="Check in" value={formatTime(attendance.checkInAt)} />
        <Metric label="Check out" value={formatTime(attendance.checkOutAt)} />
      </dl>
      <p className="mt-3 text-sm text-slate-600">
        Duration: {formatDuration(attendance.durationMinutes)}
        {attendance.exception && attendance.exception !== "NONE"
          ? ` - ${attendance.exception.replace("_", " ")}`
          : ""}
      </p>
      {attendance.checkInLocation ? (
        <p className="mt-1 text-xs text-slate-500">
          Check-in location: {attendance.checkInLocation.latitude.toFixed(5)},{" "}
          {attendance.checkInLocation.longitude.toFixed(5)}
          {attendance.checkInLocation.accuracyMeters
            ? ` (${Math.round(attendance.checkInLocation.accuracyMeters)}m)`
            : ""}
        </p>
      ) : null}
      {attendance.checkInPhotoDataUrl ? (
        <Image
          src={attendance.checkInPhotoDataUrl}
          alt="Attendance photo preview"
          width={96}
          height={96}
          className="mt-3 h-24 w-24 rounded-md object-cover"
        />
      ) : null}
      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {attendance.status === "NOT_STARTED" ? (
          <label className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            {photoDataUrl ? "Photo attached" : "Attach photo"}
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              onChange={handlePhoto}
            />
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => runAction("check-in")}
          disabled={attendance.status !== "NOT_STARTED" || Boolean(loading)}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400"
        >
          {loading === "check-in" ? "Checking in..." : "Check in"}
        </button>
        <button
          type="button"
          onClick={() => runAction("check-out")}
          disabled={attendance.status !== "CHECKED_IN" || Boolean(loading)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {loading === "check-out" ? "Checking out..." : "Check out"}
        </button>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-950">{value}</dd>
    </div>
  );
}

function captureLocation() {
  return new Promise<{
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        }),
      reject,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

function compressImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 480 / Math.max(image.width, image.height));
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Unable to compress photo."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      image.onerror = reject;
      image.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
