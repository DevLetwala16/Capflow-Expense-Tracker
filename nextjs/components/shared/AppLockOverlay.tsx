"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Lock, Fingerprint, Delete, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsStore, AutoLockTimeout } from "@/lib/store/settingsStore";

// Base64 helpers for WebAuthn ArrayBuffers
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function AppLockOverlay() {
  const { appLockEnabled, appLockPin, autoLockTimeout } = useSettingsStore();

  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check biometric support on the device
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.PublicKeyCredential &&
      window.isSecureContext
    ) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
        .then((available) => setHasBiometric(Boolean(available)))
        .catch(() => setHasBiometric(false));
    } else {
      setHasBiometric(false);
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
        setErrorMessage(null);
      } else {
        setError(true);
        setErrorMessage("Incorrect PIN. Please try again.");
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 700);
      }
    }
  }, [pin, appLockPin]);

  // Handle physical keyboard inputs
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        if (pin.length < 4) {
          setPin((prev) => prev + e.key);
        }
      } else if (e.key === "Backspace") {
        setPin((prev) => prev.slice(0, -1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked, pin.length]);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  // Secure Native Biometric Challenge (WebAuthn Platform Authenticator)
  const handleBiometricAuth = async () => {
    if (isBiometricScanning) return;

    setIsBiometricScanning(true);
    setError(false);
    setErrorMessage(null);

    try {
      if (!window.PublicKeyCredential || !navigator.credentials) {
        throw new Error("Biometric authentication is not supported on this browser.");
      }

      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname);
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const storedCredId = localStorage.getItem("capflow_biometric_cred_id");
      let authenticated = false;

      // 1. Try assertion with previously registered platform credential
      if (storedCredId) {
        try {
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge,
              ...(isIp ? {} : { rpId: window.location.hostname }),
              allowCredentials: [
                {
                  id: base64ToBuffer(storedCredId),
                  type: "public-key",
                  transports: ["internal"],
                },
              ],
              userVerification: "required",
              timeout: 60000,
            },
          });
          if (assertion) {
            authenticated = true;
          }
        } catch (getErr: any) {
          // If the credential was expired or not found on device, clear it and allow re-registration
          if (getErr?.name === "NotFoundError" || getErr?.name === "InvalidStateError") {
            localStorage.removeItem("capflow_biometric_cred_id");
          } else {
            throw getErr;
          }
        }
      }

      // 2. If no valid stored credential, create one with platform authenticator (fingerprint / Face ID)
      if (!authenticated) {
        const rp: PublicKeyCredentialRpEntity = {
          name: "CapFlow",
        };
        if (!isIp && window.location.hostname) {
          rp.id = window.location.hostname;
        }

        const newCred = (await navigator.credentials.create({
          publicKey: {
            challenge,
            rp,
            user: {
              id: new Uint8Array([67, 97, 112, 70, 108, 111, 119]), // "CapFlow"
              name: "capflow_user",
              displayName: "CapFlow User",
            },
            pubKeyCredParams: [
              { alg: -7, type: "public-key" }, // ES256
              { alg: -257, type: "public-key" }, // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
            },
            timeout: 60000,
          },
        })) as PublicKeyCredential | null;

        if (newCred && newCred.rawId) {
          localStorage.setItem("capflow_biometric_cred_id", bufferToBase64(newCred.rawId));
          authenticated = true;
        }
      }

      if (authenticated) {
        // Successfully verified by the physical biometric sensor!
        setIsLocked(false);
        setPin("");
        setError(false);
        setErrorMessage(null);
      } else {
        throw new Error("Biometric verification could not be completed.");
      }
    } catch (err: any) {
      console.warn("Biometric authentication failed:", err);
      // STRICT SAFETY: Do NOT unlock the app!
      setError(true);
      if (err?.name === "NotAllowedError") {
        setErrorMessage("Biometric scan cancelled or not recognized. Please enter your PIN.");
      } else if (err?.name === "SecurityError") {
        setErrorMessage("Biometric unlock requires HTTPS or localhost. Please enter your PIN.");
      } else {
        setErrorMessage(err?.message || "Biometric authentication failed. Please enter your PIN.");
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      setTimeout(() => {
        setError(false);
      }, 2500);
    } finally {
      setIsBiometricScanning(false);
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
            className="flex gap-4 mb-6"
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

          {/* Status / Error feedback */}
          <div className="min-h-[24px] mb-4 flex items-center justify-center">
            {isBiometricScanning ? (
              <p className="text-xs font-medium text-[var(--accent,#6366F1)] flex items-center gap-1.5 animate-pulse">
                <Loader2 size={13} className="animate-spin" /> Verifying fingerprint / Face ID…
              </p>
            ) : error && errorMessage ? (
              <p className="text-xs font-semibold text-[#EF4444] flex items-center gap-1 text-center px-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </p>
            ) : null}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-6">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-lg font-bold text-[var(--text-primary)] active:scale-90 active:bg-[var(--bg-card-hover)] transition-all shadow-sm cursor-pointer"
              >
                {num}
              </button>
            ))}

            {/* Bottom Row */}
            {hasBiometric ? (
              <button
                type="button"
                onClick={handleBiometricAuth}
                disabled={isBiometricScanning}
                className={`h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent,#6366F1)] active:scale-90 transition-all shadow-sm cursor-pointer ${
                  isBiometricScanning ? "opacity-50 pointer-events-none" : ""
                }`}
                title="Unlock with Biometrics"
              >
                {isBiometricScanning ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <Fingerprint size={24} />
                )}
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => handleKeyPress("0")}
              className="h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-lg font-bold text-[var(--text-primary)] active:scale-90 active:bg-[var(--bg-card-hover)] transition-all shadow-sm cursor-pointer"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] active:scale-90 active:text-[#EF4444] transition-all shadow-sm cursor-pointer"
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
