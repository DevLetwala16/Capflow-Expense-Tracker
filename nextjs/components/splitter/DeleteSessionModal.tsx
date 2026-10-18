"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { SplitSession } from "@/types/splitter";

interface DeleteSessionModalProps {
  open: boolean;
  onClose: () => void;
  session: SplitSession;
  onConfirmDelete: () => Promise<void>;
}

export function DeleteSessionModal({
  open,
  onClose,
  session,
  onConfirmDelete,
}: DeleteSessionModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await onConfirmDelete();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to delete session. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
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
            className="relative w-full max-w-[420px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl z-10 text-center"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={deleting}
              className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>

            {/* Danger Icon */}
            <div className="w-14 h-14 rounded-3xl bg-[#EF4444]/15 text-[#EF4444] flex items-center justify-center mx-auto mb-3.5 shadow-sm">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Delete Session?
            </h3>

            <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <span className="font-bold text-[var(--text-primary)]">
                &ldquo;{session.name}&rdquo;
              </span>{" "}
              (<span className="font-mono text-[#6366F1]">{session.sessionId}</span>)?
            </p>

            {/* Impact Box */}
            <div className="p-3 bg-[var(--bg-primary)] border border-[#EF4444]/20 rounded-2xl my-4 text-left text-xs space-y-1">
              <p className="font-bold text-[#EF4444] flex items-center gap-1.5">
                <Trash2 size={13} />
                <span>Irreversible Action</span>
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                This will delete all{" "}
                <strong className="text-[var(--text-primary)]">
                  {session.expenses.length} itemized expenses
                </strong>
                , all member net balances, and the immutable audit trail.
              </p>
            </div>

            {error && (
              <div className="p-2.5 mb-3 bg-[#EF4444]/15 text-[#EF4444] rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-[#EF4444] text-white text-xs font-bold hover:bg-[#DC2626] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#EF4444]/20 disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>{deleting ? "Deleting..." : "Delete Session"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
