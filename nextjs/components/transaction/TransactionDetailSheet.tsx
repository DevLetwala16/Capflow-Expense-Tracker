"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  CreditCard,
  FileText,
  Tag,
  Edit3,
  Trash2,
  ExternalLink,
  ZoomIn,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Transaction, Category } from "@/lib/db";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

interface TransactionDetailSheetProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  categories: Category[];
  currency: string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: number) => Promise<void>;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  credit_card: "Credit Card",
  bank_transfer: "Bank Transfer",
};

export function TransactionDetailSheet({
  open,
  onClose,
  transaction,
  categories,
  currency,
  onEdit,
  onDelete,
}: TransactionDetailSheetProps) {
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!transaction) return null;

  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const category = categories.find((c) => c.id === transaction.categoryId);
  const isIncome = transaction.type === "income";

  const formattedDate = (() => {
    try {
      return format(parseISO(transaction.date), "EEEE, d MMMM yyyy");
    } catch {
      return transaction.date;
    }
  })();

  const handleDelete = async () => {
    if (!transaction.id) return;
    const confirmed = window.confirm(
      `Delete "${transaction.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await onDelete(transaction.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="tx-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Wrapper: Bottom Sheet on Mobile, Centered Modal on Tablet/Desktop */}
          <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center pointer-events-none p-2 sm:p-4">
            <motion.div
              key="tx-detail-content"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-full max-w-[420px] bg-[var(--bg-primary)] rounded-[24px] sm:rounded-3xl max-h-[90dvh] flex flex-col shadow-2xl border border-[var(--border-color)] overflow-hidden pointer-events-auto"
            >
              {/* Drag Handle (Mobile only) */}
              <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0 bg-[var(--bg-primary)] sm:hidden">
                <div className="w-10 h-1 bg-[var(--border-color)] rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-2.5 pt-2 flex-shrink-0 bg-[var(--bg-primary)] border-b border-[var(--border-color)]/60">
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Transaction Details
                </span>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors"
                  aria-label="Close"
                >
                  <X size={15} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Hero Amount & Category Card */}
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 text-center flex flex-col items-center">
                  {/* Category Icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 shadow-sm"
                    style={{
                      backgroundColor: category ? category.color + "20" : "#6366F120",
                    }}
                  >
                    {category ? (
                      <DynamicIcon name={category.icon} size={26} color={category.color} />
                    ) : (
                      <span className="text-2xl">💰</span>
                    )}
                  </div>

                  {/* Title / Description */}
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                    {transaction.title}
                  </h3>

                  {/* Amount Display */}
                  <div className="flex items-center justify-center gap-1 my-1">
                    <span
                      className={`text-3xl font-extrabold ${
                        isIncome ? "text-[#10B981]" : "text-[#EF4444]"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {symbol}
                      {transaction.amount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Type Badge */}
                  <span
                    className={`mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                      isIncome
                        ? "bg-[#10B981]/15 text-[#10B981]"
                        : "bg-[#EF4444]/15 text-[#EF4444]"
                    }`}
                  >
                    {transaction.type}
                  </span>
                </div>

                {/* Information Grid */}
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] divide-y divide-[var(--border-color)]/60 text-xs">
                  {/* Date */}
                  <div className="flex items-center justify-between p-3">
                    <span className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
                      <Calendar size={14} className="text-[#6366F1]" />
                      Date
                    </span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {formattedDate}
                    </span>
                  </div>

                  {/* Category */}
                  <div className="flex items-center justify-between p-3">
                    <span className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
                      <Tag size={14} className="text-[#6366F1]" />
                      Category
                    </span>
                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      {category && (
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      {category?.name ?? "General"}
                    </span>
                  </div>

                  {/* Payment Method */}
                  <div className="flex items-center justify-between p-3">
                    <span className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
                      <CreditCard size={14} className="text-[#6366F1]" />
                      Payment Method
                    </span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {PAYMENT_LABELS[transaction.paymentMethod] || transaction.paymentMethod}
                    </span>
                  </div>
                </div>

                {/* Notes Section (if available) */}
                {transaction.notes && (
                  <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      <FileText size={13} className="text-[#6366F1]" />
                      <span>Notes</span>
                    </div>
                    <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap pl-5">
                      {transaction.notes}
                    </p>
                  </div>
                )}

                {/* Receipt Photo Section (if available) */}
                {transaction.receiptImage && (
                  <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <FileText size={13} className="text-[#6366F1]" />
                        <span>Attached Receipt</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPhotoPreviewOpen(true)}
                        className="text-[11px] text-[#6366F1] font-semibold flex items-center gap-1 hover:underline lowercase"
                      >
                        <ZoomIn size={12} />
                        view full
                      </button>
                    </div>

                    <div
                      onClick={() => setPhotoPreviewOpen(true)}
                      className="relative rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-primary)] cursor-pointer group max-h-48 flex items-center justify-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={transaction.receiptImage}
                        alt="Receipt preview"
                        className="w-full h-auto max-h-48 object-contain rounded-xl group-hover:opacity-95 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-black/60 text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <ZoomIn size={13} />
                          Tap to enlarge
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer: Edit & Delete buttons */}
              <div className="p-3 sm:p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center gap-2.5 flex-shrink-0">
                {/* Delete Button */}
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3.5 py-3 rounded-xl bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 hover:bg-[#EF4444]/20 transition-all font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  aria-label="Delete"
                >
                  <Trash2 size={15} />
                  <span>Delete</span>
                </button>

                {/* Edit Button (Opens Edit Sheet) */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(transaction);
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#6366F1] text-white hover:bg-[#5558E6] transition-all font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                >
                  <Edit3 size={15} />
                  <span>Edit Transaction</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Full Screen Image Preview Modal */}
          {photoPreviewOpen && transaction.receiptImage && (
            <div
              className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-md"
              onClick={() => setPhotoPreviewOpen(false)}
            >
              <button
                type="button"
                onClick={() => setPhotoPreviewOpen(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Close preview"
              >
                <X size={20} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={transaction.receiptImage}
                alt="Receipt full size"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
