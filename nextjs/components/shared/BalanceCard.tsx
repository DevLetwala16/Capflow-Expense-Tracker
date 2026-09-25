"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

function formatAmount(amount: number = 0, currency: string = "INR"): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + " ";
  const val = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(val);

  if (abs >= 100000) return symbol + (val / 100000).toFixed(1) + "L";
  if (abs >= 1000) return symbol + (val / 1000).toFixed(1) + "K";
  return symbol + val.toLocaleString("en-IN");
}

interface BalanceCardProps {
  income?: number;
  expense?: number;
  savings?: number;
  spentPercent?: number;
  currency?: string;
  loading?: boolean;
}

export function BalanceCard({
  income = 0,
  expense = 0,
  savings = 0,
  spentPercent = 0,
  currency = "INR",
  loading = false,
}: BalanceCardProps) {
  const safeSpent = Math.max(0, Math.min(100, Number.isFinite(spentPercent) ? spentPercent : 0));
  const safeIncome = Number.isFinite(income) ? income : 0;
  const safeExpense = Number.isFinite(expense) ? expense : 0;
  const safeSavings = Number.isFinite(savings) ? savings : safeIncome - safeExpense;

  return (
    <div
      className="rounded-2xl p-5 bg-gradient-to-br from-[#6366F1] to-[#38bdf8] shadow-xl shadow-indigo-500/25 overflow-hidden relative text-white"
    >
      {/* Background ambient decoration */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-black/10 blur-lg pointer-events-none" />

      {/* 3-Column Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
        {/* Income */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
              <TrendingUp size={10} className="text-white" />
            </div>
            <span className="text-[10px] text-white/80 font-medium tracking-wide">Income</span>
          </div>
          <p className={`text-base font-bold text-white transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
            {formatAmount(safeIncome, currency)}
          </p>
        </div>

        {/* Expense */}
        <div className="text-center border-x border-white/20 px-1">
          <div className="flex items-center justify-center gap-1 mb-1">
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
              <TrendingDown size={10} className="text-white" />
            </div>
            <span className="text-[10px] text-white/80 font-medium tracking-wide">Expense</span>
          </div>
          <p className={`text-base font-bold text-white transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
            {formatAmount(safeExpense, currency)}
          </p>
        </div>

        {/* Net */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
              <Wallet size={10} className="text-white" />
            </div>
            <span className="text-[10px] text-white/80 font-medium tracking-wide">Net</span>
          </div>
          <p
            className={`text-base font-bold transition-opacity ${
              safeSavings >= 0 ? "text-white" : "text-rose-200"
            } ${loading ? "opacity-60" : "opacity-100"}`}
          >
            {safeSavings >= 0 ? "" : "-"}{formatAmount(Math.abs(safeSavings), currency)}
          </p>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] text-white/80 font-medium">Spent of Income</span>
          <span className="text-[10px] text-white font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
            {Math.round(safeSpent)}%
          </span>
        </div>
        <div className="h-2 bg-black/20 rounded-full overflow-hidden p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${safeSpent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              backgroundColor: safeSpent > 90 ? "#FDA4AF" : safeSpent > 70 ? "#FDE047" : "#FFFFFF",
            }}
          />
        </div>
      </div>
    </div>
  );
}
