"use client";

import { useEffect, useState } from "react";

const LOGIN_SUCCESS_KEY = "ems_login_success";

export function LoginSuccessToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(LOGIN_SUCCESS_KEY) !== "1") {
      return;
    }

    window.sessionStorage.removeItem(LOGIN_SUCCESS_KEY);

    const showTimeout = window.setTimeout(() => {
      setVisible(true);
    }, 0);
    const hideTimeout = window.setTimeout(() => {
      setVisible(false);
    }, 3200);

    return () => {
      window.clearTimeout(showTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="login-success-toast fixed right-4 top-24 z-50 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-xl shadow-emerald-950/15"
    >
      Successfully Login
    </div>
  );
}
