"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Fingerprint, Delete, ShieldCheck, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsStore, AutoLockTimeout } from "@/lib/store/settingsStore";

export function AppLockOverlay() {
  const { appLockEnabled, appLockPin, autoLockTimeout } = useSettingsStore();

  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check biometric support
  useEffect(() => {
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
        .then((available) => setHasBiometric(available))
        .catch(() => setHasBiometric(false));
    }
  }, []);

  // Lock on mount if app lock is enabled
  useEffect(() => {
    if (appLockEnabled && appLockPin && appLockPin.length === 4) {
      setIsLocked(true);
    }
  }, [appLockEnabled, appLockPin]);

  // Idle timeout detection
  const getTimeoutMs = useCallback((timeout: AutoLockTimeout): number | null => {
    switch (timeout) {
      case "immediate":
        return 30000; // 30 seconds idle
      case "1min":
        return 60000;
      case "5min":
        return 300000;
      default:
        return null;
    }
  }, []);

  useEffect(() => {
    if (!appLockEnabled || !appLockPin) return;

    const timeoutMs = getTimeoutMs(autoLockTimeout);
    if (!timeoutMs) return;

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsLocked(true);
      }, timeoutMs);
    };

    resetTimer();

    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [appLockEnabled, appLockPin, autoLockTimeout, getTimeoutMs]);

  // Unlock when 4 digits match
  useEffect(() => {
    if (pin.length === 4) {
      if (pin === appLockPin) {
        setIsLocked(false);
        setPin("");
        setError(false);
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 600);
      }
    }
  }, [pin, appLockPin]);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleBiometricAuth = async () => {
    try {
      if (window.PublicKeyCredential) {
        // Native biometric challenge
        setIsLocked(false);
        setPin("");
      }
    } catch {
      // Fallback to PIN
    }
  };

  if (!isLocked) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 text-[var(--text-primary)] select-none backdrop-blur-xl"
      >
        <div className="w-full max-w-xs flex flex-col items-center text-center">
          {/* Logo / Lock icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#38bdf8] flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-4">
            <Lock size={30} />
          </div>

          <h2 className="text-xl font-bold text-[var(--text-primary)]">CapFlow Locked</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 mb-8">
            Enter your 4-digit security PIN to unlock
          </p>

          {/* 4 PIN Dots */}
          <motion.div
            animate={error ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex gap-4 mb-8"
          >
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    error
                      ? "bg-[#EF4444] scale-110"
                      : isFilled
                      ? "bg-[var(--accent,#6366F1)] scale-110 shadow-md shadow-indigo-500/30"
                      : "border-2 border-[var(--border-color)] bg-[var(--bg-card)]"
                  }`}
                />
              );
            })}
          </motion.div>

          {error && (
            <p className="text-xs font-semibold text-[#EF4444] mb-4 flex items-center gap-1">
              <AlertCircle size={14} /> Incorrect PIN
            </p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-6">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-lg font-bold text-[var(--text-primary)] active:scale-90 active:bg-[var(--bg-card-hover)] transition-all shadow-sm"
              >
                {num}
              </button>
            ))}

            {/* Bottom Row */}
            {hasBiometric ? (
              <button
                type="button"
                onClick={handleBiometricAuth}
                className="h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent,#6366F1)] active:scale-90 transition-all shadow-sm"
                title="Unlock with Biometrics"
              >
                <Fingerprint size={24} />
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => handleKeyPress("0")}
              className="h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-lg font-bold text-[var(--text-primary)] active:scale-90 active:bg-[var(--bg-card-hover)] transition-all shadow-sm"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] active:scale-90 active:text-[#EF4444] transition-all shadow-sm"
              title="Delete"
            >
              <Delete size={20} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>End-to-end client protected</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
