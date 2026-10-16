"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Smartphone,
  QrCode,
  Download,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  LogIn,
  Copy,
  Clock,
  RefreshCw,
  Camera,
  CameraOff,
  ScanLine,
  KeyRound,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/db";
import { useAuthStore } from "@/lib/store/authStore";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { useBudgetStore } from "@/lib/store/budgetStore";
import { useEMIStore } from "@/lib/store/emiStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "push" | "pull";
type ToastType = "success" | "error" | "info";
type ToastState = { message: string; type: ToastType } | null;

interface TransferToken {
  tokenId: string;
  expiresAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(expiresAt: string): string {
  const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function cleanToken(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("tokenId=")) {
    try {
      const url = new URL(trimmed);
      return url.searchParams.get("tokenId") || trimmed;
    } catch {
      const match = trimmed.match(/tokenId=([^&]+)/);
      if (match) return match[1];
    }
  }
  return trimmed;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const colorMap = {
    success: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20",
    error: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
    info: "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-sm font-medium border ${colorMap[toast.type]}`}
    >
      {toast.message}
    </motion.div>
  );
}

// ─── Animated Progress Bar ────────────────────────────────────────────────────

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-[#6366F1] to-[#38bdf8] rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      />
    </div>
  );
}

// ─── Mode Tab ────────────────────────────────────────────────────────────────

