"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const installedHandler = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa-install-banner"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="fixed bottom-[calc(var(--bottom-nav-h,64px)+12px)] left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-32px)] max-w-[448px]"
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-color)",
            }}
          >
            {/* App icon */}
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-sm">
              <Image
                src="/icons/icon-192x192.png"
                alt="CapFlow"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold leading-tight truncate"
                style={{ color: "var(--text-primary)" }}
              >
                Install CapFlow
              </p>
              <p
                className="text-xs leading-tight mt-0.5 truncate"
                style={{ color: "var(--text-secondary)" }}
              >
                Get the best experience on your device
              </p>
            </div>

            {/* Install button */}
            <button
              onClick={handleInstall}
              className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
              style={{
                backgroundColor: "#6366F1",
              }}
            >
              Install
            </button>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install banner"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-card-hover)]"
              style={{ color: "var(--text-secondary)" }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
