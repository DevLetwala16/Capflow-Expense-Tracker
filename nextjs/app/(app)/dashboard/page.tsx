"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Settings, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { db, seedDefaultCategories, Category } from "@/lib/db";
import { TransactionRow } from "@/components/transaction/TransactionRow";
import { WeeklyBarChart } from "@/components/shared/WeeklyBarChart";
import { AddTransactionSheet } from "@/components/transaction/AddTransactionSheet";
import { BalanceCard } from "@/components/shared/BalanceCard";
import Link from "next/link";
import Image from "next/image";

export default function DashboardPage() {
  const { loadTransactions, transactions, loading, recent, totalIncome, totalExpense, netSavings, weeklyTotals } = useTransactionStore();
  const { selectedMonth, setSelectedMonth, defaultCurrency } = useSettingsStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addType, setAddType] = useState<"expense" | "income">("expense");
  const [fabOpen, setFabOpen] = useState(false);

  const currentDate = parseISO(`${selectedMonth}-01`);

  useEffect(() => {
    seedDefaultCategories().then(() => {
      db.categories.orderBy("order").toArray().then(setCategories);
    });
    loadTransactions(selectedMonth);
  }, [selectedMonth, loadTransactions]);

  const navigateMonth = (dir: "prev" | "next") => {
    const newDate = dir === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    setSelectedMonth(format(newDate, "yyyy-MM"));
  };

  const income = totalIncome();
  const expense = totalExpense();
  const savings = netSavings();
  const spentPercent = income > 0 ? Math.min((expense / income) * 100, 100) : 0;
  const recentTxs = recent();
  const weekly = weeklyTotals();

  const openAdd = (type: "expense" | "income") => {
    setAddType(type);
    setFabOpen(false);
    setShowAddSheet(true);
  };

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src="/capflow-logo.png"
                alt="CapFlow"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Good day 👋</p>
              <h1 className="text-lg font-bold text-[var(--text-primary)] leading-none">CapFlow</h1>
            </div>
          </div>
          <Link href="/settings" aria-label="Settings">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6366F1] to-[#38bdf8] flex items-center justify-center">
              <Settings size={16} className="text-white" />
            </div>
          </Link>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-center gap-4 pb-3 px-4">
          <button
            onClick={() => navigateMonth("prev")}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} className="text-[var(--text-secondary)]" />
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)] min-w-[140px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <button
            onClick={() => navigateMonth("next")}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={18} className="text-[var(--text-secondary)]" />
          </button>
        </div>
      </header>

      <div className="px-4 pb-4 space-y-4">
        {/* Balance Overview Card */}
        <BalanceCard
          income={income}
          expense={expense}
          savings={savings}
          spentPercent={spentPercent}
          currency={defaultCurrency}
          loading={loading}
        />

        {/* Weekly Bar Chart */}
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Weekly Spending</h2>
          {loading ? (
            <div className="h-24 skeleton" />
          ) : (
            <WeeklyBarChart data={weekly} currency={defaultCurrency} />
          )}
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Transactions</h2>
            <Link href="/transactions" className="text-xs text-[#6366F1] font-medium">
              See All →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 skeleton rounded-xl" />
              ))}
            </div>
          ) : recentTxs.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-2xl p-8 text-center border border-[var(--border-color)]">
              <p className="text-4xl mb-3">💸</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">No transactions yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Tap the + button to add your first transaction
              </p>
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

      {/* FAB */}
      <AnimatePresence>
        {fabOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setFabOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-24 right-4 flex flex-col gap-2 z-50"
            >
              <button
                onClick={() => openAdd("income")}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#10B981] text-white rounded-2xl font-semibold text-sm shadow-lg"
              >
                <TrendingUp size={16} />
                Add Income
              </button>
              <button
                onClick={() => openAdd("expense")}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#EF4444] text-white rounded-2xl font-semibold text-sm shadow-lg"
              >
                <TrendingDown size={16} />
                Add Expense
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setFabOpen((o) => !o)}
        className="fixed bottom-[calc(var(--bottom-nav-h)+12px)] right-4 w-14 h-14 rounded-full bg-gradient-to-br from-[#6366F1] to-[#38bdf8] flex items-center justify-center shadow-xl shadow-indigo-500/30 z-50"
        aria-label="Add transaction"
      >
        <motion.div animate={{ rotate: fabOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus size={24} className="text-white" strokeWidth={2.5} />
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
