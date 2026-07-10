"use client";

import { ChangeEvent, useState } from "react";

type PasswordInputProps = {
  label: string;
  name?: string;
  id?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
};

export function PasswordInput({
  label,
  name,
  id,
  value,
  onChange,
  autoComplete = "current-password",
  required = true,
  className = "block text-sm font-medium text-slate-800",
  inputClassName = "mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-16 text-slate-950 shadow-sm",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? name;

  return (
    <label className={className} htmlFor={inputId}>
      {label}
      <span className="relative mt-2 block">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={inputClassName}
          required={required}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-2 my-auto h-8 rounded px-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}
