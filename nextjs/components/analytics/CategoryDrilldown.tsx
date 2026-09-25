"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Transaction, Category } from "@/lib/db";
import { db } from "@/lib/db";
import { useAuthStore } from "@/lib/store/authStore";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { DynamicIcon } from "@/components/transaction/DynamicIcon";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

interface CategoryDrilldownProps {
  open: boolean;
  onClose: () => void;
  slice: {
    categoryId: number;
    name: string;
    color: string;
    icon: string;
    amount: number;
    percent: number;
    count: number;
  } | null;
  currency: string;
  startDate: string;
  endDate: string;
}

export function CategoryDrilldown({
  open,
  onClose,
  slice,
  currency,
  startDate,
  endDate,
}: CategoryDrilldownProps) {
  const { user } = useAuthStore();
  const { categories } = useCategoryStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  useEffect(() => {
    if (!open || !slice || !user?.id) return;
    db.transactions
      .where("[userId+categoryId]")
      .equals([user.id, slice.categoryId])
      .filter((tx) => tx.type === "expense" && tx.date >= startDate && tx.date <= endDate)
      .toArray()
      .then((txs) => {
        txs.sort((a, b) => (b.date > a.date ? 1 : -1));
        setTransactions(txs);
      });
  }, [open, slice, startDate, endDate, user?.id]);

  return (
    <AnimatePresence>
      {open && slice && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center pointer-events-none p-2 sm:p-4">
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
            <div className="flex items-center justify-between px-4 pb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: slice.color + "20" }}
                >
                  <DynamicIcon name={slice.icon} size={20} color={slice.color} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    {slice.name}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {slice.count} transaction{slice.count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex items-center justify-center"
                aria-label="Close"
              >
                <X size={16} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 px-4 pb-4 flex-shrink-0">
              <div
                className="flex-1 rounded-2xl p-3 text-center"
                style={{ backgroundColor: slice.color + "15" }}
              >
                <p className="text-xs text-[var(--text-secondary)]">Total Spent</p>
                <p className="text-lg font-bold" style={{ color: slice.color }}>
                  {symbol}{slice.amount.toLocaleString()}
                </p>
              </div>
              <div className="flex-1 rounded-2xl p-3 text-center bg-[var(--bg-card)]">
                <p className="text-xs text-[var(--text-secondary)]">% of Expenses</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {slice.percent}%
                </p>
              </div>
            </div>

            {/* Transaction list */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                  No transactions found
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 bg-[var(--bg-card)] rounded-xl px-3 py-3"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: slice.color + "20" }}
                    >
                      <DynamicIcon name={slice.icon} size={14} color={slice.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {tx.title}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{tx.date}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#EF4444] flex-shrink-0">
                      -{symbol}{tx.amount.toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);
}