function ModeTab({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all ${
        active
          ? "bg-[#6366F1] text-white shadow-md"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Sign-in Prompt ───────────────────────────────────────────────────────────

function SignInPrompt() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6 flex flex-col items-center gap-3 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-[#6366F1]/10 flex items-center justify-center">
        <LogIn size={22} className="text-[#6366F1]" />
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">Sign in required</p>
      <p className="text-xs text-[var(--text-secondary)] max-w-xs">
        Device Transfer requires a signed-in account so your data can be securely linked to you.
      </p>
      <button
        onClick={() => { window.location.href = "/auth"; }}
        className="mt-1 px-5 py-2 rounded-xl bg-[#6366F1] text-white text-sm font-semibold hover:bg-[#5558E6] transition-colors"
      >
        Sign In
      </button>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransferPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [mode, setMode] = useState<Mode>("push");
  const [toast, setToast] = useState<ToastState>(null);

  // Push state
  const [pushLoading, setPushLoading] = useState(false);
  const [token, setToken] = useState<TransferToken | null>(null);
  const [countdown, setCountdown] = useState("");
  const [tokenExpired, setTokenExpired] = useState(false);
  const [tokenConsumed, setTokenConsumed] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Pull state
  const [tokenInput, setTokenInput] = useState("");
  const [pullLoading, setPullLoading] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [pullDone, setPullDone] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);

  // Camera scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Camera Scanner Controls ───────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ── Countdown timer & Invalidation Poller ──────────────────────────────────

  useEffect(() => {
    if (!token) return;
    setTokenExpired(false);
    setTokenConsumed(false);

    const tick = () => {
      const diff = new Date(token.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("Expired");
        setTokenExpired(true);
        if (countdownRef.current) clearInterval(countdownRef.current);
        return;
      }
      setCountdown(formatCountdown(token.expiresAt));
    };

    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [token]);

  // Poll server from source device to detect when target device consumes token
  useEffect(() => {
    if (!token || tokenExpired || tokenConsumed) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const checkConsumed = async () => {
      try {
        const res = await fetch(
          `/api/settings/transfer?tokenId=${encodeURIComponent(token.tokenId)}&check=true`
        );
        if (res.status === 404) {
          // Token deleted from MongoDB upon successful restore on second device
          setTokenConsumed(true);
          showToast("Data restored by target device! QR code has been consumed & invalidated.", "success");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.exists === false) {
            setTokenConsumed(true);
            showToast("Data restored by target device! QR code has been consumed & invalidated.", "success");
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch {
        // network blip, continue polling
      }
    };

    pollRef.current = setInterval(checkConsumed, 3500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, tokenExpired, tokenConsumed, showToast]);

  // Reset pull state when switching modes
  useEffect(() => {
    stopCamera();
    setPullDone(false);
    setPullError(null);
    setPullProgress(0);
    setTokenInput("");
    setCameraError(null);
  }, [mode, stopCamera]);

  // ── Push: Generate QR ────────────────────────────────────────────────────

  const handleGenerateQR = async () => {
    if (!user?.id) return;
    setPushLoading(true);
    setToken(null);
    setTokenExpired(false);
    setTokenConsumed(false);

    try {
      const userId = user.id;

      // Collect all data from Dexie
      const [transactions, categories, budgets, goals, emis] = await Promise.all([
        db.transactions.where("userId").equals(userId).toArray(),
        db.categories.where("userId").equals(userId).toArray(),
        db.budgets.where("userId").equals(userId).toArray(),
        db.goals.where("userId").equals(userId).toArray(),
        db.emis.where("userId").equals(userId).toArray(),
      ]);

      const payload = JSON.stringify({
        version: 1,
        userId,
        userEmail: user.email,
        exportedAt: new Date().toISOString(),
        transactions,
        categories,
        budgets,
        goals,
        emis,
      });

      const res = await fetch("/api/settings/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, userId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Server error");
      }

      const data: TransferToken = await res.json();
      setToken(data);
      showToast("QR code generated — scan from your new device", "success");
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : "Failed to generate QR", "error");
    } finally {
      setPushLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token.tokenId).then(() => {
      showToast("Token copied to clipboard", "info");
    });
  };

  // ── Pull: Restore from token ──────────────────────────────────────────────

  const animateProgress = useCallback(async (): Promise<void> => {
    // Progress progression: 0 → 45 → 90 → 100 on success
    setPullProgress(0);
    await new Promise((r) => setTimeout(r, 90));
    setPullProgress(45);
    await new Promise((r) => setTimeout(r, 650));
    setPullProgress(90);
  }, []);

  const handleRestore = async (overrideToken?: string) => {
    const activeToken = overrideToken || tokenInput;
    const trimmed = cleanToken(activeToken);

    if (!user?.id || !trimmed) {
      showToast("Please enter or scan a valid transfer token", "error");
      return;
    }

    setPullLoading(true);
    setPullDone(false);
    setPullError(null);

    try {
      await animateProgress();

      const res = await fetch(`/api/settings/transfer?tokenId=${encodeURIComponent(trimmed)}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Token not found or expired");
      }

      const { payload } = await res.json();
      const data = JSON.parse(payload);
      const userId = user.id;

      // Map all records to current user and strip old IDs (Dexie auto-assigns)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapForUser = (items: any[]) =>
        (items ?? []).map(({ id: _id, ...rest }: { id?: number; [k: string]: unknown }) => ({
          ...rest,
          userId,
        }));

      // Bulk-add (merge — do NOT delete existing data per the warning)
      await Promise.all([
        data.transactions?.length &&
          db.transactions.bulkAdd(mapForUser(data.transactions) as import("@/lib/db").Transaction[]),
        data.categories?.length &&
          db.categories.bulkAdd(mapForUser(data.categories) as import("@/lib/db").Category[]),
        data.budgets?.length &&
          db.budgets.bulkAdd(mapForUser(data.budgets) as import("@/lib/db").Budget[]),
        data.goals?.length &&
          db.goals.bulkAdd(mapForUser(data.goals) as import("@/lib/db").Goal[]),
        data.emis?.length &&
          db.emis.bulkAdd(mapForUser(data.emis) as import("@/lib/db").EMI[]),
      ]);

      // Invalidate in-memory stores so they reload from Dexie
      useTransactionStore.setState({ transactions: [], loading: false, loadedMonth: null });
      useCategoryStore.setState({ categories: [], loading: false, initialized: false });
      useBudgetStore.setState({ budgets: [], goals: [], loading: false, loadedMonth: null, goalsLoaded: false });
      useEMIStore.setState({ emis: [], loading: false, loaded: false });

      setPullProgress(100);
      await new Promise((r) => setTimeout(r, 300));
      setPullDone(true);
      showToast("Data restored successfully!", "success");
    } catch (err) {
      console.error(err);
      setPullProgress(0);
      const msg = err instanceof Error ? err.message : "Restore failed";
      setPullError(msg);
      showToast(msg, "error");
    } finally {
      setPullLoading(false);
    }
  };

  // ── Camera QR Scanner Activation ─────────────────────────────────────────

  const startCamera = async (targetMode: "environment" | "user" = facingMode) => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser or platform.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: targetMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScanning(true);

      // BarcodeDetector loop
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                const detected = cleanToken(barcodes[0].rawValue);
                if (detected) {
                  stopCamera();
                  setTokenInput(detected);
                  showToast("QR code detected!", "success");
                  if (typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate(100);
                  }
                  handleRestore(detected);
                }
              }
            } catch {
              // Frame dropped or not ready
            }
          }
        }, 300);
      } else {
        setCameraError(
          "Real-time video barcode detection is not supported in this browser. Please use 'Upload QR Photo' or enter the token manually."
        );
      }
    } catch (err) {
      console.error(err);
      setCameraError(
        err instanceof Error
          ? err.message
          : "Unable to access camera. Please allow camera permissions or enter the token manually."
      );
      setIsScanning(false);
    }
  };

  const handleToggleFacingMode = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    if (isScanning) {
      startCamera(next);
    }
  };

  // QR Image File Upload fallback
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        const bitmap = await createImageBitmap(file);
        const barcodes = await detector.detect(bitmap);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          const detected = cleanToken(barcodes[0].rawValue);
          setTokenInput(detected);
          showToast("QR code detected from photo!", "success");
          handleRestore(detected);
          return;
        }
      }
      showToast(
        "No QR code found in selected photo. Please try another image or enter the token manually.",
        "error"
      );
    } catch (err) {
      console.error(err);
      showToast("Could not parse image file.", "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const qrUrl = token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(token.tokenId)}`
    : null;

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-color)]">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
        </button>
        <div className="flex items-center gap-2">
          <Smartphone size={18} className="text-[#6366F1]" />
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Device Transfer</h1>
        </div>
      </header>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast toast={toast} />}
      </AnimatePresence>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-10">

        {/* ── Intro blurb ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#6366F1]/5 rounded-2xl border border-[#6366F1]/20 px-4 py-3 flex items-start gap-3"
        >
          <QrCode size={18} className="text-[#6366F1] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Transfer your CapFlow data to a new device via a secure QR code. Data is encrypted in transit and the token expires in <strong className="text-[var(--text-primary)]">30 minutes</strong>.
          </p>
        </motion.div>

        {/* ── Mode Tabs ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-1.5 flex gap-1"
        >
          <ModeTab
            active={mode === "push"}
            label="Push Backup"
            icon={<Download size={15} />}
            onClick={() => setMode("push")}
          />
          <ModeTab
            active={mode === "pull"}
            label="Scan to Restore"
            icon={<Upload size={15} />}
            onClick={() => setMode("pull")}
          />
        </motion.div>

        {/* ── Auth Guard ── */}
        {!user ? (
          <SignInPrompt />
        ) : (
          <AnimatePresence mode="wait">

            {/* ════════════════════════════════════════ PUSH MODE ══ */}
            {mode === "push" && (
              <motion.div
                key="push"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* Generate button card */}
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                      <QrCode size={15} className="text-[#6366F1]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Generate Transfer QR</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Packages all your data and creates a one-time QR code
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateQR}
                    disabled={pushLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#6366F1] text-white text-sm font-semibold hover:bg-[#5558E6] transition-colors disabled:opacity-60"
                  >
                    {pushLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Collecting & uploading…
                      </>
                    ) : token ? (
                      <>
                        <RefreshCw size={15} />
                        Regenerate QR
                      </>
                    ) : (
                      <>
                        <QrCode size={15} />
                        Generate Transfer QR
                      </>
                    )}
                  </button>
                </div>

                {/* QR Display */}
                <AnimatePresence>
                  {token && !pushLoading && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-5 space-y-4"
                    >
                      {/* Consumed / Invalidated banner */}
                      {tokenConsumed ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                          <CheckCircle2 size={15} className="flex-shrink-0" />
                          <span>Transfer Complete! Data restored on second device. This QR code has been consumed and invalidated.</span>
                        </div>
                      ) : (
                        /* Status badge */
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                          tokenExpired
                            ? "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20"
                            : "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
                        }`}>
                          {tokenExpired ? (
                            <AlertTriangle size={13} />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                          )}
                          {tokenExpired
                            ? "QR code has expired. Regenerate to create a new one."
                            : "QR code is valid. Scan from the new device to restore."}
                        </div>
                      )}

                      {/* QR Image */}
                      <div className="flex flex-col items-center gap-3">
                        <div className={`p-3 rounded-2xl bg-white shadow-md inline-block ${
                          tokenExpired || tokenConsumed ? "opacity-25 grayscale pointer-events-none" : ""
                        }`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrUrl!}
                            alt="Transfer QR Code"
                            width={180}
                            height={180}
                            className="rounded-lg"
                          />
                        </div>

                        {/* Countdown */}
                        {!tokenExpired && !tokenConsumed && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                            <Clock size={12} />
                            <span>Expires in <strong className="text-[var(--text-primary)]">{countdown}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Token ID for manual entry */}
                      <div className="space-y-1.5">
                        <p className="text-xs text-[var(--text-secondary)] font-medium">Manual entry token</p>
                        <div className="flex items-center gap-2">
                          <div className={`flex-1 px-3 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-xs text-[var(--text-primary)] break-all select-all ${
                            tokenExpired || tokenConsumed ? "opacity-40" : ""
                          }`}>
                            {token.tokenId}
                          </div>
                          <button
                            onClick={handleCopyToken}
                            disabled={tokenExpired || tokenConsumed}
                            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-[#6366F1]/10 text-[#6366F1] hover:bg-[#6366F1]/20 transition-colors disabled:opacity-40"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* How it works */}
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] px-4 py-3.5 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">How it works</p>
                  {[
                    "Generate the QR code on this device",
                    "Open CapFlow on your new device and go to Device Transfer",
                    "Switch to 'Scan to Restore' and scan or enter the token",
                    "Your data will be merged to the new device automatically",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#6366F1]/10 text-[#6366F1] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════ PULL MODE ══ */}
            {mode === "pull" && (
              <motion.div
                key="pull"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* Merge warning */}
                <div className="bg-[#F59E0B]/8 rounded-2xl border border-[#F59E0B]/25 px-4 py-3 flex items-start gap-3">
                  <ShieldAlert size={16} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    <strong className="text-[#F59E0B]">Merge notice:</strong> This will merge data from the source device.{" "}
                    <strong className="text-[var(--text-primary)]">Existing data will NOT be deleted.</strong>
                  </p>
                </div>

                {/* Built-in Camera Scanner (Section 1 requirement) */}
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                        <ScanLine size={15} className="text-[#6366F1]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Scan QR Code to Restore Data</p>
                        <p className="text-xs text-[var(--text-secondary)]">Point your camera at the QR code on your first device</p>
                      </div>
                    </div>
                    {isScanning && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] text-[10px] font-bold border border-[#10B981]/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                        Live
                      </span>
                    )}
                  </div>

                  {/* Active Camera Viewport */}
                  <AnimatePresence>
                    {isScanning ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-[var(--border-color)] shadow-inner"
                      >
                        <video
                          ref={videoRef}
                          playsInline
                          autoPlay
                          muted
                          className="w-full h-full object-cover"
                        />

                        {/* Viewfinder Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-48 h-48 border-2 border-[#6366F1] rounded-2xl relative shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                            {/* Scanning Laser */}
                            <motion.div
                              animate={{ top: ["5%", "90%", "5%"] }}
                              transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                              className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent shadow-[0_0_8px_rgba(56,189,248,0.9)]"
                            />
                            {/* Reticle Corners */}
                            <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
                            <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
                            <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
                          </div>
                        </div>

                        {/* Camera Floating Controls */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                          <button
                            type="button"
                            onClick={handleToggleFacingMode}
                            className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-semibold hover:bg-black/80 transition-colors border border-white/20 flex items-center gap-1.5"
                          >
                            <RefreshCw size={13} />
                            Flip Camera
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-3 py-1.5 rounded-xl bg-[#EF4444] text-white text-xs font-semibold hover:bg-[#DC2626] transition-colors flex items-center gap-1.5 shadow-md"
                          >
                            <CameraOff size={13} />
                            Close Scanner
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {/* Camera Error Message */}
                  {cameraError && (
                    <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-xs text-[#EF4444] flex items-center gap-2">
                      <AlertTriangle size={14} className="flex-shrink-0" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  {/* Scanner Action Buttons */}
                  {!isScanning && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#5558E6] transition-colors shadow-sm"
                      >
                        <Camera size={14} />
                        Open Live Camera
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--bg-card-hover)] transition-colors"
                      >
                        <UploadCloud size={14} />
                        Scan QR Photo
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Token input card */}
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                      <KeyRound size={15} className="text-[#10B981]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Manual Token Entry</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Or enter the token manually if camera is unavailable
                      </p>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      setPullError(null);
                      setPullDone(false);
                      setPullProgress(0);
                    }}
                    placeholder="Enter Token ID (e.g. ABC12345)"
                    disabled={pullLoading}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[#6366F1] transition-colors disabled:opacity-60"
                  />

                  {/* Progress bar — strictly formatted as "Loading... 45%" per spec */}
                  <AnimatePresence>
                    {(pullLoading || pullProgress > 0) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-1.5 pt-1"
                      >
                        <ProgressBar progress={pullProgress} />
                        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                          <span>Import status</span>
                          <span className="font-semibold text-[#6366F1]">Loading... {pullProgress}%</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error */}
                  <AnimatePresence>
                    {pullError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20"
                      >
                        <AlertTriangle size={13} className="text-[#EF4444] flex-shrink-0" />
                        <p className="text-xs text-[#EF4444]">{pullError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Success */}
                  <AnimatePresence>
                    {pullDone && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20"
                      >
                        <CheckCircle2 size={14} className="text-[#10B981] flex-shrink-0" />
                        <p className="text-xs text-[#10B981] font-semibold">
                          Data restored successfully! Your stores have been updated.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => handleRestore()}
                    disabled={!tokenInput.trim() || pullLoading || pullDone}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#10B981] text-white text-sm font-semibold hover:bg-[#0ea572] transition-colors disabled:opacity-50"
                  >
                    {pullLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Restoring data…
                      </>
                    ) : pullDone ? (
                      <>
                        <CheckCircle2 size={15} />
                        Restore complete!
                      </>
                    ) : (
                      <>
                        <Upload size={15} />
                        Restore Data
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
