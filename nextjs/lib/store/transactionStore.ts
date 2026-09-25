import { create } from "zustand";
import { db, Transaction } from "@/lib/db";

function getMonthRange(month: string) {
  const [year, mon] = month.split("-");
  const startDate = `${year}-${mon}-01`;
  const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${day}`);
  }
  return days;
}

function getCurrentLocalMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// The fields accepted when adding a new transaction (excludes auto-generated fields)
type NewTransactionData = Omit<Transaction, "id" | "userId" | "createdAt" | "updatedAt">;

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  loadedMonth: string | null;
  selectedMonth: string;
  currentUserId: string | null;

  loadTransactions: (month: string, userId: string) => Promise<void>;
  refreshTransactions: (userId: string) => Promise<void>; // force reload current month
  addTransaction: (tx: NewTransactionData, userId: string) => Promise<void>;
  updateTransaction: (id: number, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;

  totalIncome: () => number;
  totalExpense: () => number;
  netSavings: () => number;
  recent: () => Transaction[];
  weeklyTotals: () => { day: string; amount: number }[];
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  loading: false,
  loadedMonth: null,
  selectedMonth: getCurrentLocalMonth(),
  currentUserId: null,

  loadTransactions: async (month: string, userId: string) => {
    const state = get();
    if (state.loadedMonth === month && state.currentUserId === userId && !state.loading) {
      return;
    }
    set({ loading: true, currentUserId: userId });
    try {
      const { startDate, endDate } = getMonthRange(month);
      // Query all transactions for this user in date range
      const txs = await db.transactions
        .where("[userId+date]")
        .between([userId, startDate], [userId, endDate], true, true)
        .toArray();
      set({ transactions: txs, loading: false, loadedMonth: month, selectedMonth: month, currentUserId: userId });
    } catch (err) {
      console.error("Failed to load transactions:", err);
      set({ loading: false, loadedMonth: month, selectedMonth: month, currentUserId: userId });
    }
  },

  refreshTransactions: async (userId: string) => {
    const month = get().selectedMonth;
    set({ loading: true });
    try {
      const { startDate, endDate } = getMonthRange(month);
      const txs = await db.transactions
        .where("[userId+date]")
        .between([userId, startDate], [userId, endDate], true, true)
        .toArray();
      set({ transactions: txs, loading: false, loadedMonth: month });
    } catch (err) {
      console.error("Failed to refresh transactions:", err);
      set({ loading: false, loadedMonth: month });
    }
  },

  addTransaction: async (txData: NewTransactionData, userId: string) => {
    const now = new Date().toISOString();
    const id = await db.transactions.add({
      ...txData,
      userId,
      createdAt: now,
      updatedAt: now,
    } as Transaction);
    const tx = await db.transactions.get(id as number);
    if (tx) {
      set((state) => ({ transactions: [tx, ...state.transactions] }));
    }
  },

  updateTransaction: async (id: number, updates: Partial<Transaction>) => {
    const now = new Date().toISOString();
    await db.transactions.update(id, { ...updates, updatedAt: now });
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === id ? { ...tx, ...updates, updatedAt: now } : tx
      ),
    }));
  },

  deleteTransaction: async (id: number) => {
    await db.transactions.delete(id);
    set((state) => ({
      transactions: state.transactions.filter((tx) => tx.id !== id),
    }));
  },

  totalIncome: () =>
    get().transactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0),

  totalExpense: () =>
    get().transactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0),

  netSavings: () => get().totalIncome() - get().totalExpense(),

  recent: () =>
    [...get().transactions]
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 15),

  weeklyTotals: () => {
    const days = getLast7Days();
    return days.map((day) => ({
      day,
      amount: get()
        .transactions.filter((tx) => tx.type === "expense" && tx.date === day)
        .reduce((sum, tx) => sum + tx.amount, 0),
    }));
  },
}));
