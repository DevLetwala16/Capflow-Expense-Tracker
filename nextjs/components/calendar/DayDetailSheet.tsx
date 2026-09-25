"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { Transaction, Category } from "@/lib/db";
import { db } from "@/lib/db";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { DynamicIcon } from "@/components/transaction/DynamicIcon";
import { AddTransactionSheet } from "@/components/transaction/AddTransactionSheet";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("default", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface DayDetailSheetProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string | null; // "YYYY-MM-DD"
  currency: string;
  onTransactionAdded?: () => void;
}

export function DayDetailSheet({
  open,
  onClose,
  selectedDate,
  currency,
  onTransactionAdded,
}: DayDetailSheetProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { categories, loadCategories } = useCategoryStore();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  useEffect(() => {
    if (!open || !selectedDate) return;

    loadCategories();
    db.transactions
      .where("date")
      .equals(selectedDate)
      .reverse()
      .toArray()
      .then(setTransactions);
  }, [open, selectedDate, loadCategories]);

  const net = transactions.reduce((sum, tx) => {
    return sum + (tx.type === "income" ? tx.amount : -tx.amount);
  }, 0);

  const catMap = new Map(categories.map((c) => [c.id!, c]));

  return (
    <>
      <AnimatePresence>
        {open && selectedDate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[75] backdrop-blur-sm"
              onClick={onClose}
            />
            <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center pointer-events-none p-2 sm:p-4">
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="w-full max-w-[400px] bg-[var(--bg-primary)] rounded-[24px] sm:rounded-3xl max-h-[85dvh] sm:max-h-[80vh] flex flex-col shadow-2xl border border-[var(--border-color)] overflow-hidden pointer-events-auto"
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
                  <div className="w-10 h-1 bg-[var(--border-color)] rounded-full" />
                </div>

              {/* Header */}
              <div className="flex items-start justify-between px-4 pb-4 flex-shrink-0">
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    {formatDate(selectedDate)}
                  </h2>
                  <p
                    className={`text-sm font-semibold mt-0.5 ${
                      net >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                    }`}
                  >
                    Net: {net >= 0 ? "+" : ""}{symbol}{Math.abs(net).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex items-center justify-center"
                  aria-label="Close"
                >
                  <X size={16} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Transaction list */}
              <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                    No transactions on this day
                  </div>
                ) : (
                  transactions.map((tx) => {
                    const cat = catMap.get(tx.categoryId);
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 bg-[var(--bg-card)] rounded-xl px-3 py-3"
                      >
                        <div
                          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: (cat?.color ?? "#94A3B8") + "20" }}
                        >
                          <DynamicIcon
                            name={cat?.icon ?? "circle-ellipsis"}
                            size={14}
                            color={cat?.color ?? "#94A3B8"}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {tx.title}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] capitalize">
                            {cat?.name ?? "Unknown"} · {tx.paymentMethod.replace("_", " ")}
                          </p>
                        </div>
                        <p
                          className={`text-sm font-semibold flex-shrink-0 ${
                            tx.type === "income" ? "text-[#10B981]" : "text-[#EF4444]"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}{symbol}{tx.amount.toLocaleString()}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add transaction button */}
              <div className="px-4 pb-6 flex-shrink-0">
                <button
                  onClick={() => setShowAddSheet(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-[var(--border-color)] text-[#6366F1] font-semibold text-sm hover:bg-[#6366F1]/5 transition-colors"
                >
                  <Plus size={16} />
                  Add transaction for this day
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>

      {/* Nested AddTransactionSheet pre-filled with date */}
      <AddTransactionSheet
        open={showAddSheet}
        onClose={() => {
          setShowAddSheet(false);
          // Refresh transactions for this day
          if (selectedDate) {
            db.transactions
              .where("date")
              .equals(selectedDate)
              .reverse()
              .toArray()
              .then(setTransactions);
          }
          onTransactionAdded?.();
        }}
        defaultType="expense"
        categories={categories}
        currency={currency}
        prefillDate={selectedDate ?? undefined}
      />
    </>
  );
}
