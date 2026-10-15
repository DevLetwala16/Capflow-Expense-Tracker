"use client";

import { useState, useRef, useEffect, memo } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Edit3, Trash2, Undo2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Transaction, Category } from "@/lib/db";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { CURRENCY_SYMBOLS, convertCurrency, useExchangeRateStore } from "@/lib/currency/exchangeRates";

const UNDO_DURATION_MS = 5000;

interface TransactionRowProps {
  transaction: Transaction;
  categories: Category[];
  currency: string;
  onEdit: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
}

export const TransactionRow = memo(function TransactionRow({
  transaction,
  categories,
  currency,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  // null = idle | "pending" = soft-deleted awaiting undo | "done" = fully deleted
  const [deleteState, setDeleteState] = useState<"idle" | "pending" | "done">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-80, 0], [1, 0]);
  const rates = useExchangeRateStore((s) => s.rates);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  const txCurrency = transaction.currency || currency;
  const isDiffCurrency = txCurrency.toUpperCase() !== currency.toUpperCase();
  const displayAmount = isDiffCurrency
    ? convertCurrency(transaction.amount, txCurrency, currency, rates)
    : transaction.amount;
  const origSymbol = CURRENCY_SYMBOLS[txCurrency] || txCurrency;

  const category = categories.find((c) => c.id === transaction.categoryId);

  // Clear timer on unmount to avoid calling setState on dead component
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleDelete = () => {
    // Optimistically hide the row and show undo toast for 5 seconds
    setDeleteState("pending");
    x.set(0); // snap swipe back

    timerRef.current = setTimeout(async () => {
      setDeleteState("done");
      await onDelete(transaction.id!);
    }, UNDO_DURATION_MS);
  };

  const handleUndo = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDeleteState("idle");
  };

  const paymentLabels: Record<string, string> = {
    cash: "Cash",
    credit_card: "Card",
    bank_transfer: "Bank",
    upi: "UPI",
  };

  // Fully deleted — unmount the row
  if (deleteState === "done") return null;

  // Soft-deleted — row is hidden but undo toast is visible
  if (deleteState === "pending") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30"
        role="alert"
        aria-live="polite"
      >
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-0.5 bg-[#EF4444]/40 rounded-b-xl" style={{ width: "100%" }}>
          <motion.div
            className="h-full bg-[#EF4444] rounded-b-xl origin-left"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: UNDO_DURATION_MS / 1000, ease: "linear" }}
          />
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <Trash2 size={15} className="text-[#EF4444] flex-shrink-0" />
          <p className="text-sm text-[var(--text-primary)] truncate">
            <span className="font-semibold">{transaction.title}</span>
            <span className="text-[var(--text-secondary)]"> deleted</span>
          </p>
        </div>

        <button
          onClick={handleUndo}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6366F1] bg-[#6366F1]/10 hover:bg-[#6366F1]/20 rounded-lg transition-colors flex-shrink-0"
          aria-label="Undo delete"
        >
          <Undo2 size={13} />
          Undo
        </button>
      </motion.div>
    );
  }

  // Normal state
  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Action buttons revealed on swipe */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 flex items-center gap-1 px-2"
        style={{ opacity: bgOpacity }}
      >
        <button
          onClick={() => transaction.id && onEdit(transaction.id)}
          className="w-10 h-10 rounded-xl bg-[#6366F1] flex items-center justify-center"
          aria-label="Edit transaction"
        >
          <Edit3 size={16} className="text-white" />
        </button>
        <button
          onClick={handleDelete}
          className="w-10 h-10 rounded-xl bg-[#EF4444] flex items-center justify-center"
          aria-label="Delete transaction"
        >
          <Trash2 size={16} className="text-white" />
        </button>
      </motion.div>

      {/* Main row */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -88, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        onClick={() => {
          if (Math.abs(x.get()) < 6 && transaction.id) {
            onEdit(transaction.id);
          }
        }}
        className="flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl cursor-pointer hover:border-[#6366F1]/50 transition-colors"
      >
        {/* Category icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: category ? category.color + "20" : "#6366F120" }}
        >
          {category ? (
            <DynamicIcon name={category.icon} size={18} color={category.color} />
          ) : (
            <span className="text-lg">💰</span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{transaction.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[var(--text-secondary)]">
              {format(parseISO(transaction.date), "MMM d")}
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded-full border border-[var(--border-color)]">
              {paymentLabels[transaction.paymentMethod] || transaction.paymentMethod}
            </span>
            {category && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: category.color + "20", color: category.color }}
              >
                {category.name}
              </span>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="text-right flex-shrink-0">
          <p
            suppressHydrationWarning
            className={`text-sm font-bold ${transaction.type === "income" ? "text-[#10B981]" : "text-[#EF4444]"}`}
          >
            {transaction.type === "income" ? "+" : "-"}
            {symbol}
            {displayAmount.toLocaleString()}
          </p>
          {isDiffCurrency && (
            <p suppressHydrationWarning className="text-[10px] text-[var(--text-secondary)] font-medium">
              ({origSymbol}
              {transaction.amount.toLocaleString()} {txCurrency})
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
});
