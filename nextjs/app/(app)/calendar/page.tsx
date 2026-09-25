"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  parseISO,
  getDaysInMonth,
  getDay,
  startOfMonth,
} from "date-fns";
import { db, Transaction, Category } from "@/lib/db";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { DynamicIcon } from "@/components/transaction/DynamicIcon";
import { AddTransactionSheet } from "@/components/transaction/AddTransactionSheet";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DaySummary {
  net: number;
  income: number;
  expense: number;
  count: number;
  dots: { color: string; name: string }[];
  transactions: Transaction[];
}

interface GridCell {
  day: number;
  dateStr: string;
  isCurrentMonth: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

function fmtAmt(n: number, sym: string): string {
  const abs = Math.abs(n);
  if (abs >= 100000) return `${sym}${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sym}${(abs / 1000).toFixed(1)}k`;
  return `${sym}${abs.toLocaleString()}`;
}

export default function CalendarPage() {
  const { defaultCurrency, selectedMonth, setSelectedMonth } = useSettingsStore();
  const { loadTransactions } = useTransactionStore();
  const { categories, loadCategories } = useCategoryStore();

  const currentDate = useMemo(() => parseISO(`${selectedMonth}-01`), [selectedMonth]);
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const symbol = CURRENCY_SYMBOLS[defaultCurrency] || defaultCurrency;

  const [daySummaries, setDaySummaries] = useState<Map<string, DaySummary>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addDefaultType, setAddDefaultType] = useState<"expense" | "income">("expense");

