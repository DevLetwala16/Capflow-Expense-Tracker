"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  BarChart2,
  TrendingUp,
  Tag,
  Wallet,
  PieChart as PieChartIcon,
  Sparkles,
} from "lucide-react";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { useAnalytics, AnalyticsPeriod } from "@/hooks/useAnalytics";
import { getRangeForPeriod } from "@/lib/analytics/jsEngine";
import { CategoryDrilldown } from "@/components/analytics/CategoryDrilldown";
import { DonutSlice } from "@/lib/analytics/jsEngine";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: "#10B981",
  upi: "#6366F1",
  credit_card: "#F59E0B",
  bank_transfer: "#0EA5E9",
};

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label, symbol }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; fill?: string }>;
  label?: string;
  symbol: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || p.fill }}>
          {p.name}: {symbol}{Math.round(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function CustomLineTooltip({ active, payload, label, symbol }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  symbol: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {symbol}{Math.round(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");
  const [groupBy, setGroupBy] = useState<"category" | "paymentMethod">("category");
  const [drilldownSlice, setDrilldownSlice] = useState<DonutSlice | null>(null);

  const { defaultCurrency, selectedMonth } = useSettingsStore();
  const { loadTransactions } = useTransactionStore();
  const { categories, loadCategories } = useCategoryStore();
  const symbol = CURRENCY_SYMBOLS[defaultCurrency] || defaultCurrency;

  useEffect(() => {
    loadCategories();
    loadTransactions(selectedMonth);
  }, [selectedMonth, loadCategories, loadTransactions]);

  const { donut, stackedBar, lineTrend, insights, loading } = useAnalytics(
    period,
    categories,
    defaultCurrency,
    groupBy
  );

  const range = getRangeForPeriod(period, selectedMonth);

  // Derive stacked bar keys
  const stackedKeys =
    groupBy === "category"
      ? Array.from(new Set(stackedBar.flatMap((e) => Object.keys(e).filter((k) => k !== "month" && k !== "label"))))
      : ["cash", "upi", "credit_card", "bank_transfer"];

  const totalMonthlySpend = stackedBar.reduce((sum, entry) => {
    return (
      sum +
      Object.entries(entry).reduce((entrySum, [k, v]) => {
        if (k !== "month" && k !== "label" && typeof v === "number") {
          return entrySum + v;
        }
        return entrySum;
      }, 0)
    );
  }, 0);

  const catColorMap = new Map(categories.map((c) => [c.name, c.color]));

  const getStackColor = (key: string) =>
    groupBy === "paymentMethod" ? PAYMENT_COLORS[key] ?? "#94A3B8" : catColorMap.get(key) ?? "#94A3B8";

  const renderInsightIcon = (type: string) => {
    switch (type) {
      case "avg":
        return (
          <div className="w-7 h-7 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1] flex-shrink-0">
            <BarChart2 size={15} />
          </div>
        );
      case "peak":
        return (
          <div className="w-7 h-7 rounded-xl bg-[#EF4444]/10 flex items-center justify-center text-[#EF4444] flex-shrink-0">
            <TrendingUp size={15} />
          </div>
        );
      case "category":
        return (
          <div className="w-7 h-7 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] flex-shrink-0">
            <Tag size={15} />
          </div>
        );
      case "total":
        return (
          <div className="w-7 h-7 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981] flex-shrink-0">
            <Wallet size={15} />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1] flex-shrink-0">
            <Sparkles size={15} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)] px-4 py-3">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Analytics & Insights</h1>
      </header>

      <div className="px-4 pb-8 space-y-5 pt-4">

        {/* ── Period filter ── */}
        <div className="flex gap-2">
          {(Object.keys(PERIOD_LABELS) as AnalyticsPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                period === p
                  ? "bg-[#6366F1] text-white"
                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)]"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* ── Insight Strip ── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 skeleton rounded-2xl" />
            ))}
          </div>
        ) : insights.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {insights.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-[var(--bg-card)] rounded-2xl p-3 border border-[var(--border-color)] flex flex-col justify-between"
              >
                <div className="mb-1.5">{renderInsightIcon(item.iconType)}</div>
                <p className="text-xs text-[var(--text-primary)] font-medium leading-snug">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        ) : null}

        {/* ── Donut Chart ── */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Spending by Category</h2>
          {loading ? (
            <div className="h-48 skeleton rounded-xl" />
          ) : donut.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-[var(--text-secondary)]">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center mb-2 text-[var(--text-secondary)]">
                <PieChartIcon size={24} className="opacity-40" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">No expense data</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">No entries for this period</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donut}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="amount"
                      isAnimationActive
                      animationBegin={0}
                      animationDuration={600}
                      onClick={(data) => setDrilldownSlice(data as unknown as DonutSlice)}
                      cursor="pointer"
                    >
                      {donut.map((slice, i) => (
                        <Cell key={i} fill={slice.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xs text-[var(--text-secondary)]">Total</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {symbol}{donut.reduce((s, d) => s + d.amount, 0).toLocaleString()}
                  </p>
                </div>
              </div>
              {/* Legend */}
              <div className="space-y-2 mt-2">
                {donut.slice(0, 6).map((slice) => (
                  <button
                    key={slice.categoryId}
                    onClick={() => setDrilldownSlice(slice)}
                    className="w-full flex items-center gap-2 text-left hover:bg-[var(--bg-card-hover)] rounded-xl px-2 py-1.5 transition-colors"
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                    <span className="flex-1 text-xs text-[var(--text-primary)] truncate">{slice.name}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{slice.percent}%</span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {symbol}{slice.amount.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Stacked Bar Chart ── */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Monthly Spending</h2>
            <div className="flex gap-1">
              {(["category", "paymentMethod"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    groupBy === g
                      ? "bg-[#6366F1] text-white"
                      : "bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                  }`}
                >
                  {g === "category" ? "Category" : "Payment"}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-48 skeleton rounded-xl" />
          ) : totalMonthlySpend === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-[var(--text-secondary)]">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center mb-2 text-[var(--text-secondary)]">
                <BarChart2 size={24} className="opacity-40" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">No spending recorded</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Add an expense to view your 6-month trend</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stackedBar} barSize={18}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomBarTooltip symbol={symbol} />} />
                {stackedKeys.map((key) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={getStackColor(key)} radius={[2, 2, 0, 0]} isAnimationActive />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Daily Trend Line Chart ── */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Daily Spend Trend</h2>
          {loading ? (
            <div className="h-48 skeleton rounded-xl" />
          ) : lineTrend.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-[var(--text-secondary)]">
              <p className="text-sm">No data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "var(--text-secondary)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(lineTrend.length / 6) - 1)}
                />
                <YAxis hide />
                <Tooltip content={<CustomLineTooltip symbol={symbol} />} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="Daily"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                  animationDuration={600}
                />
                <Line
                  type="monotone"
                  dataKey="rolling7"
                  name="7-day avg"
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  isAnimationActive
                  animationDuration={600}
                />
                <Legend
                  wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
                  formatter={(value) => <span style={{ color: "var(--text-secondary)" }}>{value}</span>}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Drilldown (C2) */}
      <CategoryDrilldown
        open={!!drilldownSlice}
        onClose={() => setDrilldownSlice(null)}
        slice={drilldownSlice}
        currency={defaultCurrency}
        startDate={range.startDate}
        endDate={range.endDate}
      />
    </div>
  );
}
