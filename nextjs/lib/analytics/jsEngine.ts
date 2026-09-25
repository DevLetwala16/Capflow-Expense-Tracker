import { Transaction, Category } from "@/lib/db";

// ─── Shared types (engine-agnostic contract) ──────────────────────────────────

export interface DonutSlice {
  categoryId: number;
  name: string;
  color: string;
  icon: string;
  amount: number;
  percent: number;
  count: number;
}

export interface StackedBarEntry {
  month: string; // "YYYY-MM"
  label: string; // "Sep"
  [key: string]: number | string; // dynamic keys per category or paymentMethod
}

export interface DailyTrendEntry {
  date: string; // "YYYY-MM-DD"
  label: string; // "3 Sep"
  amount: number;
  rolling7: number;
}

export interface InsightItem {
  id: string;
  iconType: "avg" | "peak" | "category" | "total";
  emoji?: string;
  text: string;
}

export interface AnalyticsResult {
  donut: DonutSlice[];
  stackedBar: StackedBarEntry[];
  lineTrend: DailyTrendEntry[];
  insights: InsightItem[];
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

export interface DateRange {
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatLocalMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getRangeForPeriod(
  period: "week" | "month" | "year",
  referenceMonth?: string // "YYYY-MM", defaults to current
): DateRange {
  const now = new Date();
  if (period === "week") {
    const end = formatLocalDate(now);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return { startDate: formatLocalDate(start), endDate: end };
  }
  if (period === "month") {
    const base = referenceMonth ?? formatLocalMonth(now);
    const [y, m] = base.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      startDate: `${base}-01`,
      endDate: `${base}-${String(lastDay).padStart(2, "0")}`,
    };
  }
  // year
  const year = now.getFullYear();
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
}

function filterByRange(txs: Transaction[], range: DateRange): Transaction[] {
  return txs.filter(
    (tx) => tx.date >= range.startDate && tx.date <= range.endDate
  );
}

function formatShortMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "short" });
}

function formatShortDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  return `${d} ${dateObj.toLocaleString("default", { month: "short" })}`;
}

// ─── Donut Chart Data ─────────────────────────────────────────────────────────

