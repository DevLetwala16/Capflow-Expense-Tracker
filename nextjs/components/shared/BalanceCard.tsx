"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + " ";
  if (amount >= 100000) return symbol + (amount / 100000).toFixed(1) + "L";
  if (amount >= 1000) return symbol + (amount / 1000).toFixed(1) + "K";
  return symbol + amount.toLocaleString("en-IN");
}

interface BalanceCardProps {
  income: number;
  expense: number;
  savings: number;
  spentPercent: number;
  currency: string;
  loading?: boolean;
}

export function BalanceCard({ income, expense, savings, spentPercent, currency, loading }: BalanceCardProps) {
  if (loading) {
    return <div className="h-40 skeleton rounded-2xl" />;
  }

  const progressColor =
    spentPercent > 90 ? "#EF4444" :
    spentPercent > 70 ? "#F59E0B" :
    "#10B981";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 bg-gradient-to-br from-[#6366F1] to-[#38bdf8] shadow-xl shadow-indigo-500/20 overflow-hidden relative"
    >
      {/* Background decoration */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp size={12} className="text-white/70" />
            <span className="text-[10px] text-white/70 font-medium">Income</span>
          </div>
          <motion.p
            key={income}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-base font-bold text-white"
          >
            {formatAmount(income, currency)}
          </motion.p>
        </div>

        <div className="text-center border-x border-white/20">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown size={12} className="text-white/70" />
            <span className="text-[10px] text-white/70 font-medium">Expense</span>
          </div>
          <motion.p
            key={expense}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-base font-bold text-white"
          >
            {formatAmount(expense, currency)}
          </motion.p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Minus size={12} className="text-white/70" />
            <span className="text-[10px] text-white/70 font-medium">Net</span>
          </div>
          <motion.p
            key={savings}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-base font-bold ${savings >= 0 ? "text-white" : "text-red-200"}`}
          >
            {formatAmount(savings, currency)}
          </motion.p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] text-white/70">Spent</span>
          <span className="text-[10px] text-white/70 font-semibold">{Math.round(spentPercent)}%</span>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${spentPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: spentPercent > 90 ? "#FCA5A5" : "rgba(255,255,255,0.85)" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
