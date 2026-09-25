"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Target, TrendingUp } from "lucide-react";
import { useBudgetStore } from "@/lib/store/budgetStore";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { db, Category, seedDefaultCategories } from "@/lib/db";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { AddBudgetSheet } from "@/components/budgets/AddBudgetSheet";
import { AddGoalSheet } from "@/components/budgets/AddGoalSheet";
import { BudgetDrilldownSheet } from "@/components/budgets/BudgetDrilldownSheet";
import { DynamicIcon } from "@/components/transaction/DynamicIcon";
import { format, parseISO } from "date-fns";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

// ─── Circular Progress Ring ───────────────────────────────────────────────────

function CircleRing({ percent, color, size = 52 }: { percent: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} stroke="var(--border-color)" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={6}
        stroke={color}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </svg>
  );
}

// ─── Add Funds Modal ──────────────────────────────────────────────────────────

function AddFundsModal({
  open,
  goalName,
  onClose,
  onAdd,
}: {
  open: boolean;
  goalName: string;
  onClose: () => void;
  onAdd: (amount: number) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[320px] bg-[var(--bg-card)] rounded-3xl p-6 shadow-2xl pointer-events-auto border border-[var(--border-color)]"
            >
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Add Funds</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">{goalName}</p>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Amount"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-3 text-lg font-bold text-[var(--text-primary)] outline-none focus:border-[#6366F1] text-center"
                autoFocus
              />
              <div className="flex gap-2 mt-4">
                <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--bg-primary)] text-[var(--text-secondary)] text-sm font-medium">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const amt = parseFloat(value);
                    if (amt > 0) { onAdd(amt); onClose(); setValue(""); }
                  }}
                  className="flex-1 py-3 rounded-2xl bg-[#10B981] text-white text-sm font-bold"
                >
                  Add
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const { defaultCurrency, selectedMonth } = useSettingsStore();
  const { transactions, loadTransactions } = useTransactionStore();
  const { budgets, goals, loadBudgets, loadGoals, deleteBudget, deleteGoal, addFundsToGoal } = useBudgetStore();
  const { categories, loadCategories } = useCategoryStore();

  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [drilldownBudget, setDrilldownBudget] = useState<{
    categoryId: number; limit: number; spent: number; month: string;
  } | null>(null);
  const [addFundsGoalId, setAddFundsGoalId] = useState<number | null>(null);

  const symbol = CURRENCY_SYMBOLS[defaultCurrency] || defaultCurrency;

  useEffect(() => {
    loadCategories();
    loadBudgets(selectedMonth);
    loadGoals();
    loadTransactions(selectedMonth);
  }, [selectedMonth, loadCategories, loadBudgets, loadGoals, loadTransactions]);

  const catMap = new Map(categories.map((c) => [c.id!, c]));

  // Compute live spend per budget
  const budgetsWithSpend = budgets.map((b) => {
    const spent = transactions
      .filter(
        (tx) =>
          tx.type === "expense" &&
          tx.categoryId === b.categoryId &&
          tx.date.startsWith(selectedMonth)
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { ...b, spent };
  });

  const addFundsGoal = goals.find((g) => g.id === addFundsGoalId);

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)] px-4 py-3">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Budgets & Goals</h1>
        <p className="text-xs text-[var(--text-secondary)]">{format(parseISO(`${selectedMonth}-01`), "MMMM yyyy")}</p>
      </header>

      <div className="px-4 pb-8 pt-4 space-y-6">

        {/* ── Budgets Section ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">This Month's Budgets</h2>
            <button
              onClick={() => setShowAddBudget(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#6366F1]/10 text-[#6366F1] text-xs font-semibold"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {budgetsWithSpend.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-8 text-center">
              <Target size={32} className="text-[var(--text-secondary)] mx-auto mb-3 opacity-50" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">No budgets yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Tap + Add to set a spending limit</p>
            </div>
          ) : (
            <div className="space-y-3">
              {budgetsWithSpend.map((budget) => {
                const cat = catMap.get(budget.categoryId);
                const percent = budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;
                const over = budget.spent > budget.limit;
                const barColor =
                  percent >= 90 ? "#EF4444" : percent >= 70 ? "#F59E0B" : "#10B981";
                const isPulsing = percent >= 90;

                return (
                  <motion.div
                    key={budget.id}
                    layout
                    className={`bg-[var(--bg-card)] rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                      isPulsing ? "border-[#EF4444]/60 animate-pulse" : "border-[var(--border-color)]"
                    }`}
                    onClick={() =>
                      setDrilldownBudget({
                        categoryId: budget.categoryId,
                        limit: budget.limit,
                        spent: budget.spent,
                        month: budget.month,
                      })
                    }
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Circle ring */}
                      <div className="relative flex-shrink-0">
                        <CircleRing percent={percent} color={barColor} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[9px] font-bold" style={{ color: barColor }}>
                            {Math.round(percent)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {cat && (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: cat.color + "20" }}
                            >
                              <DynamicIcon name={cat.icon} size={12} color={cat.color} />
                            </div>
                          )}
                          <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {cat?.name ?? "Category"}
                          </span>
                          {over && (
                            <span className="text-[10px] font-bold text-white bg-[#EF4444] rounded-full px-2 py-0.5 flex-shrink-0">
                              Over!
                            </span>
                          )}
                        </div>

                        {/* Bar */}
                        <div className="h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden mb-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: barColor }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--text-secondary)]">
                            {symbol}{budget.spent.toLocaleString()} / {symbol}{budget.limit.toLocaleString()}
                          </span>
                          {over && (
                            <span className="text-[10px] text-[#EF4444] font-semibold">
                              +{symbol}{(budget.spent - budget.limit).toLocaleString()} over
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (budget.id) deleteBudget(budget.id);
                        }}
                        className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors"
                        aria-label="Delete budget"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Goals Section ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Savings Goals</h2>
            <button
              onClick={() => setShowAddGoal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10B981]/10 text-[#10B981] text-xs font-semibold"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-8 text-center">
              <TrendingUp size={32} className="text-[var(--text-secondary)] mx-auto mb-3 opacity-50" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">No goals yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Create a savings goal to track progress</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => {
                const percent = goal.targetAmount > 0
                  ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100)
                  : 0;
                const daysLeft = Math.ceil(
                  (new Date(goal.targetDate).getTime() - Date.now()) / 86400000
                );

                return (
                  <motion.div
                    key={goal.id}
                    layout
                    className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: goal.color + "20" }}
                      >
                        <DynamicIcon name={goal.icon} size={20} color={goal.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                            {goal.name}
                          </p>
                          <button
                            onClick={() => { if (goal.id) deleteGoal(goal.id); }}
                            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors ml-2"
                            aria-label="Delete goal"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2">
                          <span>{symbol}{goal.savedAmount.toLocaleString()} saved</span>
                          <span className="font-semibold" style={{ color: goal.color }}>
                            {Math.round(percent)}%
                          </span>
                        </div>

                        <div className="h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden mb-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: goal.color }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--text-secondary)]">
                            Target: {symbol}{goal.targetAmount.toLocaleString()} ·{" "}
                            {daysLeft > 0 ? `${daysLeft}d left` : "Past due"}
                          </span>
                          <button
                            onClick={() => setAddFundsGoalId(goal.id!)}
                            className="text-xs font-bold px-3 py-1 rounded-xl text-white"
                            style={{ backgroundColor: goal.color }}
                          >
                            + Add Funds
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Sheets */}
      <AddBudgetSheet
        open={showAddBudget}
        onClose={() => setShowAddBudget(false)}
        categories={categories}
        month={selectedMonth}
      />
      <AddGoalSheet
        open={showAddGoal}
        onClose={() => setShowAddGoal(false)}
      />
      <BudgetDrilldownSheet
        open={!!drilldownBudget}
        onClose={() => setDrilldownBudget(null)}
        budget={drilldownBudget}
        categories={categories}
        currency={defaultCurrency}
      />
      <AddFundsModal
        open={!!addFundsGoalId}
        goalName={addFundsGoal?.name ?? ""}
        onClose={() => setAddFundsGoalId(null)}
        onAdd={(amount) => {
          if (addFundsGoalId) addFundsToGoal(addFundsGoalId, amount);
        }}
      />
    </div>
  );
}
