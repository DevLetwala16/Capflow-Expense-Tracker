"use client";

import { motion } from "framer-motion";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="flex flex-col items-center gap-6 max-w-xs"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: "backOut" }}
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ backgroundColor: "color-mix(in srgb, #6366F1 12%, transparent)" }}
        >
          <WifiOff size={40} color="#6366F1" strokeWidth={1.8} />
        </motion.div>

        {/* Heading */}
        <div className="flex flex-col gap-2">
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            You&apos;re offline
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            CapFlow works offline — your data is stored on your device. Connect
            to the internet to sync your account.
          </p>
        </div>

        {/* Retry button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => window.location.reload()}
          className="mt-2 px-8 py-3 rounded-2xl font-semibold text-sm text-white shadow-md transition-all hover:opacity-90 active:scale-95"
          style={{
            backgroundColor: "#6366F1",
            boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
          }}
        >
          Retry
        </motion.button>
      </motion.div>
    </div>
  );
}
