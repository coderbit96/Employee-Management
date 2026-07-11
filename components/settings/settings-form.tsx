"use client";

import { FormEvent, useState } from "react";
import { normalizeHolidayDate } from "@/lib/dates/holiday-date";

type Settings = {
  timezone: string;
  fullDayMinutes: number;
  annualPaidLeaveDays: number;
  holidayDates: string[];
};

export function SettingsForm({
  settings,
  canEdit,
}: {
  settings: Settings;
  canEdit: boolean;
}) {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawHolidayDates = String(form.get("holidayDates") ?? "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const holidayDates = rawHolidayDates.map((item) => normalizeHolidayDate(item));
    const invalidIndex = holidayDates.findIndex((item) => !item);

    if (invalidIndex !== -1) {
      setIsError(true);
      setMessage(
        `Could not understand “${rawHolidayDates[invalidIndex]}”. Use formats such as 12 January, 12 January 2026, 12/01/2026, or 2026-01-12.`,
      );
      return;
    }

    setSaving(true);
    setMessage("");
    const response = await fetch("/api/v1/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        timezone: form.get("timezone"),
        fullDayMinutes: form.get("fullDayMinutes"),
        annualPaidLeaveDays: form.get("annualPaidLeaveDays"),
        holidayDates,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    setIsError(!payload.success);
    setMessage(
      payload.success
        ? "Settings saved. Holiday dates were normalized to YYYY-MM-DD."
        : payload.error?.message ?? "Unable to save settings.",
    );
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2"
    >
      <Field label="Timezone">
        <input name="timezone" defaultValue={settings.timezone} disabled={!canEdit} className="mt-2 w-full rounded-md border px-3 py-2" />
      </Field>
      <Field label="Full day (minutes)">
        <input name="fullDayMinutes" type="number" min="0" defaultValue={settings.fullDayMinutes} disabled={!canEdit} className="mt-2 w-full rounded-md border px-3 py-2" />
      </Field>
      <Field label="Annual paid leave days">
        <input name="annualPaidLeaveDays" type="number" min="0" step="0.5" defaultValue={settings.annualPaidLeaveDays} disabled={!canEdit} className="mt-2 w-full rounded-md border px-3 py-2" />
      </Field>
      <Field label="Holiday dates (comma/newline separated)">
        <textarea name="holidayDates" defaultValue={settings.holidayDates.join("\n")} disabled={!canEdit} placeholder={"12 January\n23 January\n2026-08-15"} className="mt-2 min-h-24 w-full rounded-md border px-3 py-2" />
        <span className="mt-1 block text-xs font-normal text-slate-500">A missing year uses the current year.</span>
      </Field>
      {canEdit ? <button disabled={saving} className="rounded-md bg-emerald-700 px-4 py-2 text-white disabled:bg-slate-400 md:col-span-2">{saving ? "Saving…" : "Save settings"}</button> : null}
      {message ? <p role="status" className={`text-sm md:col-span-2 ${isError ? "text-red-700" : "text-emerald-700"}`}>{message}</p> : null}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-medium">{label}{children}</label>;
}