export function getDonutData(
  txs: Transaction[],
  categories: Category[],
  range: DateRange
): DonutSlice[] {
  const expenses = filterByRange(txs, range).filter(
    (tx) => tx.type === "expense"
  );
  const totalExpense = expenses.reduce((s, tx) => s + tx.amount, 0);

  const grouped = new Map<number, { amount: number; count: number }>();
  for (const tx of expenses) {
    const prev = grouped.get(tx.categoryId) ?? { amount: 0, count: 0 };
    grouped.set(tx.categoryId, {
      amount: prev.amount + tx.amount,
      count: prev.count + 1,
    });
  }

  const catMap = new Map(categories.map((c) => [c.id!, c]));

  return Array.from(grouped.entries())
    .map(([catId, { amount, count }]) => {
      const cat = catMap.get(catId);
      return {
        categoryId: catId,
        name: cat?.name ?? "Unknown",
        color: cat?.color ?? "#94A3B8",
        icon: cat?.icon ?? "circle-ellipsis",
        amount,
        percent: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
        count,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

// ─── Stacked Bar Chart Data ───────────────────────────────────────────────────

export function getStackedBarData(
  txs: Transaction[],
  categories: Category[],
  groupBy: "category" | "paymentMethod",
  numMonths = 6
): StackedBarEntry[] {
  // Build last N months list (local timezone safe)
  const months: string[] = [];
  const now = new Date();
  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(formatLocalMonth(d));
  }

  const catMap = new Map(categories.map((c) => [c.id!, c]));
  const expenses = txs.filter((tx) => tx.type === "expense");

  return months.map((month) => {
    const [y, m] = month.split("-").map(Number);
    const startDate = `${month}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

    const monthTxs = expenses.filter(
      (tx) => tx.date >= startDate && tx.date <= endDate
    );

    const entry: StackedBarEntry = {
      month,
      label: formatShortMonth(month),
    };

    if (groupBy === "category") {
      for (const tx of monthTxs) {
        const cat = catMap.get(tx.categoryId);
        const key = cat?.name ?? `cat-${tx.categoryId}`;
        entry[key] = ((entry[key] as number) ?? 0) + tx.amount;
      }
    } else {
      for (const tx of monthTxs) {
        const key = tx.paymentMethod;
        entry[key] = ((entry[key] as number) ?? 0) + tx.amount;
      }
    }

    return entry;
  });
}

// ─── Daily Trend Data ─────────────────────────────────────────────────────────

export function getDailyTrendData(
  txs: Transaction[],
  range: DateRange
): DailyTrendEntry[] {
  // Build day list using local date cursor
  const days: string[] = [];
  const [sy, sm, sd] = range.startDate.split("-").map(Number);
  const [ey, em, ed] = range.endDate.split("-").map(Number);
  const cursor = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  while (cursor <= end) {
    days.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const expenseTxs = filterByRange(txs, range).filter(
    (tx) => tx.type === "expense"
  );

  const dailyMap = new Map<string, number>();
  for (const tx of expenseTxs) {
    dailyMap.set(tx.date, (dailyMap.get(tx.date) ?? 0) + tx.amount);
  }

  const dailyAmounts = days.map((d) => dailyMap.get(d) ?? 0);

  // 7-day rolling average
  const rolling7 = dailyAmounts.map((_, i, arr) => {
    const window = arr.slice(Math.max(0, i - 6), i + 1);
    return window.reduce((s, v) => s + v, 0) / window.length;
  });

  return days.map((date, i) => ({
    date,
    label: formatShortDay(date),
    amount: dailyAmounts[i],
    rolling7: Math.round(rolling7[i]),
  }));
}

// ─── Insight Strip ────────────────────────────────────────────────────────────

export function getInsights(
  txs: Transaction[],
  categories: Category[],
  range: DateRange,
  currency: string
): InsightItem[] {
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;
  const expenses = filterByRange(txs, range).filter(
    (tx) => tx.type === "expense"
  );
  const totalExpense = expenses.reduce((s, tx) => s + tx.amount, 0);

  const insights: InsightItem[] = [];

  // Avg daily spend
  const days = new Set(expenses.map((tx) => tx.date)).size || 1;
  const avg = Math.round(totalExpense / days);
  insights.push({
    id: "avg",
    iconType: "avg",
    text: `Avg daily spend: ${symbol}${avg.toLocaleString()}`,
  });

  // Highest spending day
  const byDay = new Map<string, number>();
  for (const tx of expenses) {
    byDay.set(tx.date, (byDay.get(tx.date) ?? 0) + tx.amount);
  }
  if (byDay.size > 0) {
    const topDay = Array.from(byDay.entries()).sort((a, b) => b[1] - a[1])[0];
    const d = new Date(topDay[0] + "T00:00:00");
    const label = `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`;
    insights.push({
      id: "peak",
      iconType: "peak",
      text: `Highest spending day: ${label} (${symbol}${topDay[1].toLocaleString()})`,
    });
  }

  // Biggest category
  const catMap = new Map(categories.map((c) => [c.id!, c]));
  const byCat = new Map<number, number>();
  for (const tx of expenses) {
    byCat.set(tx.categoryId, (byCat.get(tx.categoryId) ?? 0) + tx.amount);
  }
  if (byCat.size > 0) {
    const topCat = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])[0];
    const cat = catMap.get(topCat[0]);
    if (cat) {
      insights.push({
        id: "top-cat",
        iconType: "category",
        text: `Top category: ${cat.name} — ${symbol}${topCat[1].toLocaleString()}`,
      });
    }
  }

  // Total spend in period
  insights.push({
    id: "total",
    iconType: "total",
    text: `Total spent: ${symbol}${totalExpense.toLocaleString()}`,
  });

  return insights;
}

// ─── Master compute function ──────────────────────────────────────────────────

export function computeAnalytics(
  txs: Transaction[],
  categories: Category[],
  range: DateRange,
  groupBy: "category" | "paymentMethod",
  currency: string
): AnalyticsResult {
  return {
    donut: getDonutData(txs, categories, range),
    stackedBar: getStackedBarData(txs, categories, groupBy),
    lineTrend: getDailyTrendData(txs, range),
    insights: getInsights(txs, categories, range, currency),
  };
}
