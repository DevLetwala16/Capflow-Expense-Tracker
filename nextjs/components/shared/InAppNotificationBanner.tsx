"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, AlertCircle, CheckCircle2, X } from "lucide-react";
import { InAppNotificationEventDetail } from "@/lib/notifications/notificationEngine";

export function InAppNotificationBanner() {
  const [activeNotification, setActiveNotification] = useState<InAppNotificationEventDetail | null>(null);

  const handleDismiss = useCallback(() => {
    setActiveNotification(null);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<InAppNotificationEventDetail>;
      if (custom.detail) {
        setActiveNotification(custom.detail);
      }
    };

    window.addEventListener("capflow-inapp-notification", handler);
    return () => window.removeEventListener("capflow-inapp-notification", handler);
  }, []);

  // Auto dismiss after 6 seconds
  useEffect(() => {
    if (!activeNotification) return;
    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeNotification]);

  if (!activeNotification) return null;

  const isAlert = activeNotification.type === "alert";
  const isWarning = activeNotification.type === "warning";
  const isSuccess = activeNotification.type === "success";

  const borderColor = isAlert
    ? "border-rose-500/40"
    : isWarning
    ? "border-amber-500/40"
    : isSuccess
    ? "border-emerald-500/40"
    : "border-indigo-500/40";

  const glowColor = isAlert
    ? "shadow-rose-500/10"
    : isWarning
    ? "shadow-amber-500/10"
    : isSuccess
    ? "shadow-emerald-500/10"
    : "shadow-indigo-500/15";

  const IconComponent = isAlert
    ? AlertCircle
    : isWarning
    ? AlertTriangle
    : isSuccess
    ? CheckCircle2
    : Bell;

  const iconColor = isAlert
    ? "text-rose-400 bg-rose-500/10"
    : isWarning
    ? "text-amber-400 bg-amber-500/10"
    : isSuccess
    ? "text-emerald-400 bg-emerald-500/10"
    : "text-indigo-400 bg-indigo-500/10";

  return (
    <div className="fixed top-4 left-0 right-0 z-[9999] flex justify-center px-4 pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className={`pointer-events-auto w-full max-w-md p-3.5 sm:p-4 rounded-2xl bg-[#0f1422]/95 backdrop-blur-xl border ${borderColor} shadow-2xl ${glowColor} flex items-start gap-3 select-none`}
        >
          {/* Icon Badge */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
            <IconComponent size={18} strokeWidth={2.2} />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
              {activeNotification.title}
            </h4>
            <p className="text-[11px] sm:text-xs text-zinc-300 mt-0.5 leading-relaxed break-words">
              {activeNotification.body}
            </p>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
