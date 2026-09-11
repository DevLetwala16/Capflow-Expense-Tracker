"use client";

import { useState } from "react";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { Edit3, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Transaction, Category } from "@/lib/db";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

interface TransactionRowProps {
  transaction: Transaction;
  categories: Category[];
  currency: string;
  onEdit: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
}

export function TransactionRow({ transaction, categories, currency, onEdit, onDelete }: TransactionRowProps) {
  const [deleting, setDeleting] = useState(false);
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-80, 0], [1, 0]);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  const category = categories.find((c) => c.id === transaction.categoryId);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(transaction.id!);
  };

  if (deleting) return null;

  const paymentLabels: Record<string, string> = {
    cash: "Cash", credit_card: "Card", bank_transfer: "Bank", upi: "UPI",
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Action buttons */}
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
        className="flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl cursor-grab active:cursor-grabbing"
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
          <p className={`text-sm font-bold ${transaction.type === "income" ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {transaction.type === "income" ? "+" : "-"}{symbol}
            {transaction.amount.toLocaleString("en-IN")}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
