"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, QrCode, Share2 } from "lucide-react";
import { generateQRCodeSVG } from "@/lib/splitter/qrGenerator";

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionName: string;
}

export function QRCodeModal({
  open,
  onClose,
  sessionId,
  sessionName,
}: QRCodeModalProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${origin}/budgets/splitter?join=${encodeURIComponent(sessionId)}`;

  const svgContent = generateQRCodeSVG(joinUrl, {
    size: 220,
    color: "#0F172A",
    bgColor: "#FFFFFF",
    margin: 4,
  });

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
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
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-full max-w-[360px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl z-10 text-center"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center mx-auto mb-3">
              <QrCode size={24} />
            </div>

            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Join Split Session
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-5 truncate px-2">
              {sessionName}
            </p>

            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 inline-block mb-4">
              <div
                dangerouslySetInnerHTML={{ __html: svgContent }}
                className="w-[200px] h-[200px] flex items-center justify-center"
              />
            </div>

            {/* Session ID Pill */}
            <div className="flex items-center justify-between gap-2 p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl mb-4 text-left">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                  Session ID
                </span>
                <p className="text-sm font-extrabold text-[#6366F1] tracking-wider truncate">
                  {sessionId}
                </p>
              </div>
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] transition-colors flex-shrink-0"
              >
                {copiedId ? <Check size={14} /> : <Copy size={14} />}
                {copiedId ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--border-color)] transition-colors"
              >
                {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                {copiedLink ? "Link Copied" : "Copy Link"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-2xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
