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
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// The fields accepted when adding a new transaction (excludes auto-generated fields)
type NewTransactionData = Omit<Transaction, "id" | "createdAt" | "updatedAt">;

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  selectedMonth: string;

  loadTransactions: (month: string) => Promise<void>;
  addTransaction: (tx: NewTransactionData) => Promise<void>;
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
  selectedMonth: new Date().toISOString().slice(0, 7),

  loadTransactions: async (month: string) => {
    set({ loading: true });
    const { startDate, endDate } = getMonthRange(month);
    const txs = await db.transactions
      .where("date")
      .between(startDate, endDate, true, true)
      .toArray();
    set({ transactions: txs, loading: false, selectedMonth: month });
  },

  addTransaction: async (txData: NewTransactionData) => {
    const now = new Date().toISOString();
    const id = await db.transactions.add({
      ...txData,
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
