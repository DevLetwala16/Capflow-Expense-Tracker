"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ReceiptText,
} from "lucide-react";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { BalanceCard } from "@/components/shared/BalanceCard";
import { WeeklyBarChart } from "@/components/shared/WeeklyBarChart";
import { TransactionRow } from "@/components/transaction/TransactionRow";
import { AddTransactionSheet } from "@/components/transaction/AddTransactionSheet";

export default function DashboardPage() {
  const {
    transactions,
    loading,
    totalIncome,
    totalExpense,
    netSavings,
    recent,
    weeklyTotals,
  } = useTransactionStore();

  const { defaultCurrency, selectedMonth, setSelectedMonth } = useSettingsStore();
  const { categories } = useCategoryStore();

  const [fabOpen, setFabOpen] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addType, setAddType] = useState<"expense" | "income">("expense");

  const currentDate = useMemo(() => parseISO(`${selectedMonth}-01`), [selectedMonth]);

  const income = totalIncome();
  const expense = totalExpense();
  const savings = netSavings();
  const recentTxs = recent();
  const weekly = weeklyTotals();
  const spentPercent = income > 0 ? Math.min(Math.round((expense / income) * 100), 100) : 0;

  const navigateMonth = (dir: "prev" | "next") => {
    const newDate = dir === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    setSelectedMonth(format(newDate, "yyyy-MM"));
  };

  const handleOpenAdd = (type: "expense" | "income") => {
    setAddType(type);
    setFabOpen(false);
    setShowAddSheet(true);
  };

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* ── Sticky Header (Same exact buttons, icons, and month selector) ── */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 border border-[var(--border-color)] flex items-center justify-center p-0.5">
              <Image
                src="/capflow-logo.png"
                alt="CapFlow"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-[var(--text-secondary)] font-medium">CapFlow</p>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              </div>
              <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Overview</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Add Button in Header */}
            <button
              onClick={() => handleOpenAdd("expense")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#6366F1] text-white text-xs font-semibold hover:bg-[#5558E6] transition-colors shadow-sm"
              aria-label="Add transaction"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Add</span>
            </button>

            {/* Settings Link */}
            <Link href="/settings" aria-label="Settings">
              <div className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors">
                <Settings size={15} className="text-[var(--text-secondary)]" />
              </div>
            </Link>
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-center gap-3 pb-3 px-4">
          <button
            onClick={() => navigateMonth("prev")}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} className="text-[var(--text-secondary)]" />
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)] min-w-[130px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <button
            onClick={() => navigateMonth("next")}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={16} className="text-[var(--text-secondary)]" />
          </button>
        </div>
      </header>

      {/* ── Main Content: 1 column on phone, 2-column layout on laptop/PC, with same exact cards, buttons, fonts, and graph ── */}
      <div className="px-4 pb-20 pt-3 md:pb-8 md:pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          {/* Left Column on Laptop (Balance, Shortcuts, Weekly Graph) */}
          <div className="md:col-span-7 lg:col-span-7 space-y-4">
            {/* Balance Overview Card */}
            <div id="tour-balance-card">
              <BalanceCard
                income={income}
                expense={expense}
                savings={savings}
                spentPercent={spentPercent}
                currency={defaultCurrency}
                loading={loading}
              />
            </div>

            {/* Quick Action Shortcuts (Exact same buttons and fonts) */}
            <div id="tour-quick-actions" className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleOpenAdd("expense")}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 hover:bg-[#EF4444]/15 transition-all text-xs font-semibold text-[#EF4444]"
              >
                <ArrowDownRight size={15} />
                <span>Add Expense</span>
              </button>
              <button
                onClick={() => handleOpenAdd("income")}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 hover:bg-[#10B981]/15 transition-all text-xs font-semibold text-[#10B981]"
              >
                <ArrowUpRight size={15} />
                <span>Add Income</span>
              </button>
            </div>

            {/* Weekly Bar Chart (Exact same graph, card, fonts) */}
            <div id="tour-weekly-chart" className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Weekly Spending</h2>
                <span className="text-xs text-[var(--text-secondary)]">Last 7 days</span>
              </div>
              {loading ? (
                <div className="h-24 skeleton rounded-xl" />
              ) : (
                <WeeklyBarChart data={weekly} currency={defaultCurrency} />
              )}
            </div>
          </div>

          {/* Right Column on Laptop (Recent Transactions) */}
          <div className="md:col-span-5 lg:col-span-5">
            {/* Recent Transactions (Exact same section, link, rows) */}
            <div id="tour-transactions" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Transactions</h2>
                <Link href="/calendar" className="text-xs text-[#6366F1] font-semibold hover:underline">
                  View Calendar →
                </Link>
              </div>

              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 skeleton rounded-xl" />
                  ))}
                </div>
              ) : recentTxs.length === 0 ? (
                <div className="bg-[var(--bg-card)] rounded-2xl p-7 text-center border border-[var(--border-color)]">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-3 text-[var(--text-secondary)]">
                    <ReceiptText size={24} className="opacity-50" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">No transactions yet</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
                    Start tracking by recording your first transaction.
                  </p>
                  <button
                    onClick={() => handleOpenAdd("expense")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-semibold hover:bg-[#5558E6] transition-colors shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Add Transaction</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTxs.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      transaction={tx}
                      categories={categories}
                      currency={defaultCurrency}
                      onEdit={() => {}}
                      onDelete={async (id) => {
                        await useTransactionStore.getState().deleteTransaction(id);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Position-fixed FAB (Device-aware: above mobile bottom nav on phone, or bottom corner on laptop) ── */}
      <AnimatePresence>
        {fabOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[65] backdrop-blur-[2px]"
              onClick={() => setFabOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="fixed flex flex-col gap-2 z-[70] bottom-[calc(var(--bottom-nav-h)+84px)] md:bottom-28 right-5 md:right-8"
            >
              <button
                onClick={() => handleOpenAdd("expense")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#EF4444] text-white text-xs font-bold shadow-xl hover:bg-[#DC2626] transition-transform active:scale-95"
              >
                <ArrowDownRight size={15} />
                <span>Expense</span>
              </button>
              <button
                onClick={() => handleOpenAdd("income")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#10B981] text-white text-xs font-bold shadow-xl hover:bg-[#059669] transition-transform active:scale-95"
              >
                <ArrowUpRight size={15} />
                <span>Income</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        id="tour-fab"
        whileTap={{ scale: 0.92 }}
        onClick={() => setFabOpen((o) => !o)}
        className="fixed rounded-full bg-gradient-to-br from-[#6366F1] to-[#38bdf8] flex items-center justify-center shadow-lg shadow-indigo-500/30 z-[70] text-white bottom-[calc(var(--bottom-nav-h)+20px)] md:bottom-8 right-5 md:right-8"
        style={{
          width: "52px",
          height: "52px",
        }}
        aria-label="Add transaction"
      >
        <motion.div animate={{ rotate: fabOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus size={22} className="text-white" strokeWidth={2.5} />
        </motion.div>
      </motion.button>

      {/* Add Transaction Sheet */}
      <AddTransactionSheet
        open={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        defaultType={addType}
        categories={categories}
        currency={defaultCurrency}
      />
    </div>
  );
}
