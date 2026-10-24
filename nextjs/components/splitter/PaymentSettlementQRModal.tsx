"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  QrCode,
  Download,
  Camera,
  Smartphone,
  CheckCircle,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Upload,
  Loader2,
} from "lucide-react";
import { SplitMember, SettlementTransaction } from "@/types/splitter";
import { formatSplitCurrency } from "@/lib/splitter/debtEngine";
import { generateQRCodeSVG } from "@/lib/splitter/qrGenerator";
import {
  decodeQRCodeFromVideo,
  decodeQRCodeFromFile,
  decodeQRCodeFromUrl,
} from "@/lib/splitter/qrScanner";
import {
  buildUpiUri,
  parseUpiUri,
  getAppPaymentUri,
  openPaymentApp,
  downloadQrImage,
  PAYMENT_APPS,
  PaymentAppType,
} from "@/lib/splitter/upiPayment";

interface PaymentSettlementQRModalProps {
  open: boolean;
  onClose: () => void;
  transaction: SettlementTransaction | null;
  members: SplitMember[];
  currency?: string;
  onMarkSettled?: (notes?: string) => Promise<void>;
}

export function PaymentSettlementQRModal({
  open,
  onClose,
  transaction,
  members,
  currency = "INR",
  onMarkSettled,
}: PaymentSettlementQRModalProps) {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [markingSettled, setMarkingSettled] = useState(false);

  // Active receiver UPI ID (auto-extracted from QR image or member profile)
  const [activeUpiId, setActiveUpiId] = useState<string>("");
  const [isDecodingQr, setIsDecodingQr] = useState<boolean>(false);
  const [detectedFromQr, setDetectedFromQr] = useState<boolean>(false);
  const [appLaunchStatus, setAppLaunchStatus] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const scanFileInputRef = useRef<HTMLInputElement>(null);

  // Identify receiver and payer members
  const receiverMember = members.find((m) => m.id === transaction?.toMemberId);
  const payerMember = members.find((m) => m.id === transaction?.fromMemberId);

  const receiverName = receiverMember?.name || transaction?.toMemberName || "Receiver";
  const amount = transaction?.amount || 0;

  // Cloudinary QR uploaded by receiver
  const uploadedQrUrl = receiverMember?.paymentQrCode || "";

  // Dynamic fallback UPI QR code (generated using activeUpiId and exact settlement amount)
  const upiUriForExactAmount = activeUpiId
    ? buildUpiUri({
        pa: activeUpiId,
        pn: receiverName,
        am: amount,
        cu: currency,
        tn: `CapFlow Settlement to ${receiverName}`,
      })
    : "";

  const dynamicQrSvg = upiUriForExactAmount
    ? generateQRCodeSVG(upiUriForExactAmount, {
        size: 220,
        color: "#0F172A",
        bgColor: "#FFFFFF",
        margin: 3,
      })
    : "";

  // Reset state and extract UPI ID when modal opens
  useEffect(() => {
    if (!open) {
      stopCamera();
      setScannerActive(false);
      setScannedResult(null);
      setCameraError("");
      setAppLaunchStatus(null);
      return;
    }

    // 1. Initial UPI ID candidate from member profile
    let initialUpi = receiverMember?.upiId || "";
    if (!initialUpi && receiverMember?.phone) {
      const cleanPhone = receiverMember.phone.replace(/\D/g, "");
      if (cleanPhone.length === 10) {
        initialUpi = `${cleanPhone}@upi`;
      }
    }

    setActiveUpiId(initialUpi);
    setDetectedFromQr(false);

    // 2. If receiver has an uploaded QR code from Cloudinary, automatically decode it
    if (receiverMember?.paymentQrCode) {
      setIsDecodingQr(true);
      decodeQRCodeFromUrl(receiverMember.paymentQrCode)
        .then((decoded) => {
          if (decoded) {
            const parsed = parseUpiUri(decoded);
            if (parsed?.pa) {
              setActiveUpiId(parsed.pa);
              setDetectedFromQr(true);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsDecodingQr(false);
        });
    }
  }, [open, receiverMember]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Camera scanner handlers
  const startCamera = async () => {
    setScannerActive(true);
    setCameraError("");
    setScannedResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        startScanLoop();
      }
    } catch {
      setCameraError("Camera permission denied or camera not accessible.");
    }
  };

  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startScanLoop = () => {
    const scanFrame = async () => {
      if (videoRef.current && canvasRef.current && streamRef.current) {
        try {
          const result = await decodeQRCodeFromVideo(
            videoRef.current,
            canvasRef.current
          );
          if (result) {
            handleDecodedQrText(result);
            stopCamera();
            setScannerActive(false);
            return;
          }
        } catch {
          // ignore scan frame error
        }
      }
      scanLoopRef.current = requestAnimationFrame(scanFrame);
    };
    scanLoopRef.current = requestAnimationFrame(scanFrame);
  };

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await decodeQRCodeFromFile(file);
      if (res) {
        handleDecodedQrText(res);
      } else {
        alert("No valid QR code found in the selected image.");
      }
    } catch {
      alert("Failed to read image file.");
    }
  };

  const handleDecodedQrText = (rawText: string) => {
    setScannedResult(rawText);
    const parsed = parseUpiUri(rawText);
    if (parsed?.pa) {
      setActiveUpiId(parsed.pa);
      setDetectedFromQr(true);
      setAppLaunchStatus(`Extracted UPI ID: ${parsed.pa}`);
      setTimeout(() => setAppLaunchStatus(null), 3000);
    }
  };

  // Download QR handler
  const handleDownloadQR = () => {
    const filename = `${receiverName.replace(/\s+/g, "_")}_Payment_QR`;
    if (uploadedQrUrl) {
      downloadQrImage(uploadedQrUrl, `${filename}.png`);
    } else if (dynamicQrSvg) {
      const svgBlob = new Blob([dynamicQrSvg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  // Copy UPI ID handler
  const handleCopyUpi = async () => {
    if (!activeUpiId) return;
    try {
      await navigator.clipboard.writeText(activeUpiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch {
      // fallback
    }
  };

  // Launch Payment App on phone
  const handleAppClick = (e: React.MouseEvent, appId: PaymentAppType) => {
    if (!activeUpiId) {
      e.preventDefault();
      alert("No receiver UPI ID detected. Please scan the QR code first.");
      return;
    }

    const appInfo = PAYMENT_APPS.find((a) => a.id === appId);
    setAppLaunchStatus(`Opening ${appInfo?.name || "Payment App"} with ${activeUpiId}...`);

    openPaymentApp(appId, {
      pa: activeUpiId,
      pn: receiverName,
      am: amount,
      cu: currency,
      tn: `CapFlow settlement to ${receiverName}`,
    });

    setTimeout(() => {
      setAppLaunchStatus(null);
    }, 4000);
  };

  // Confirm settlement
  const handleConfirmSettlement = async () => {
    if (!onMarkSettled) return;
    setMarkingSettled(true);
    try {
      await onMarkSettled(
        `Settled via QR Code / Mobile Payment (${payerMember?.name || "Member"} -> ${receiverName}${
          activeUpiId ? ` • UPI: ${activeUpiId}` : ""
        })`
      );
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setMarkingSettled(false);
    }
  };

  if (!transaction) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-[430px] max-h-[92vh] overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 sm:p-6 shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center flex-shrink-0">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Payment QR & Phone Apps
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Pay {receiverName} directly on phone
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Transaction Settlement Hero Pill */}
            <div className="mt-4 p-3.5 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <span>{payerMember?.name || transaction.fromMemberName}</span>
                    <ArrowRight size={12} className="text-[var(--text-secondary)]" />
                    <span className="font-bold text-[var(--text-primary)] truncate">
                      {receiverName}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Amount to settle
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xl font-extrabold text-[#10B981]">
                    {formatSplitCurrency(amount, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code Presentation OR Camera Scanner */}
            {scannerActive ? (
              /* Camera Scanner View */
              <div className="mt-4 flex flex-col items-center">
                <div className="relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden bg-black border-2 border-[#10B981]">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Scanner overlay corners */}
                  <div className="absolute inset-6 border-2 border-dashed border-white/60 rounded-xl pointer-events-none" />
                  <div className="absolute top-2 left-0 right-0 text-center text-[10px] font-semibold text-white bg-black/40 py-1">
                    Point camera at receiving QR code
                  </div>
                </div>

                {cameraError && (
                  <p className="text-xs text-[#EF4444] mt-2 font-medium">{cameraError}</p>
                )}

                <button
                  type="button"
                  onClick={stopCamera}
                  className="mt-3 px-4 py-2 rounded-xl bg-[var(--bg-primary)] text-xs font-bold text-[var(--text-primary)] hover:border border-[var(--border-color)]"
                >
                  Close Scanner
                </button>
              </div>
            ) : (
              /* QR Code Display */
              <div className="mt-4 flex flex-col items-center">
                {uploadedQrUrl ? (
                  /* User's Uploaded QR from Cloudinary */
                  <div className="relative p-3 bg-white rounded-2xl border border-slate-200 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedQrUrl}
                      alt={`${receiverName} Payment QR`}
                      className="w-52 h-52 object-contain rounded-xl"
                    />
                    <div className="mt-2 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        <ShieldCheck size={11} className="text-[#10B981]" />
                        Uploaded by {receiverName}
                      </span>
                    </div>
                  </div>
                ) : dynamicQrSvg ? (
                  /* Dynamic Generated UPI QR Code */
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-md">
                    <div
                      dangerouslySetInnerHTML={{ __html: dynamicQrSvg }}
                      className="w-52 h-52 flex items-center justify-center"
                    />
                    <div className="mt-2 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Sparkles size={11} className="text-[#6366F1]" />
                        Instant UPI QR ({formatSplitCurrency(amount, currency)})
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Receiver has not uploaded QR yet */
                  <div className="w-full py-7 px-4 rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-primary)]/50 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mx-auto mb-2">
                      <AlertCircle size={22} />
                    </div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {receiverName} has not uploaded a QR code yet
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-[280px] mx-auto">
                      Enter their UPI ID below or scan with camera to open payment apps directly on your phone.
                    </p>
                  </div>
                )}

                {/* QR Actions: Download & Scan with Camera */}
                <div className="flex items-center gap-2 mt-3.5 w-full">
                  {(uploadedQrUrl || dynamicQrSvg) && (
                    <button
                      type="button"
                      onClick={handleDownloadQR}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:border-[#10B981] transition-colors"
                      title="Download QR code to phone"
                    >
                      <Download size={14} className="text-[#10B981]" />
                      <span>Download QR</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:border-[#6366F1] transition-colors"
                    title="Scan QR with camera"
                  >
                    <Camera size={14} className="text-[#6366F1]" />
                    <span>Scan with Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => scanFileInputRef.current?.click()}
                    className="p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    title="Scan QR from gallery image"
                  >
                    <Upload size={14} />
                  </button>
                  <input
                    ref={scanFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleScanFile}
                    className="hidden"
                  />
                </div>

                {/* Scanned result pill */}
                {scannedResult && (
                  <div className="w-full mt-2.5 p-2 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl text-[11px] font-medium text-[#10B981] flex items-center justify-between">
                    <span className="truncate">Scanned: {scannedResult}</span>
                    <button
                      onClick={() => setScannedResult(null)}
                      className="text-xs font-bold underline ml-2"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Receiver UPI ID Section (Verified / Editable) ── */}
            <div className="mt-4 p-3.5 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                    Receiver UPI ID
                  </span>
                  {detectedFromQr && (
                    <span className="text-[9px] font-bold text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.2 rounded-md">
                      Auto-detected
                    </span>
                  )}
                  {isDecodingQr && (
                    <span className="inline-flex items-center gap-1 text-[9px] text-[#6366F1]">
                      <Loader2 size={10} className="animate-spin" />
                      Reading QR...
                    </span>
                  )}
                </div>

                {activeUpiId && (
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-primary)] hover:text-[#10B981] transition-colors"
                  >
                    {copiedUpi ? (
                      <>
                        <Check size={11} className="text-[#10B981]" />
                        <span className="text-[#10B981]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {activeUpiId ? (
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-[var(--text-primary)] tracking-wide truncate">
                    {activeUpiId}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#10B981]">
                    <CheckCircle size={12} />
                    Ready
                  </span>
                </div>
              ) : (
                <div className="py-1 text-xs text-[#EF4444] font-semibold flex items-center gap-1">
                  <AlertCircle size={13} />
                  <span>No UPI ID detected from receiver's QR code</span>
                </div>
              )}
            </div>

            {/* App Launch Feedback Pill */}
            {appLaunchStatus && (
              <div className="mt-3 p-2 bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-xl text-center text-xs font-bold text-[#6366F1]">
                {appLaunchStatus}
              </div>
            )}

            {/* ── Suggestion of Payments Applications on Phones ── */}
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <Smartphone size={14} className="text-[#6366F1]" />
                  <span>Open in Installed Payment Apps</span>
                </div>
                {activeUpiId ? (
                  <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                    Auto-fills ₹{amount.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded-full">
                    Enter UPI ID above
                  </span>
                )}
              </div>

              {/* Payment App Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_APPS.map((app) => {
                  const appUri = activeUpiId
                    ? getAppPaymentUri(app.id, {
                        pa: activeUpiId,
                        pn: receiverName,
                        am: amount,
                        cu: currency,
                        tn: `CapFlow settlement to ${receiverName}`,
                      })
                    : "#";

                  return (
                    <a
                      key={app.id}
                      href={appUri}
                      onClick={(e) => handleAppClick(e, app.id)}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--accent,#6366F1)] active:scale-95 transition-all text-left group no-underline cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: app.color }}
                        />
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {app.name}
                        </span>
                      </div>
                      <ExternalLink
                        size={12}
                        className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] flex-shrink-0"
                      />
                    </a>
                  );
                })}
              </div>

              <p className="text-[10px] text-[var(--text-secondary)] mt-1.5 text-center">
                Clicking opens that app on your mobile phone with receiver UPI ID ({activeUpiId || "..."}) & amount pre-filled
              </p>
            </div>

            {/* Actions: Mark as Settled / Close */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--border-color)] transition-colors"
              >
                Cancel
              </button>

              {onMarkSettled && (
                <button
                  type="button"
                  onClick={handleConfirmSettlement}
                  disabled={markingSettled}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#10B981] text-white text-xs font-bold hover:bg-[#059669] transition-all shadow-md shadow-[#10B981]/25 disabled:opacity-50"
                >
                  <CheckCircle size={14} />
                  <span>{markingSettled ? "Marking Settled..." : "Mark as Settled"}</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
