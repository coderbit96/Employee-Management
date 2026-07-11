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
          className="password-visibility-button absolute inset-y-0 right-2 my-auto flex h-8 w-8 items-center justify-center rounded text-yellow-900"
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M2.1 12s3.6-7 9.9-7 9.9 7 9.9 7-3.6 7-9.9 7-9.9-7-9.9-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.8" />
      <path d="M9.9 5.2A10.5 10.5 0 0 1 12 5c6.3 0 9.9 7 9.9 7a17.5 17.5 0 0 1-3.1 4" />
      <path d="M6.1 6.8A17.1 17.1 0 0 0 2.1 12s3.6 7 9.9 7a9.7 9.7 0 0 0 4.1-.9" />
    </svg>
  );
}
