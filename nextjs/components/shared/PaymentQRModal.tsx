"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  QrCode,
  Upload,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { decodeQRCodeFromFile, decodeQRCodeFromUrl } from "@/lib/splitter/qrScanner";
import { parseUpiUri, downloadQrImage, PAYMENT_APPS } from "@/lib/splitter/upiPayment";

interface PaymentQRModalProps {
  open: boolean;
  onClose: () => void;
}

export function PaymentQRModal({ open, onClose }: PaymentQRModalProps) {
  const { user, updateUser } = useAuthStore();
  const { paymentQrCode: storedQr, paymentUpiId: storedUpi, setPaymentQrCode, setPaymentUpiId } =
    useSettingsStore();

  const currentQr = user?.paymentQrCode || storedQr || "";
  const currentUpi = user?.upiId || storedUpi || "";

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [upiIdInput, setUpiIdInput] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPreviewUrl(currentQr);
      setUpiIdInput(currentUpi);
      setStatusMessage(null);
      setSelectedFile(null);

      // Auto-decode existing Cloudinary QR if UPI ID is not yet saved
      if (currentQr && !currentUpi) {
        decodeQRCodeFromUrl(currentQr)
          .then((decoded) => {
            if (decoded) {
              const parsed = parseUpiUri(decoded);
              if (parsed?.pa) {
                setUpiIdInput(parsed.pa);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [open, currentQr, currentUpi]);

  // Handle file selection & automatic QR decode
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage({ type: "error", text: "Please select a valid image file (PNG, JPG, WebP)" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatusMessage({ type: "error", text: "Image size must be under 10MB" });
      return;
    }

    setSelectedFile(file);
    setStatusMessage(null);

    // Create local preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Attempt automatic UPI QR decoding
    try {
      const decoded = await decodeQRCodeFromFile(file);
      if (decoded) {
        const parsed = parseUpiUri(decoded);
        if (parsed?.pa) {
          setUpiIdInput(parsed.pa);
          setStatusMessage({
            type: "success",
            text: `Detected UPI ID: ${parsed.pa}`,
          });
        }
      }
    } catch {
      // Decode attempt finished without error
    }
  };

  // Upload to Cloudinary via backend API
  const handleUpload = async () => {
    if (!previewUrl) {
      setStatusMessage({ type: "error", text: "Please choose a QR code image to upload" });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/user/payment-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrImage: previewUrl,
          upiId: upiIdInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload QR code");
      }

      // Update stores
      updateUser({
        paymentQrCode: data.paymentQrCode,
        upiId: data.upiId || upiIdInput.trim(),
      });
      setPaymentQrCode(data.paymentQrCode);
      setPaymentUpiId(data.upiId || upiIdInput.trim());

      setPreviewUrl(data.paymentQrCode);
      setSelectedFile(null);
      setStatusMessage({
        type: "success",
        text: "Payment QR code stored safely in Cloudinary & linked to your account!",
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to upload QR code to Cloudinary",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Delete QR code
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove your payment QR code?")) return;

    setIsDeleting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/user/payment-qr", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete QR code");

      updateUser({ paymentQrCode: "", upiId: "" });
      setPaymentQrCode("");
      setPaymentUpiId("");
      setPreviewUrl("");
      setUpiIdInput("");
      setSelectedFile(null);
      setStatusMessage({ type: "success", text: "Payment QR code removed successfully" });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to remove QR code" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Download QR code
  const handleDownload = () => {
    if (!currentQr) return;
    const name = user?.name ? `${user.name.replace(/\s+/g, "_")}_Payment_QR` : "CapFlow_Payment_QR";
    downloadQrImage(currentQr, `${name}.png`);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-[440px] max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 sm:p-6 shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Payment QR Code
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Personal receiving QR for Splitter settlements
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

            {/* Status Message */}
            {statusMessage && (
              <div
                className={`mt-4 p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold ${
                  statusMessage.type === "success"
                    ? "bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]"
                    : "bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444]"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle size={16} className="flex-shrink-0" />
                ) : (
                  <AlertCircle size={16} className="flex-shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* QR Code Preview & Container */}
            <div className="mt-4 flex flex-col items-center">
              {previewUrl ? (
                <div className="relative group p-3.5 bg-white rounded-2xl border border-slate-200 shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Payment QR"
                    className="w-52 h-52 object-contain rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-xl bg-white text-slate-800 shadow hover:bg-slate-100"
                      title="Replace image"
                    >
                      <RefreshCw size={16} />
                    </button>
                    {currentQr && (
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="p-2 rounded-xl bg-white text-slate-800 shadow hover:bg-slate-100"
                        title="Download QR"
                      >
                        <Download size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-10 px-4 border-2 border-dashed border-[var(--border-color)] hover:border-[#6366F1] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-[var(--bg-primary)]/50"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center mb-2">
                    <Upload size={22} />
                  </div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    Upload Payment QR Code
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 text-center">
                    Google Pay, PhonePe, Paytm, BHIM, or Bank QR (PNG/JPG)
                  </p>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* QR Action Buttons */}
              <div className="flex items-center gap-2 mt-3 w-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:border-[#6366F1] transition-colors"
                >
                  <Upload size={14} />
                  <span>{previewUrl ? "Change Image" : "Select Image"}</span>
                </button>

                {currentQr && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:text-[#10B981] transition-colors"
                      title="Download QR code"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                      title="Delete QR code"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* UPI ID / VPA Field */}
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                UPI ID / VPA (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. name@okhdfcbank or 9876543210@paytm"
                value={upiIdInput}
                onChange={(e) => setUpiIdInput(e.target.value.trim())}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
              />
              {/* Quick Suffixes */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[10px] text-[var(--text-secondary)]">Quick tags:</span>
                {["@okaxis", "@okhdfcbank", "@paytm", "@ybl", "@upi"].map((sfx) => (
                  <button
                    key={sfx}
                    type="button"
                    onClick={() => {
                      const prefix = upiIdInput.includes("@")
                        ? upiIdInput.split("@")[0]
                        : upiIdInput;
                      setUpiIdInput(prefix ? `${prefix}${sfx}` : sfx.replace(/^@/, ""));
                    }}
                    className="px-2 py-0.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[#6366F1] hover:border-[#6366F1] transition-colors"
                  >
                    {sfx}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                Enables 1-tap payment links in GPay, PhonePe, and Paytm for other group members
              </p>
            </div>

            {/* Supported Apps Preview */}
            <div className="mt-4 p-3 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)] mb-2">
                <Smartphone size={13} />
                <span>Mobile Apps Supported for Settlements</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {PAYMENT_APPS.map((app) => (
                  <span
                    key={app.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-semibold text-[var(--text-primary)]"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: app.color }}
                    />
                    {app.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] justify-center">
              <ShieldCheck size={13} className="text-[#10B981]" />
              <span>Stored securely on Cloudinary and encrypted in your profile</span>
            </div>

            {/* Save Button */}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--border-color)] transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || (!selectedFile && previewUrl === currentQr && upiIdInput === currentUpi)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] transition-all disabled:opacity-50 shadow-md shadow-[#6366F1]/20"
              >
                {isUploading ? "Uploading..." : "Save to Cloud"}
                <CheckCircle size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
