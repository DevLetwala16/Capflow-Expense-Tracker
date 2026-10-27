"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Layers, Eye, EyeOff } from "lucide-react";
import { useSettingsStore, NumberingSystem } from "@/lib/store/settingsStore";

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

export function formatAmount(
  amount: number = 0,
  currency: string = "INR",
  isMasked: boolean = false,
  numberingSystem: NumberingSystem = "western"
): string {
  if (isMasked) return "••••••";
  const symbol = CURRENCY_SYMBOLS[currency] || currency + " ";
  const val = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(val);

  if (numberingSystem === "indian") {
    if (abs >= 10000000) return symbol + (val / 10000000).toFixed(2) + "Cr";
    if (abs >= 100000) return symbol + (val / 100000).toFixed(1) + "L";
    if (abs >= 1000) return symbol + (val / 1000).toFixed(1) + "K";
    return symbol + val.toLocaleString("en-IN");
  } else {
    if (abs >= 1000000) return symbol + (val / 1000000).toFixed(2) + "M";
    if (abs >= 1000) return symbol + (val / 1000).toFixed(1) + "K";
    return symbol + val.toLocaleString("en-US");
  }
}

interface BalanceCardProps {
  income?: number;
  expense?: number;
  /** Month-only net — still accepted but no longer shown as the 3rd stat */
  savings?: number;
  /** All-time cumulative balance (sum of every income − expense ever recorded) */
  cumulativeBalance?: number;
  spentPercent?: number;
  currency?: string;
  loading?: boolean;
  /** Previous month's total expense — used to compute %Δ pill on the Expense stat */
  prevMonthExpense?: number;
}

export function BalanceCard({
  income = 0,
  expense = 0,
  cumulativeBalance = 0,
  spentPercent = 0,
  currency = "INR",
  loading = false,
  prevMonthExpense,
}: BalanceCardProps) {
  const { balanceMasked: globalMasked, numberingSystem } = useSettingsStore();
  const [localUnmask, setLocalUnmask] = useState(false);
  const isMasked = globalMasked && !localUnmask;

  const safeSpent = Math.max(0, Math.min(100, Number.isFinite(spentPercent) ? spentPercent : 0));
  const safeIncome = Number.isFinite(income) ? income : 0;
  const safeExpense = Number.isFinite(expense) ? expense : 0;
  const safeCumulative = Number.isFinite(cumulativeBalance) ? cumulativeBalance : 0;

  const isNegative = safeCumulative < 0;

  // %Δ vs last month expense
  const hasExpenseDelta =
    prevMonthExpense !== undefined &&
    Number.isFinite(prevMonthExpense) &&
    prevMonthExpense > 0;
  const expenseDeltaPct = hasExpenseDelta
    ? Math.round(((safeExpense - prevMonthExpense!) / prevMonthExpense!) * 100)
    : null;

  return (
    <div
      className="rounded-2xl p-5 bg-gradient-to-br from-[#6366F1] to-[#38bdf8] shadow-xl shadow-indigo-500/25 overflow-hidden relative text-white"
    >
      {/* Background ambient decoration */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-black/10 blur-lg pointer-events-none" />

      {/* Stealth Eye Toggle (when masked globally or user wants to toggle) */}
      {globalMasked && (
        <button
          type="button"
          onClick={() => setLocalUnmask((v) => !v)}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white/90 transition-colors z-20 cursor-pointer"
          title={isMasked ? "Reveal amounts" : "Mask amounts"}
        >
          {isMasked ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}

      {/* 3-Column Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">

        {/* Income — this month */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
              <TrendingUp size={10} className="text-white" />
            </div>
            <span className="text-[10px] text-white/80 font-medium tracking-wide">Income</span>
          </div>
          <p suppressHydrationWarning className={`text-base font-bold text-white transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
            {formatAmount(safeIncome, currency, isMasked, numberingSystem)}
          </p>
          <p className="text-[9px] text-white/50 mt-0.5">This month</p>
        </div>

        {/* Expense — this month */}
        <div className="text-center border-x border-white/20 px-1">
          <div className="flex items-center justify-center gap-1 mb-1">
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
              <TrendingDown size={10} className="text-white" />
            </div>
            <span className="text-[10px] text-white/80 font-medium tracking-wide">Expense</span>
          </div>
          <p suppressHydrationWarning className={`text-base font-bold text-white transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
            {formatAmount(safeExpense, currency, isMasked, numberingSystem)}
          </p>
          {/* %Δ vs last month pill */}
          {expenseDeltaPct !== null ? (
            <span
              suppressHydrationWarning
              className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                expenseDeltaPct <= 0
                  ? "bg-emerald-400/30 text-emerald-200"
                  : "bg-rose-400/30 text-rose-200"
              }`}
            >
              {expenseDeltaPct > 0 ? "▲" : "▼"} {Math.abs(expenseDeltaPct)}%
            </span>
          ) : (
            <p suppressHydrationWarning className="text-[9px] text-white/50 mt-0.5">This month</p>
          )}
        </div>

        {/* Balance — cumulative all-time */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
              <Layers size={10} className="text-white" />
            </div>
            <span className="text-[10px] text-white/80 font-medium tracking-wide">Balance</span>
          </div>
          <p
            suppressHydrationWarning
            className={`text-base font-bold transition-opacity ${
              isNegative ? "text-rose-200" : "text-white"
            } ${loading ? "opacity-60" : "opacity-100"}`}
          >
            {isMasked ? "••••••" : (isNegative ? "-" : "") + formatAmount(Math.abs(safeCumulative), currency, false, numberingSystem)}
          </p>
          <p className="text-[9px] text-white/50 mt-0.5">All time</p>
        </div>
      </div>

      {/* Progress Bar — spent vs this month's income */}
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] text-white/80 font-medium">Spent of Month&apos;s Income</span>
          <span suppressHydrationWarning className="text-[10px] text-white font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
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
