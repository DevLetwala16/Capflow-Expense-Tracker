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
import { useCategoryStore } from "@/lib/store/categoryStore";
import { useAuthStore } from "@/lib/store/authStore";
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
  if (abs >= 100000) return `${sym}${(n / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sym}${(n / 1000).toFixed(1)}k`;
  return `${sym}${Math.round(n).toLocaleString()}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { defaultCurrency, selectedMonth, setSelectedMonth } = useSettingsStore();
  const { categories } = useCategoryStore();
  const { user } = useAuthStore();

  const symbol = CURRENCY_SYMBOLS[defaultCurrency] || defaultCurrency;

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addDefaultType, setAddDefaultType] = useState<"expense" | "income">("expense");

  const currentDate = useMemo(() => parseISO(`${selectedMonth}-01`), [selectedMonth]);

  const loadMonthData = useCallback(
    async (month: string, userId: string) => {
      setLoading(true);
      try {
        const [y, m] = month.split("-").map(Number);
        const startDate = `${month}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

        const txs = await db.transactions
          .where("[userId+date]")
          .between([userId, startDate], [userId, endDate], true, true)
          .toArray();

        setMonthTransactions(txs);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!user?.id) return;
    loadMonthData(selectedMonth, user.id);
  }, [selectedMonth, user, loadMonthData]);

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id!, c])),
    [categories]
  );

  const daySummaries = useMemo(() => {
    const map = new Map<string, DaySummary>();
    for (const tx of monthTransactions) {
      const cur = map.get(tx.date) ?? {
        net: 0,
        income: 0,
        expense: 0,
        count: 0,
        dots: [],
        transactions: [],
      };
      if (tx.type === "income") {
        cur.income += tx.amount;
        cur.net += tx.amount;
      } else {
        cur.expense += tx.amount;
        cur.net -= tx.amount;
      }
      cur.count += 1;
      cur.transactions.push(tx);

      const cat = catMap.get(tx.categoryId);
      const dotColor = cat?.color ?? "#94A3B8";
      if (!cur.dots.some((d) => d.color === dotColor) && cur.dots.length < 3) {
        cur.dots.push({ color: dotColor, name: cat?.name ?? "" });
      }
      map.set(tx.date, cur);
    }
    return map;
  }, [monthTransactions, catMap]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of monthTransactions) {
      if (tx.type === "income") income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense };
  }, [monthTransactions]);

  const monthNet = totals.income - totals.expense;

  const weeks = useMemo<GridCell[][]>(() => {
    const totalDays = getDaysInMonth(currentDate);
    const firstDow = getDay(startOfMonth(currentDate));

    const prevMonthDate = subMonths(currentDate, 1);
    const prevMonthTotalDays = getDaysInMonth(prevMonthDate);
    const prevMonthPrefix = format(prevMonthDate, "yyyy-MM");

    const nextMonthDate = addMonths(currentDate, 1);
    const nextMonthPrefix = format(nextMonthDate, "yyyy-MM");

    const cells: GridCell[] = [];

    for (let i = firstDow - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      cells.push({
        day: d,
        dateStr: `${prevMonthPrefix}-${String(d).padStart(2, "0")}`,
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      cells.push({
        day: d,
        dateStr: `${selectedMonth}-${String(d).padStart(2, "0")}`,
        isCurrentMonth: true,
      });
    }

    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        day: nextDay,
        dateStr: `${nextMonthPrefix}-${String(nextDay).padStart(2, "0")}`,
        isCurrentMonth: false,
      });
      nextDay++;
    }

    const result: GridCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return result;
  }, [currentDate, selectedMonth]);

  const navigateMonth = (dir: "prev" | "next") => {
    const next = dir === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    const nextStr = format(next, "yyyy-MM");
    setSelectedMonth(nextStr);
    setSelectedDate(`${nextStr}-01`);
  };

  const jumpToToday = () => {
    const t = new Date();
    const tMonth = format(t, "yyyy-MM");
    setSelectedMonth(tMonth);
    setSelectedDate(format(t, "yyyy-MM-dd"));
  };

  const selectedDaySummary = daySummaries.get(selectedDate);
  const selectedDayDate = parseISO(selectedDate);
  const isTodaySelected = selectedDate === todayStr;
  const selectedDayFormatted = format(selectedDayDate, "EEEE, MMMM d, yyyy");

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* ── Sticky Header (Exact same header and controls) ── */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="px-4 pt-3 pb-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1]">
                <CalendarDays size={18} />
              </div>
              <div>
                <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">
                  {format(currentDate, "MMMM yyyy")}
                </h1>
                <p className="text-[11px] text-[var(--text-secondary)]">Activity breakdown</p>
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

          {/* Month Summary Bar (Exact same summary bar) */}
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

      {/* ── Main Container: 1 column on mobile, 2 columns on laptop/PC ── */}
      <div className="px-2 pt-2 pb-12 md:px-4 md:py-6 md:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-start">
          {/* ── Google Calendar Month Grid (Exact same grid, pills, dots) ── */}
          <div className="md:col-span-7 lg:col-span-7 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
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
                        relative flex flex-col items-center pt-1.5 pb-2 min-h-[64px] md:min-h-[80px] transition-all
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

          {/* ── Selected Day Detailed Info Panel (Exact same panel and actions) ── */}
          <div className="md:col-span-5 lg:col-span-5 md:sticky md:top-20">
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
              <div className="p-3 max-h-[380px] overflow-y-auto">
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
        </div>
      </div>

      {/* ── Add Transaction Sheet (Prefilled with Selected Date) ── */}
      <AddTransactionSheet
        open={showAddSheet}
        onClose={() => {
          setShowAddSheet(false);
          if (user?.id) {
            loadMonthData(selectedMonth, user.id);
          }
        }}
        defaultType={addDefaultType}
        categories={categories}
        currency={defaultCurrency}
        prefillDate={selectedDate}
      />
    </div>
  );
}