  // Category lookup map
  const catMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id!, c]));
  }, [categories]);

  // ── Load Month Data ─────────────────────────────────────────────────────────

  const loadMonthData = useCallback(async (month: string) => {
    const [y, m] = month.split("-").map(Number);
    const start = `${month}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${month}-${String(lastDay).padStart(2, "0")}`;

    const [txs, cats] = await Promise.all([
      db.transactions.where("date").between(start, end, true, true).toArray(),
      categories.length > 0 ? categories : db.categories.toArray(),
    ]);

    const localCatMap = new Map(cats.map((c) => [c.id!, c]));
    const map = new Map<string, DaySummary>();

    for (const tx of txs) {
      const prev = map.get(tx.date) ?? {
        net: 0,
        income: 0,
        expense: 0,
        count: 0,
        dots: [],
        transactions: [],
      };

      const cat = localCatMap.get(tx.categoryId);
      const color = cat?.color ?? "#94A3B8";
      const name = cat?.name ?? "Other";

      const hasDot = prev.dots.some((d) => d.color === color);
      const dots = hasDot ? prev.dots : [...prev.dots, { color, name }].slice(0, 3);

      map.set(tx.date, {
        net: prev.net + (tx.type === "income" ? tx.amount : -tx.amount),
        income: prev.income + (tx.type === "income" ? tx.amount : 0),
        expense: prev.expense + (tx.type === "expense" ? tx.amount : 0),
        count: prev.count + 1,
        dots,
        transactions: [tx, ...prev.transactions],
      });
    }

    setDaySummaries(map);
  }, [categories]);

  useEffect(() => {
    loadCategories();
    loadMonthData(selectedMonth);
    loadTransactions(selectedMonth);
  }, [selectedMonth, loadCategories, loadMonthData, loadTransactions]);

  // Keep selectedDate in sync with month if navigating away
  useEffect(() => {
    if (!selectedDate.startsWith(selectedMonth)) {
      setSelectedDate(`${selectedMonth}-01`);
    }
  }, [selectedMonth, selectedDate]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const navigateMonth = (dir: "prev" | "next") => {
    const newDate = dir === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    setSelectedMonth(format(newDate, "yyyy-MM"));
  };

  const jumpToToday = () => {
    const now = format(new Date(), "yyyy-MM");
    setSelectedMonth(now);
    setSelectedDate(todayStr);
  };

  // ── Build Google Calendar Month Grid ────────────────────────────────────────

  const firstDayOfWeek = getDay(startOfMonth(currentDate)); // 0=Sun
  const daysInMonth = getDaysInMonth(currentDate);
  const prevMonthDate = subMonths(currentDate, 1);
  const nextMonthDate = addMonths(currentDate, 1);
  const daysInPrevMonth = getDaysInMonth(prevMonthDate);
  const prevMonthStr = format(prevMonthDate, "yyyy-MM");
  const nextMonthStr = format(nextMonthDate, "yyyy-MM");

  const cells: GridCell[] = [];

  // Previous month padding
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      day: d,
      dateStr: `${prevMonthStr}-${String(d).padStart(2, "0")}`,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      dateStr: `${selectedMonth}-${String(d).padStart(2, "0")}`,
      isCurrentMonth: true,
    });
  }

  // Next month padding to complete 7-column rows
  const trailing = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= trailing; d++) {
    cells.push({
      day: d,
      dateStr: `${nextMonthStr}-${String(d).padStart(2, "0")}`,
      isCurrentMonth: false,
    });
  }

  // Group into 7-day weeks
  const weeks: GridCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  // Month-wide totals
  const totals = useMemo(() => {
    return Array.from(daySummaries.values()).reduce(
      (acc, s) => ({ income: acc.income + s.income, expense: acc.expense + s.expense }),
      { income: 0, expense: 0 }
    );
  }, [daySummaries]);

  const monthNet = totals.income - totals.expense;

  // Selected Day Details
  const selectedDaySummary = daySummaries.get(selectedDate);
  const selectedDayDateObj = useMemo(() => {
    try {
      return parseISO(selectedDate);
    } catch {
      return new Date();
    }
  }, [selectedDate]);

  const selectedDayFormatted = useMemo(() => {
    return format(selectedDayDateObj, "EEEE, d MMMM yyyy");
  }, [selectedDayDateObj]);

  const isTodaySelected = selectedDate === todayStr;

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* ── Google Calendar Header ── */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="px-4 pt-3 pb-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1]">
                <CalendarDays size={20} strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
                  {format(currentDate, "yyyy")}
                </p>
                <h1 className="text-xl font-bold text-[var(--text-primary)] leading-tight">
                  {format(currentDate, "MMMM")}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={jumpToToday}
                className="px-3 h-8 flex items-center justify-center rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] text-xs font-semibold text-[#6366F1] transition-colors"
              >
                Today
              </button>
              <div className="flex items-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-0.5">
                <button
                  onClick={() => navigateMonth("prev")}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-card-hover)] transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} className="text-[var(--text-secondary)]" />
                </button>
                <button
                  onClick={() => navigateMonth("next")}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-card-hover)] transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight size={16} className="text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>
          </div>

          {/* Month Summary Bar */}
          <div className="grid grid-cols-3 gap-2 py-1.5 px-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] text-center text-xs">
            <div className="flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span className="text-[var(--text-secondary)]">In:</span>
              <span className="font-semibold text-[#10B981]">{fmtAmt(totals.income, symbol)}</span>
            </div>
            <div className="flex items-center justify-center gap-1 border-x border-[var(--border-color)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
              <span className="text-[var(--text-secondary)]">Out:</span>
              <span className="font-semibold text-[#EF4444]">{fmtAmt(totals.expense, symbol)}</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-[var(--text-secondary)]">Net:</span>
              <span className={`font-semibold ${monthNet >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                {monthNet >= 0 ? "+" : ""}{fmtAmt(monthNet, symbol)}
              </span>
            </div>
          </div>
        </div>

        {/* Day-of-week Column Headers */}
        <div className="grid grid-cols-7 border-t border-[var(--border-color)] bg-[var(--bg-card)]/50 px-2">
          {DAY_HEADERS.map((d, i) => (
            <div
              key={i}
              className={`text-center text-[11px] font-semibold uppercase tracking-wider py-1.5 ${
                i === 0 ? "text-[#EF4444]" : i === 6 ? "text-[#0EA5E9]" : "text-[var(--text-secondary)]"
              }`}
            >
              {d}
            </div>
          ))}
        </div>
      </header>

      {/* ── Main Container ── */}
      <div className="px-2 pt-2 pb-12 space-y-4">

        {/* ── Google Calendar Month Grid ── */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
          {weeks.map((week, wi) => (
            <div
              key={wi}
              className={`grid grid-cols-7 ${wi < weeks.length - 1 ? "border-b border-[var(--border-color)]" : ""}`}
            >
              {week.map((cell, di) => {
                const summary = daySummaries.get(cell.dateStr);
                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === selectedDate;
                const isSunday = di === 0;
                const hasTx = !!summary && summary.count > 0;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(cell.dateStr);
                      if (!cell.isCurrentMonth) {
                        setSelectedMonth(cell.dateStr.slice(0, 7));
                      }
                    }}
                    className={`
                      relative flex flex-col items-center pt-1.5 pb-2 min-h-[64px] transition-all
                      ${di < 6 ? "border-r border-[var(--border-color)]" : ""}
                      ${isSelected ? "bg-[#6366F1]/10 ring-2 ring-inset ring-[#6366F1]" : "hover:bg-[var(--bg-card-hover)]"}
                      ${!cell.isCurrentMonth ? "bg-[var(--bg-primary)]/40 opacity-40" : ""}
                    `}
                  >
                    {/* Day number / Today circle */}
                    <div
                      className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold leading-none mb-1 transition-all
                        ${isToday ? "bg-[#6366F1] text-white shadow-sm font-bold scale-105" : ""}
                        ${isSelected && !isToday ? "bg-[#6366F1]/20 text-[#6366F1] font-bold" : ""}
                        ${!isToday && !isSelected ? (isSunday ? "text-[#EF4444]" : "text-[var(--text-primary)]") : ""}
                      `}
                    >
                      {cell.day}
                    </div>

                    {/* Google Calendar-style transaction pills & indicator dots */}
                    {hasTx ? (
                      <div className="w-full px-0.5 flex flex-col items-center gap-0.5 mt-auto">
                        {/* Compact amount pill */}
                        <div
                          className={`w-full max-w-[46px] text-center text-[9px] font-bold px-1 py-0.5 rounded leading-tight truncate ${
                            summary!.net >= 0
                              ? "bg-[#10B981]/15 text-[#10B981]"
                              : "bg-[#EF4444]/15 text-[#EF4444]"
                          }`}
                        >
                          {summary!.net >= 0 ? "+" : ""}{fmtAmt(summary!.net, symbol)}
                        </div>

                        {/* Category dots */}
                        <div className="flex items-center justify-center gap-0.5 h-1.5">
                          {summary!.dots.map((dot, i) => (
                            <span
                              key={i}
                              className="w-1 h-1 rounded-full flex-shrink-0"
                              style={{ backgroundColor: dot.color }}
                              title={dot.name}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Selected Day Detailed Info Panel ── */}
        <section className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-4 py-3 bg-[var(--bg-card-hover)]/40 border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1] flex-shrink-0">
                <Clock size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {selectedDayFormatted}
                  </h2>
                  {isTodaySelected && (
                    <span className="text-[10px] font-semibold bg-[#6366F1] text-white px-2 py-0.5 rounded-full flex-shrink-0">
                      Today
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {selectedDaySummary ? `${selectedDaySummary.count} transaction(s)` : "No entries"}
                </p>
              </div>
            </div>

            {/* Quick Add Button for this day */}
            <button
              onClick={() => {
                setAddDefaultType("expense");
                setShowAddSheet(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#6366F1] text-white text-xs font-semibold hover:bg-[#5558E6] transition-colors shadow-sm"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add</span>
            </button>
          </div>

          {/* Day Totals Summary */}
          {selectedDaySummary && selectedDaySummary.count > 0 && (
            <div className="grid grid-cols-3 divide-x divide-[var(--border-color)] border-b border-[var(--border-color)] bg-[var(--bg-primary)]/40">
              <div className="py-2.5 px-3 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-secondary)] mb-0.5">
                  <ArrowUpRight size={12} className="text-[#10B981]" />
                  <span>Income</span>
                </div>
                <p className="text-xs font-bold text-[#10B981]">
                  +{symbol}{selectedDaySummary.income.toLocaleString()}
                </p>
              </div>
              <div className="py-2.5 px-3 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-secondary)] mb-0.5">
                  <ArrowDownRight size={12} className="text-[#EF4444]" />
                  <span>Expense</span>
                </div>
                <p className="text-xs font-bold text-[#EF4444]">
                  -{symbol}{selectedDaySummary.expense.toLocaleString()}
                </p>
              </div>
              <div className="py-2.5 px-3 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-secondary)] mb-0.5">
                  <Wallet size={12} className="text-[#6366F1]" />
                  <span>Net</span>
                </div>
                <p
                  className={`text-xs font-bold ${
                    selectedDaySummary.net >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                  }`}
                >
                  {selectedDaySummary.net >= 0 ? "+" : ""}{symbol}{selectedDaySummary.net.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Transactions List for Selected Date */}
          <div className="p-3">
            {selectedDaySummary && selectedDaySummary.transactions.length > 0 ? (
              <div className="space-y-2">
                {selectedDaySummary.transactions.map((tx) => {
                  const cat = catMap.get(tx.categoryId);
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 hover:border-[#6366F1]/40 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: (cat?.color ?? "#94A3B8") + "20" }}
                      >
                        <DynamicIcon
                          name={cat?.icon ?? "circle-ellipsis"}
                          size={18}
                          color={cat?.color ?? "#94A3B8"}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {tx.title}
                          </p>
                          <span
                            className={`text-sm font-bold flex-shrink-0 ${
                              tx.type === "income" ? "text-[#10B981]" : "text-[#EF4444]"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "-"}{symbol}{tx.amount.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span className="font-medium text-[var(--text-primary)]/80">
                            {cat?.name ?? "Category"}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{tx.paymentMethod.replace("_", " ")}</span>
                          {tx.notes && (
                            <>
                              <span>•</span>
                              <span className="truncate italic max-w-[120px]">{tx.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-2 text-[var(--text-secondary)]">
                  <Sparkles size={22} className="opacity-50" />
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  No transactions recorded
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-3">
                  Nothing tracked for this date yet.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setAddDefaultType("expense");
                      setShowAddSheet(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#EF4444]/10 text-[#EF4444] text-xs font-semibold hover:bg-[#EF4444]/20 transition-colors"
                  >
                    + Add Expense
                  </button>
                  <button
                    onClick={() => {
                      setAddDefaultType("income");
                      setShowAddSheet(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#10B981]/10 text-[#10B981] text-xs font-semibold hover:bg-[#10B981]/20 transition-colors"
                  >
                    + Add Income
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Add Transaction Sheet (Prefilled with Selected Date) ── */}
      <AddTransactionSheet
        open={showAddSheet}
        onClose={() => {
          setShowAddSheet(false);
          loadMonthData(selectedMonth);
        }}
        defaultType={addDefaultType}
        categories={categories}
        currency={defaultCurrency}
        prefillDate={selectedDate}
      />
    </div>
  );
}
