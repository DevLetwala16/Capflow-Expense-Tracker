"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  QrCode,
  ArrowRight,
  User,
  Camera,
  CameraOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Phone,
} from "lucide-react";
import { SplitMember } from "@/types/splitter";
import {
  extractSessionIdFromQR,
  decodeQRCodeFromVideo,
} from "@/lib/splitter/qrScanner";

interface JoinSessionModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: { id: string; name: string; email?: string } | null;
  initialSessionId?: string;
  onJoin: (sessionId: string, member: Partial<SplitMember>) => Promise<any>;
}

export function JoinSessionModal({
  open,
  onClose,
  currentUser,
  initialSessionId = "",
  onJoin,
}: JoinSessionModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"scan" | "manual">(
    initialSessionId ? "manual" : "scan"
  );
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [displayName, setDisplayName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [joiningState, setJoiningState] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [alreadyJoinedId, setAlreadyJoinedId] = useState<string | null>(null);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [autoJoinDirectly, setAutoJoinDirectly] = useState(true);

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const facingModeRef = useRef<"environment" | "user">("environment");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stop camera stream safely
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
    setCameraActive(false);
    setCameraStarting(false);
  }, []);

  // Cleanup camera on close or unmount
  useEffect(() => {
    if (!open) {
      stopCamera();
      setError("");
      setJoiningState(null);
      setDetectedCode(null);
    }
    return () => {
      stopCamera();
    };
  }, [open, stopCamera]);

  useEffect(() => {
    if (initialSessionId) {
      setSessionId(initialSessionId);
      setActiveTab("manual");
    }
  }, [initialSessionId]);

  // Execute group join
  const executeJoin = useCallback(
    async (targetSessionId: string, customName?: string) => {
      const rawTrimmed = targetSessionId.trim();
      const cleanSessionId = /^CAP@/i.test(rawTrimmed)
        ? `CAP@${rawTrimmed.slice(4)}`
        : rawTrimmed.toUpperCase();
      const resolvedName = customName || displayName.trim() || currentUser?.name || "Guest";

      if (!cleanSessionId) {
        setError("Please provide a valid Session ID");
        return;
      }
      if (!resolvedName.trim()) {
        setError("Please enter your display name to join");
        return;
      }

      setSubmitting(true);
      setError("");
      setJoiningState(`Joining ${cleanSessionId}...`);

      try {
        await onJoin(cleanSessionId, {
          name: resolvedName.trim(),
          phone: phone.trim() || undefined,
          email: currentUser?.email,
          handle: `@${resolvedName.toLowerCase().replace(/[^a-z0-9]/g, "") || "member"}`,
          userId: currentUser?.id,
        });
        stopCamera();
        onClose();
      } catch (err: any) {
        const isDuplicate =
          err?.alreadyJoined ||
          err?.status === 409 ||
          (err?.message && err.message.toLowerCase().includes("already joined"));
        if (isDuplicate) {
          const sId = err.sessionId || cleanSessionId;
          setAlreadyJoinedId(sId);
          setError(
            err.message ||
              `You have already joined session ${sId}. You cannot join the same session multiple times.`
          );
        } else {
          setError(err.message || "Failed to join session. Please verify the ID or QR code.");
        }
        setJoiningState(null);
      } finally {
        setSubmitting(false);
      }
    },
    [displayName, currentUser, phone, onJoin, stopCamera, onClose]
  );

  // Triggered when a QR code is detected from camera or photo
  const handleCodeDetected = useCallback(
    async (rawText: string) => {
      const extractedId = extractSessionIdFromQR(rawText);
      if (!extractedId) {
        setError("Could not extract a valid Session ID from scanned QR code.");
        return;
      }

      stopCamera();
      setSessionId(extractedId);
      setDetectedCode(extractedId);
      setError("");

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(100);
        } catch {
          // ignore
        }
      }

      // If user display name is known and autoJoin is active, directly join!
      const resolvedName = displayName.trim() || currentUser?.name;
      if (autoJoinDirectly && resolvedName) {
        await executeJoin(extractedId, resolvedName);
      }
    },
    [stopCamera, autoJoinDirectly, displayName, currentUser, executeJoin]
  );

  // Start live video camera with robust facingMode & hardware device switching
  const startCamera = useCallback(
    async (targetFacing?: "environment" | "user") => {
      const mode = targetFacing || facingModeRef.current;
      setCameraError(null);
      setCameraStarting(true);

      // 1. Cleanly stop old stream & clear scanning loop
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          t.stop();
          t.enabled = false;
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // Small hardware release interval for mobile camera sensors
      await new Promise((r) => setTimeout(r, 60));

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Live camera is not supported in this browser.");
        }

        let stream: MediaStream | null = null;

        // Step A: Attempt exact facingMode (mandatory switch on mobile browsers)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { exact: mode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch {
          // Step B: Query enumerated video input devices to switch deviceId
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevs = devices.filter((d) => d.kind === "videoinput");
            if (videoDevs.length > 1) {
              const matchedDev = videoDevs.find((d) =>
                mode === "environment"
                  ? /back|rear|environment|world/i.test(d.label)
                  : /front|user|selfie|face/i.test(d.label)
              ) || (mode === "environment" ? videoDevs[videoDevs.length - 1] : videoDevs[0]);

              if (matchedDev && matchedDev.deviceId) {
                stream = await navigator.mediaDevices.getUserMedia({
                  video: {
                    deviceId: { exact: matchedDev.deviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                  },
                });
              }
            }
          } catch {}

          // Step C: Fallback to ideal facingMode
          if (!stream) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  facingMode: { ideal: mode },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
              });
            } catch {
              // Step D: Final fallback to unconstrained video
              stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
          }
        }

        streamRef.current = stream;

        // Attach stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn("Video play interrupted:", playErr);
          }
        }

        setCameraActive(true);
        setCameraStarting(false);

        // Start continuous scanning loop at ~4 fps (every 250ms)
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const rawQR = await decodeQRCodeFromVideo(
                videoRef.current,
                canvasRef.current || undefined
              );
              if (rawQR) {
                handleCodeDetected(rawQR);
              }
            } catch {
              // Frame dropped or not ready
            }
          }
        }, 250);
      } catch (err: any) {
        console.error("[QR Scanner] Camera error:", err);
        const isPermission =
          err?.name === "NotAllowedError" ||
          err?.name === "PermissionDeniedError" ||
          (err?.message && err.message.toLowerCase().includes("permission denied"));
        setCameraError(
          isPermission
            ? "Camera permission was denied. Please allow camera permissions in site settings or enter Session ID manually."
            : (err?.message || "Unable to access device camera. Please enter Session ID manually.")
        );
        setCameraActive(false);
        setCameraStarting(false);
      }
    },
    [handleCodeDetected]
  );

  // Auto-start camera when modal opens in "scan" mode
  useEffect(() => {
    if (open && activeTab === "scan" && !detectedCode) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [open, activeTab, detectedCode, startCamera, stopCamera]);

  // Ensure stream stays bound to video element if re-rendered
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraActive]);

  const handleToggleFacingMode = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    facingModeRef.current = next;
    await startCamera(next);
  };

  // Manual Form Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeJoin(sessionId);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-[430px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 sm:p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
          >
            {/* Hidden canvas for jsQR frame processing */}
            <canvas ref={canvasRef} className="hidden" />

            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors z-20"
              title="Close modal"
            >
              <X size={18} />
            </button>

            {/* Header Icon & Title */}
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center mx-auto mb-2.5">
                <QrCode size={24} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Join Splitter Session
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Scan organizer&apos;s QR code to directly join, or enter ID
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] mb-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("scan");
                  setError("");
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "scan"
                    ? "bg-[#6366F1] text-white shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Camera size={14} />
                <span>Scan QR Code</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab("manual");
                  setError("");
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "manual"
                    ? "bg-[#6366F1] text-white shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <QrCode size={14} />
                <span>Enter ID Manually</span>
              </button>
            </div>

            {/* Already Joined Session Notice */}
            {alreadyJoinedId ? (
              <div className="p-3.5 mb-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl flex flex-col gap-2.5">
                <div className="flex items-start gap-2 text-xs font-semibold text-[#F59E0B]">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error || `You are already a member of session ${alreadyJoinedId}.`}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onClose();
                    router.push(`/budgets/splitter/${encodeURIComponent(alreadyJoinedId)}`);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#F59E0B] text-slate-900 text-xs font-bold hover:bg-[#D97706] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Open Session Directly</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : error ? (
              <div className="p-3 mb-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-2xl text-xs font-semibold text-[#EF4444] flex items-start gap-2">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Connecting State Banner */}
            {joiningState && (
              <div className="p-3.5 mb-3 bg-[#10B981]/15 border border-[#10B981]/30 rounded-2xl text-xs font-bold text-[#10B981] flex items-center justify-center gap-2 animate-pulse">
                <Sparkles size={16} />
                <span>{joiningState}</span>
              </div>
            )}

            {/* ── TAB 1: QR CODE SCANNER ── */}
            {activeTab === "scan" && (
              <div className="space-y-4">
                {/* Viewport: Video is ALWAYS in DOM so videoRef is never null */}
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-[var(--border-color)] shadow-inner">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      cameraActive ? "opacity-100" : "opacity-0 absolute pointer-events-none"
                    }`}
                  />

                  {/* Active Camera Target Reticle & Laser Sweep */}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-[#6366F1] rounded-2xl relative shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                        {/* Scanning Laser Sweep */}
                        <motion.div
                          animate={{ top: ["5%", "90%", "5%"] }}
                          transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                          className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent shadow-[0_0_8px_rgba(56,189,248,0.9)]"
                        />
                        {/* Corner Reticle Accents */}
                        <span className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-white" />
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-white" />
                        <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-white" />
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-white" />
                      </div>
                    </div>
                  )}

                  {/* Camera Active Floating Controls */}
                  {cameraActive && (
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10">
                      <button
                        type="button"
                        onClick={handleToggleFacingMode}
                        className="px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold hover:bg-black/80 transition-colors border border-white/20 flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} />
                        Flip Camera
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-2.5 py-1.5 rounded-xl bg-[#EF4444] text-white text-[11px] font-bold hover:bg-[#DC2626] transition-colors flex items-center gap-1.5 shadow-md"
                      >
                        <CameraOff size={12} />
                        Pause Camera
                      </button>
                    </div>
                  )}

                  {/* Inactive or Loading Camera View */}
                  {!cameraActive && (
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[var(--bg-primary)] w-full h-full">
                      <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center mx-auto">
                        <Camera size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">
                          {cameraStarting ? "Opening Camera..." : "Camera Scanner"}
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {cameraStarting
                            ? "Requesting camera permissions..."
                            : "Point your camera at the group organizer's QR code"}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={cameraStarting}
                        onClick={() => startCamera()}
                        className="px-4 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] transition-all flex items-center gap-1.5 shadow-md shadow-[#6366F1]/20 disabled:opacity-50"
                      >
                        <Camera size={14} />
                        <span>{cameraStarting ? "Starting..." : "Start Camera Scanner"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Camera Permission / Error Recovery Card */}
                {cameraError && (
                  <div className="p-3.5 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/25 space-y-2.5">
                    <div className="flex items-start gap-2 text-xs text-[#EF4444]">
                      <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold">Camera Access Blocked or Restricted</p>
                        <p className="text-[11px] mt-0.5 opacity-90">{cameraError}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="py-2 px-2.5 rounded-xl bg-[#6366F1] text-white text-[11px] font-bold hover:bg-[#4F46E5] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <RefreshCw size={12} />
                        <span>Retry Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          setActiveTab("manual");
                          setError("");
                        }}
                        className="py-2 px-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] text-[11px] font-semibold hover:border-[#6366F1] transition-all flex items-center justify-center gap-1.5"
                      >
                        <QrCode size={12} />
                        <span>Enter ID Manually</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Scanned Result Banner */}
                {detectedCode && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-[#10B981]/10 border border-[#10B981]/30 rounded-2xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 size={18} className="text-[#10B981] flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                          Scanned Session ID
                        </span>
                        <p className="text-xs font-mono font-extrabold text-[#10B981] truncate">
                          {detectedCode}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => executeJoin(detectedCode)}
                      className="px-3 py-1.5 rounded-xl bg-[#10B981] text-white text-xs font-bold hover:bg-[#059669] transition-all flex items-center gap-1 shadow-sm flex-shrink-0"
                    >
                      <span>Join Now</span>
                      <ArrowRight size={13} />
                    </button>
                  </motion.div>
                )}

                {/* Participant Details Form */}
                <div className="pt-2 border-t border-[var(--border-color)] space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                      Your Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex, Maya, Mom"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                    />
                  </div>

                  {/* Auto-join toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[var(--text-secondary)] pt-1">
                    <input
                      type="checkbox"
                      checked={autoJoinDirectly}
                      onChange={(e) => setAutoJoinDirectly(e.target.checked)}
                      className="rounded accent-[#6366F1] w-3.5 h-3.5"
                    />
                    <span>Automatically join group as soon as QR is scanned</span>
                  </label>
                </div>
              </div>
            )}

            {/* ── TAB 2: MANUAL ID ENTRY ── */}
            {activeTab === "manual" && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Session ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CAP@a8K2Xp9q or CAP-SPLIT-9821-X"
                    value={sessionId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^CAP@/i.test(val)) {
                        setSessionId(`CAP@${val.slice(4)}`);
                      } else {
                        setSessionId(val);
                      }
                    }}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm font-bold tracking-wider text-[#6366F1] outline-none focus:border-[#6366F1] font-mono text-center"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Your Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul, Alex, Mom"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--border-color)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !sessionId.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#10B981] text-white text-xs font-bold hover:bg-[#059669] transition-colors disabled:opacity-50 shadow-md shadow-[#10B981]/25"
                  >
                    {submitting ? "Joining..." : "Join Group"}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
