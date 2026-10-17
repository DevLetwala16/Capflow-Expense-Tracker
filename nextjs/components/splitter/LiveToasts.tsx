"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";

interface LiveToastItem {
  id: string;
  message: string;
  timestamp: number;
}

interface LiveToastsProps {
  toasts: LiveToastItem[];
  onDismiss: (id: string) => void;
}

export function LiveToasts({ toasts, onDismiss }: LiveToastsProps) {
  return (
    <div className="fixed top-4 right-4 z-[150] flex flex-col gap-2 max-w-[340px] pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-card)]/95 backdrop-blur-md border border-[#6366F1]/30 rounded-2xl shadow-xl shadow-[#6366F1]/10 text-xs font-semibold text-[var(--text-primary)]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-full bg-[#6366F1] text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                <Bell size={12} />
              </div>
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
