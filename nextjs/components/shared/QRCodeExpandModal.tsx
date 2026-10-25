"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, Check, QrCode, Maximize2, ShieldCheck } from "lucide-react";
import { downloadQrImage } from "@/lib/splitter/upiPayment";

interface QRCodeExpandModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  svgHtml?: string;
  upiId?: string;
  userName?: string;
  amount?: number;
  currency?: string;
  downloadFileName?: string;
}

export function QRCodeExpandModal({
  open,
  onClose,
  title = "Payment QR Code",
  subtitle = "Scan with any UPI app to pay",
  imageUrl,
  svgHtml,
  upiId,
  userName,
  amount,
  currency = "INR",
  downloadFileName = "CapFlow_Payment_QR",
}: QRCodeExpandModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUpi = async () => {
    if (!upiId) return;
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    if (imageUrl) {
      downloadQrImage(imageUrl, `${downloadFileName}.png`);
    } else if (svgHtml) {
      const blob = new Blob([svgHtml], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${downloadFileName}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          className="relative w-full max-w-[420px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl z-10 flex flex-col items-center text-center"
        >
          {/* Header */}
          <div className="w-full flex items-center justify-between pb-3 border-b border-[var(--border-color)] mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center flex-shrink-0">
                <Maximize2 size={16} />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                  {title}
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
              title="Close expand preview"
            >
              <X size={18} />
            </button>
          </div>

          {/* Amount Badge if present */}
          {typeof amount === "number" && amount > 0 && (
            <div className="mb-3 px-3 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-sm font-extrabold flex items-center gap-1.5">
              <span>Amount:</span>
              <span>
                {currency === "INR" ? "₹" : currency}{" "}
                {amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* User Name Pill */}
          {userName && (
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#10B981]" />
              <span>Pay directly to <strong className="text-[#6366F1]">{userName}</strong></span>
            </p>
          )}

          {/* Large Expand QR Container (High Contrast for reliable scanning) */}
          <div className="p-4 bg-white rounded-3xl border-2 border-slate-200 shadow-xl inline-flex items-center justify-center max-w-[320px] w-full aspect-square relative">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Expanded Payment QR Code"
                className="w-full h-full object-contain rounded-2xl"
              />
            ) : svgHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: svgHtml }}
                className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-6">
                <QrCode size={48} className="mb-2 text-slate-300" />
                <span className="text-xs font-medium">No QR Image Available</span>
              </div>
            )}
          </div>

          {/* UPI ID Pill if available */}
          {upiId && (
            <div className="w-full mt-4 p-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between gap-2">
              <div className="text-left min-w-0">
                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider block">
                  UPI ID / VPA
                </span>
                <span className="text-xs font-mono font-bold text-[var(--text-primary)] truncate block">
                  {upiId}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[#10B981] transition-colors flex items-center gap-1 flex-shrink-0"
                title="Copy UPI ID"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-[#10B981]" />
                    <span className="text-[#10B981]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="w-full grid grid-cols-2 gap-2 mt-4">
            <button
              type="button"
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] hover:border-[#10B981] hover:text-[#10B981] transition-colors"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] transition-all shadow-md shadow-[#6366F1]/20"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
