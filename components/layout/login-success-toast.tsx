"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="fixed right-4 top-24 z-50 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-xl shadow-emerald-950/15"
        >
          Successfully Login
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
