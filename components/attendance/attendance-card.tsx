"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [locationStatus, setLocationStatus] = useState(
    "Location will be captured automatically from this device.",
  );
  const [breakMinutes, setBreakMinutes] = useState(0);

  useEffect(() => {
    return () => stopCameraStream(streamRef.current);
  }, []);

  async function openCamera() {
    setError("");

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Live camera is unavailable. Use HTTPS or localhost and allow camera permission in the browser.",
      );
      return;
    }

    try {
      stopCameraStream(streamRef.current);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setCameraOpen(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch (cameraError) {
      setCameraOpen(false);
      setError(getCameraError(cameraError));
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setError("The camera is still starting. Please wait a moment and try again.");
      return;
    }

    try {
      setPhotoDataUrl(captureVideoFrame(video));
      stopCameraStream(streamRef.current);
      streamRef.current = null;
      setCameraOpen(false);
      setError("");
    } catch (captureError) {
      setError(
        captureError instanceof Error
          ? captureError.message
          : "Unable to capture the camera photo.",
      );
    }
  }

  async function retakePhoto() {
    setPhotoDataUrl("");
    await openCamera();
  }

  async function runAction(action: "check-in" | "check-out") {
    setError("");

    if (action === "check-in" && !photoDataUrl) {
      setError("Open the live camera and capture a check-in photo first.");
      return;
    }

    setLoading(action);
    setLocationStatus("Requesting precise location from this device…");

    let location: Awaited<ReturnType<typeof captureDeviceLocation>>;
    try {
      location = await captureDeviceLocation();
      setLocationStatus(
        `Device location captured (${Math.round(location.accuracyMeters ?? 0)}m accuracy).`,
      );
    } catch (locationError) {
      setLoading("");
      setLocationStatus("Device location was not captured.");
      setError(getLocationError(locationError));
      return;
    }

    const response = await fetch(`/api/v1/attendance/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        location,
        photoDataUrl: action === "check-in" ? photoDataUrl : undefined,
        breakDurationMinutes: action === "check-out" ? breakMinutes : 0,
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
        Net duration: {formatDuration(attendance.durationMinutes)}
        {attendance.breakDurationMinutes
          ? ` (gross ${formatDuration(attendance.grossDurationMinutes ?? attendance.durationMinutes)}, break ${formatDuration(attendance.breakDurationMinutes)})`
          : ""}
        {attendance.exception && attendance.exception !== "NONE"
          ? ` - ${attendance.exception.replace("_", " ")}`
          : ""}
      </p>

      {attendance.checkInLocation ? (
        <p className="mt-1 text-xs text-slate-500">
          Check-in location: {attendance.checkInLocation.latitude.toFixed(5)}, {" "}
          {attendance.checkInLocation.longitude.toFixed(5)}
          {attendance.checkInLocation.accuracyMeters
            ? ` (${Math.round(attendance.checkInLocation.accuracyMeters)}m)`
            : ""}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-slate-500" role="status">
        {locationStatus}
      </p>

      {attendance.checkInPhotoDataUrl ? (
        <Image
          src={attendance.checkInPhotoDataUrl}
          alt="Captured attendance photo"
          width={120}
          height={120}
          className="mt-3 h-28 w-28 rounded-md object-cover"
        />
      ) : null}

      {attendance.status === "NOT_STARTED" ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Live check-in camera</p>
          <p className="mt-1 text-xs text-slate-600">
            Gallery uploads are disabled. Capture a current photo from this device.
          </p>

          {cameraOpen ? (
            <div className="mt-3 space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="aspect-square max-h-80 w-full rounded-md bg-black object-cover sm:max-w-sm"
                aria-label="Live camera preview"
              />
              <div className="flex gap-2">
                <button type="button" onClick={capturePhoto} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
                  Capture photo
                </button>
                <button type="button" onClick={() => { stopCameraStream(streamRef.current); streamRef.current = null; setCameraOpen(false); }} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Cancel camera
                </button>
              </div>
            </div>
          ) : photoDataUrl ? (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <Image src={photoDataUrl} alt="Newly captured check-in photo" width={160} height={160} className="h-32 w-32 rounded-md object-cover" />
              <div>
                <p className="mb-2 text-sm font-medium text-emerald-800">Live photo captured and attached.</p>
                <button type="button" onClick={retakePhoto} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Retake photo
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={openCamera} className="mt-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Open live camera
            </button>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {attendance.status === "CHECKED_IN" ? (
          <label className="text-sm text-slate-700">
            Break minutes
            <input type="number" min="0" max="720" value={breakMinutes} onChange={(event) => setBreakMinutes(Number(event.target.value))} className="ml-2 w-20 rounded-md border px-2 py-1" />
          </label>
        ) : null}
        <button type="button" onClick={() => runAction("check-in")} disabled={attendance.status !== "NOT_STARTED" || !photoDataUrl || Boolean(loading) || cameraOpen} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-400">
          {loading === "check-in" ? "Capturing location…" : "Check in"}
        </button>
        <button type="button" onClick={() => runAction("check-out")} disabled={attendance.status !== "CHECKED_IN" || Boolean(loading)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {loading === "check-out" ? "Capturing location…" : "Check out"}
        </button>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-950">{value}</dd></div>;
}

function captureDeviceLocation() {
  return new Promise<{
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  }>((resolve, reject) => {
    if (!window.isSecureContext || !navigator.geolocation) {
      reject(new Error("GEOLOCATION_UNAVAILABLE"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      }),
      reject,
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}

function captureVideoFrame(video: HTMLVideoElement) {
  const maxEdge = 480;
  const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare the captured photo.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  let quality = 0.75;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > 145_000 && quality > 0.35) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > 150_000) {
    throw new Error("The captured photo is too large. Please retake it.");
  }
  return dataUrl;
}

function stopCameraStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function getCameraError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") return "Camera permission was denied. Allow camera access in the browser and try again.";
  if (error instanceof DOMException && error.name === "NotFoundError") return "No camera was found on this device.";
  if (error instanceof DOMException && error.name === "NotReadableError") return "The camera is already in use by another application.";
  return "Unable to open the live camera. Check the device camera permission and try again.";
}

function getLocationError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? Number(error.code)
      : 0;
  if (code === 1) return "Location permission was denied. Allow precise location access in the browser and try again.";
  if (code === 2) return "This device could not determine its current location. Turn on location services and try again.";
  if (code === 3) return "Location capture timed out. Move to an area with a better GPS or network signal and try again.";
  return "Location is unavailable. Use HTTPS or localhost, enable device location services, and try again.";
}

function formatTime(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
