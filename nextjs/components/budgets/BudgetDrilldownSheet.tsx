"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Transaction, Category } from "@/lib/db";
import { db } from "@/lib/db";
import { DynamicIcon } from "@/components/transaction/DynamicIcon";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

interface BudgetDrilldownSheetProps {
  open: boolean;
  onClose: () => void;
  budget: {
    categoryId: number;
    limit: number;
    spent: number;
    month: string;
  } | null;
  categories: Category[];
  currency: string;
}

export function BudgetDrilldownSheet({
  open,
  onClose,
  budget,
  categories,
  currency,
}: BudgetDrilldownSheetProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  useEffect(() => {
    if (!open || !budget) return;

    const [y, m] = budget.month.split("-").map(Number);
    const startDate = `${budget.month}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${budget.month}-${String(lastDay).padStart(2, "0")}`;

    db.transactions
      .where("[categoryId+date]")
      .between(
        [budget.categoryId, startDate],
        [budget.categoryId, endDate],
        true,
        true
      )
      .filter((tx) => tx.type === "expense")
      .reverse()
      .toArray()
      .then(setTransactions);
  }, [open, budget]);

  if (!budget) return null;

  const cat = categories.find((c) => c.id === budget.categoryId);
  const percent = budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;
  const over = budget.spent > budget.limit;

  const barColor =
    percent >= 90 ? "#EF4444" : percent >= 70 ? "#F59E0B" : "#10B981";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center pointer-events-none p-2 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-[400px] bg-[var(--bg-primary)] rounded-[24px] sm:rounded-3xl max-h-[85dvh] sm:max-h-[80vh] flex flex-col shadow-2xl border border-[var(--border-color)] overflow-hidden pointer-events-auto"
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
                <div className="w-10 h-1 bg-[var(--border-color)] rounded-full" />
              </div>

            <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                {cat && (
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: cat.color + "20" }}
                  >
                    <DynamicIcon name={cat.icon} size={18} color={cat.color} />
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    {cat?.name ?? "Budget"}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {symbol}{budget.spent.toLocaleString()} / {symbol}{budget.limit.toLocaleString()} ({Math.round(percent)}%)
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex items-center justify-center" aria-label="Close">
                <X size={16} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-4 pb-4 flex-shrink-0">
              <div className="h-2.5 bg-[var(--bg-card)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: barColor }}
                />
              </div>
              {over && (
                <p className="text-xs text-[#EF4444] font-semibold mt-1.5">
                  ⚠️ Over by {symbol}{(budget.spent - budget.limit).toLocaleString()}
                </p>
              )}
            </div>

            {/* Transactions */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Contributing Transactions
              </p>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                  No transactions this month
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 bg-[var(--bg-card)] rounded-xl px-3 py-3"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: (cat?.color ?? "#94A3B8") + "20" }}
                    >
                      <DynamicIcon name={cat?.icon ?? "circle-ellipsis"} size={14} color={cat?.color ?? "#94A3B8"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{tx.title}</p>
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
