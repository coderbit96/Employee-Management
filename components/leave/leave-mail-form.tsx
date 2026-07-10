"use client";

import { FormEvent, useState } from "react";

type ApiResponse =
  | { success: true; data: unknown }
  | { success: false; error: { message: string } };

export function LeaveMailForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setMessage("");
    setError("");
    setLoading(true);

    const response = await fetch("/api/v1/leave-messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subject: form.get("subject"),
        startDate: form.get("startDate"),
        endDate: form.get("endDate"),
        message: form.get("message"),
      }),
    });
    const payload = (await response.json()) as ApiResponse;
    setLoading(false);

    if (!payload.success) {
      setError(payload.error.message);
      return;
    }

    setMessage("Leave mail sent to HR dashboard.");
    formElement.reset();
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Send leave mail</h2>
      <p className="mt-1 text-sm text-slate-600">
        This message appears in the HR dashboard inbox.
      </p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
        <Field name="subject" label="Subject" />
        <Field name="startDate" label="Leave start" type="date" />
        <Field name="endDate" label="Leave end" type="date" />
        <label className="block text-sm font-medium text-slate-800 md:col-span-2">
          Message
          <textarea
            name="message"
            className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2"
            required
          />
        </label>
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:col-span-2">
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-400 md:col-span-2"
        >
          {loading ? "Sending..." : "Send leave mail"}
        </button>
      </form>
    </section>
  );
}

function Field({
  name,
  label,
  type = "text",
}: {
  name: string;
  label: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <input
        name={name}
        type={type}
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
        required
      />
    </label>
  );
}

