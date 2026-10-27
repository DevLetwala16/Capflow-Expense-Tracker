"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Lock,
  Calendar,
  Eye,
  EyeOff,
  ArrowRight,
  TrendingDown,
  X,
  Check,
} from "lucide-react";
import { parseISO, getDaysInMonth, format } from "date-fns";
import { useSettingsStore, NumberingSystem } from "@/lib/store/settingsStore";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useBudgetStore } from "@/lib/store/budgetStore";
import { useEMIStore } from "@/lib/store/emiStore";
import { formatAmount, CURRENCY_SYMBOLS } from "@/components/shared/BalanceCard";

interface SafeToSpendCardProps {
  selectedMonth: string;
  currency?: string;
}

export function SafeToSpendCard({
  selectedMonth,
  currency = "INR",
}: SafeToSpendCardProps) {
  const {
    balanceMasked: globalMasked,
    numberingSystem,
    monthlySpendingBudget,
    setMonthlySpendingBudget,
  } = useSettingsStore();

  const { transactions, totalExpense, totalIncome } = useTransactionStore();
  const { budgets } = useBudgetStore();
  const { totalMonthlyEMIBurden } = useEMIStore();

  const [localUnmask, setLocalUnmask] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customBudgetInput, setCustomBudgetInput] = useState("");

  const isMasked = globalMasked && !localUnmask;

  // ── Date Computations ──────────────────────────────────────────────────────
  const now = new Date();
  const currentMonthStr = format(now, "yyyy-MM");
  const isCurrentMonth = selectedMonth === currentMonthStr;

  const selectedDate = useMemo(() => {
    try {
      return parseISO(`${selectedMonth}-01`);
    } catch {
      return now;
    }
  }, [selectedMonth]);

  const totalDaysInMonth = getDaysInMonth(selectedDate);
  const todayDateNum = now.getDate();

  // Days remaining in this month (including today)
  const daysRemaining = useMemo(() => {
    if (!isCurrentMonth) {
      // If historical month, days remaining is 1 for display purposes
      return 1;
    }
    return Math.max(1, totalDaysInMonth - todayDateNum + 1);
  }, [isCurrentMonth, totalDaysInMonth, todayDateNum]);

  // ── Budget & Expense Computations ──────────────────────────────────────────
  const categoryBudgetSum = useMemo(() => {
    return budgets.reduce((sum, b) => sum + (b.limit || 0), 0);
  }, [budgets]);

  const income = totalIncome();
  const totalMonthExpense = totalExpense();

  // Effective base budget (Priority: manual target -> sum of category budgets -> income)
  const effectiveBaseBudget = useMemo(() => {
    if (monthlySpendingBudget && monthlySpendingBudget > 0) {
      return monthlySpendingBudget;
    }
    if (categoryBudgetSum > 0) {
      return categoryBudgetSum;
    }
    if (income > 0) {
      return income;
    }
    return 0;
  }, [monthlySpendingBudget, categoryBudgetSum, income]);

  // Total committed EMIs for the month
  const totalEMIs = useMemo(() => {
    return totalMonthlyEMIBurden ? totalMonthlyEMIBurden() : 0;
  }, [totalMonthlyEMIBurden]);

  // Today's specific expenses
  const todayStr = format(now, "yyyy-MM-dd");
  const todayExpenses = useMemo(() => {
    if (!isCurrentMonth) return 0;
    return transactions
      .filter((tx) => tx.type === "expense" && tx.date === todayStr)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [isCurrentMonth, transactions, todayStr]);

  // Expenses recorded in this month prior to today
  const expensesBeforeToday = useMemo(() => {
    return Math.max(0, totalMonthExpense - todayExpenses);
  }, [totalMonthExpense, todayExpenses]);

  // Total discretionary pool remaining for today + future days
  const spendablePoolRemaining = useMemo(() => {
    return Math.max(0, effectiveBaseBudget - totalEMIs - expensesBeforeToday);
  }, [effectiveBaseBudget, totalEMIs, expensesBeforeToday]);

  // Today's starting allowance
  const todayStartingAllowance = useMemo(() => {
    if (daysRemaining <= 0 || spendablePoolRemaining <= 0) return 0;
    return spendablePoolRemaining / daysRemaining;
  }, [spendablePoolRemaining, daysRemaining]);

  // Today's remaining allowance after what was spent today
  const todayRemaining = todayStartingAllowance - todayExpenses;

  // Tomorrow's projected allowance if no further spending occurs today
  const poolLeftForTomorrow = Math.max(0, spendablePoolRemaining - todayExpenses);
  const daysLeftTomorrow = Math.max(1, daysRemaining - 1);
  const tomorrowProjected =
    daysRemaining > 1 ? poolLeftForTomorrow / daysLeftTomorrow : 0;

  // Percentage of today's allowance spent
  const percentSpentToday = useMemo(() => {
    if (todayStartingAllowance <= 0) return todayExpenses > 0 ? 100 : 0;
    return Math.min(100, Math.max(0, Math.round((todayExpenses / todayStartingAllowance) * 100)));
  }, [todayStartingAllowance, todayExpenses]);

  // Ring status color
  const statusColor = useMemo(() => {
    if (todayRemaining < 0) return "#EF4444"; // overspent today
    if (percentSpentToday >= 80) return "#F59E0B"; // warning / close to limit
    return "#10B981"; // safe & healthy
  }, [todayRemaining, percentSpentToday]);

  // Handle saving custom monthly target
  const handleSaveBudget = (amount: number) => {
    setMonthlySpendingBudget(amount);
    setShowConfigModal(false);
  };

  // If no budget is set at all, show friendly setup state
  if (effectiveBaseBudget <= 0) {
    return (
      <>
        <div className="relative overflow-hidden bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)] shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center flex-shrink-0">
              <SlidersHorizontal size={16} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Safe to Spend
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Know what you can spend daily while keeping budgets and EMIs protected.
              </p>
              <button
                onClick={() => {
                  setCustomBudgetInput(income > 0 ? String(income) : "30000");
                  setShowConfigModal(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                <SlidersHorizontal size={13} />
                <span>Set Monthly Target</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal */}
        <ConfigureBudgetModal
          open={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          currency={currency}
          suggestedIncome={income}
          categoryBudgetSum={categoryBudgetSum}
          currentBudget={effectiveBaseBudget}
          onSave={handleSaveBudget}
        />
      </>
    );
  }

  // Compact Ring geometry
  const ringSize = 92;
  const strokeWidth = 7;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percentSpentToday / 100);

  return (
    <>
      <div className="relative overflow-hidden bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm transition-all hover:border-[var(--border-color-hover)]">
        {/* Subtle ambient glow matching health status */}
        <div
          className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: statusColor }}
        />

        {/* ── Top Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Safe to Spend
              </h2>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Daily spending allowance
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Target button */}
            <button
              onClick={() => {
                setCustomBudgetInput(String(effectiveBaseBudget));
                setShowConfigModal(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-primary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors"
              title="Edit monthly budget target"
            >
              <SlidersHorizontal size={12} />
              <span>Target</span>
            </button>

            {/* Mask / Unmask Toggle */}
            <button
              onClick={() => setLocalUnmask(!localUnmask)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] bg-[var(--bg-primary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-colors"
              aria-label={isMasked ? "Reveal balance" : "Hide balance"}
            >
              {isMasked ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        {/* ── Main Gauge Content ─────────────────────────────────────────── */}
        <div className="px-3.5 py-2 flex items-center justify-between gap-3">
          {/* Compact Circular SVG Ring */}
          <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} className="-rotate-90">
              {/* Background Track */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-[var(--border-color)] opacity-40"
              />
              {/* Progress Arc */}
              <motion.circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                stroke={statusColor}
                style={{ strokeDasharray: circumference }}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </svg>

            {/* Center Stat Inside Ring */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1">
              <span className="text-[8px] uppercase font-semibold text-[var(--text-secondary)] tracking-wider">
                Today
              </span>
              <span
                className="text-xs sm:text-sm font-bold leading-tight tracking-tight"
                style={{ color: statusColor }}
              >
                {todayRemaining < 0
                  ? `-${formatAmount(Math.abs(todayRemaining), currency, isMasked, numberingSystem)}`
                  : formatAmount(todayRemaining, currency, isMasked, numberingSystem)}
              </span>
              <span className="text-[8px] text-[var(--text-secondary)] font-medium">
                {todayRemaining < 0 ? "Overspent" : "Available"}
              </span>
            </div>
          </div>

          {/* Right Side Info Block */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Status & Short Info */}
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {todayRemaining >= 0 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                    <ShieldCheck size={10} />
                    <span>Safe</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
                    <AlertTriangle size={10} />
                    <span>Overspent</span>
                  </span>
                )}

                <span className="text-[10px] text-[var(--text-secondary)] font-medium truncate">
                  {formatAmount(todayExpenses, currency, isMasked, numberingSystem)} spent today
                </span>
              </div>

              {/* Short 1-line explainer */}
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-1 truncate">
                {todayRemaining >= 0 ? (
                  <>
                    <span className="text-[var(--text-primary)] font-semibold truncate">
                      Target: {formatAmount(todayStartingAllowance, currency, isMasked, numberingSystem)}
                    </span>
                    <span className="text-[var(--text-secondary)]">• Rolls over</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#EF4444] font-semibold truncate">
                      Over by {formatAmount(Math.abs(todayRemaining), currency, isMasked, numberingSystem)}
                    </span>
                    <span className="text-[var(--text-secondary)]">• Auto-balanced</span>
                  </>
                )}
              </p>
            </div>

            {/* Quick Metrics Pills */}
            <div className="grid grid-cols-3 gap-1 pt-0.5">
              <div className="bg-[var(--bg-primary)] py-1 px-1.5 rounded-lg border border-[var(--border-color)] text-center">
                <div className="flex items-center justify-center gap-1 text-[9px] text-[var(--text-secondary)]">
                  <Calendar size={10} />
                  <span>Days Left</span>
                </div>
                <p className="text-[11px] font-semibold text-[var(--text-primary)] leading-tight">
                  {daysRemaining}d
                </p>
              </div>

              <div className="bg-[var(--bg-primary)] py-1 px-1.5 rounded-lg border border-[var(--border-color)] text-center">
                <div className="flex items-center justify-center gap-1 text-[9px] text-[var(--text-secondary)]">
                  <Lock size={10} />
                  <span>EMIs</span>
                </div>
                <p className="text-[11px] font-semibold text-[#6366F1] leading-tight truncate">
                  {formatAmount(totalEMIs, currency, isMasked, numberingSystem)}
                </p>
              </div>

              <div className="bg-[var(--bg-primary)] py-1 px-1.5 rounded-lg border border-[var(--border-color)] text-center">
                <div className="flex items-center justify-center gap-1 text-[9px] text-[var(--text-secondary)]">
                  <ArrowRight size={10} />
                  <span>Tomorrow</span>
                </div>
                <p className="text-[11px] font-semibold text-[var(--text-primary)] leading-tight truncate">
                  {daysRemaining > 1
                    ? formatAmount(tomorrowProjected, currency, isMasked, numberingSystem)
                    : "End"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Expandable Math Breakdown Toggle ───────────────────────────── */}
        <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)]/50">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <span className="flex items-center gap-1">
              <Info size={11} className="text-[#6366F1]" />
              <span>Calculation breakdown</span>
            </span>
            {showBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <AnimatePresence>
            {showBreakdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden px-3.5 pb-2 pt-0.5 text-[11px] space-y-1"
              >
                <div className="flex justify-between py-0.5 border-b border-[var(--border-color)]/60 text-[var(--text-secondary)]">
                  <span>Monthly Budget:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatAmount(effectiveBaseBudget, currency, isMasked, numberingSystem)}
                  </span>
                </div>

                {totalEMIs > 0 && (
                  <div className="flex justify-between py-0.5 border-b border-[var(--border-color)]/60 text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Lock size={10} className="text-[#6366F1]" />
                      <span>Locked EMIs:</span>
                    </span>
                    <span className="font-semibold text-[#EF4444]">
                      -{formatAmount(totalEMIs, currency, isMasked, numberingSystem)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-0.5 border-b border-[var(--border-color)]/60 text-[var(--text-secondary)]">
                  <span>Spent Earlier:</span>
                  <span className="font-semibold text-[#EF4444]">
                    -{formatAmount(expensesBeforeToday, currency, isMasked, numberingSystem)}
                  </span>
                </div>

                <div className="flex justify-between py-0.5 border-b border-[var(--border-color)]/60 font-medium text-[var(--text-primary)]">
                  <span>Available Pool:</span>
                  <span className="font-bold text-[#10B981]">
                    {formatAmount(spendablePoolRemaining, currency, isMasked, numberingSystem)}
                  </span>
                </div>

                <div className="flex justify-between py-1 bg-[#6366F1]/5 px-2 rounded-md text-[var(--text-primary)] font-bold">
                  <span>Daily Target ({daysRemaining}d left):</span>
                  <span className="text-[#6366F1]">
                    {formatAmount(todayStartingAllowance, currency, isMasked, numberingSystem)} / day
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Target Configuration Modal ───────────────────────────────────── */}
      <ConfigureBudgetModal
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        currency={currency}
        suggestedIncome={income}
        categoryBudgetSum={categoryBudgetSum}
        currentBudget={effectiveBaseBudget}
        onSave={handleSaveBudget}
      />
    </>
  );
}

// ─── Modal to configure Monthly Spending Target ──────────────────────────────

interface ConfigureBudgetModalProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  suggestedIncome: number;
  categoryBudgetSum: number;
  currentBudget: number;
  onSave: (amount: number) => void;
}

function ConfigureBudgetModal({
  open,
  onClose,
  currency,
  suggestedIncome,
  categoryBudgetSum,
  currentBudget,
  onSave,
}: ConfigureBudgetModalProps) {
  const [val, setVal] = useState(currentBudget > 0 ? String(currentBudget) : "");
  const symbol = CURRENCY_SYMBOLS[currency] || currency + " ";

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-3xl p-5 border border-[var(--border-color)] shadow-2xl z-10"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center">
                <SlidersHorizontal size={17} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Monthly Spending Target
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
            >
              <X size={15} />
            </button>
          </div>

          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Set your target discretionary spending budget for this month. CapFlow will divide it across days, reserve your EMI commitments, and calculate your daily safe-to-spend allowance.
          </p>

          <div className="relative mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-[var(--text-secondary)]">
              {symbol}
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 30000"
              value={val}
              onChange={(e) => setVal(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full pl-8 pr-3 py-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-lg font-bold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
              autoFocus
            />
          </div>

          {/* Preset Suggestions */}
          {(suggestedIncome > 0 || categoryBudgetSum > 0) && (
            <div className="mb-4 space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                Quick Presets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedIncome > 0 && (
                  <button
                    type="button"
                    onClick={() => setVal(String(suggestedIncome))}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[#6366F1] text-[var(--text-secondary)] hover:text-[#6366F1] transition-colors"
                  >
                    Match Income: {symbol}{suggestedIncome.toLocaleString()}
                  </button>
                )}
                {categoryBudgetSum > 0 && (
                  <button
                    type="button"
                    onClick={() => setVal(String(categoryBudgetSum))}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[#6366F1] text-[var(--text-secondary)] hover:text-[#6366F1] transition-colors"
                  >
                    Category Budgets: {symbol}{categoryBudgetSum.toLocaleString()}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[var(--bg-primary)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--border-color)]/40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const num = parseFloat(val);
                if (num > 0) {
                  onSave(num);
                }
              }}
              className="flex-1 py-2.5 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#5558E6] transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Check size={14} />
              <span>Save Target</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
