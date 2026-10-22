import { create } from "zustand";
import { db, Transaction } from "@/lib/db";
import { convertCurrency, useExchangeRateStore } from "@/lib/currency/exchangeRates";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { notifyTransactionLogged } from "@/lib/notifications/notificationEngine";

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

  /** All-time cumulative net balance (income − expense across every month ever in defaultCurrency) */
  cumulativeBalance: number;
  cumulativeLoading: boolean;

  loadTransactions: (month: string, userId: string) => Promise<void>;
  refreshTransactions: (userId: string) => Promise<void>;
  addTransaction: (tx: NewTransactionData, userId: string) => Promise<void>;
  updateTransaction: (id: number, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;

  /** Recompute cumulative balance from all IndexedDB transactions converted to active currency */
  loadCumulativeBalance: (userId: string) => Promise<void>;

  /** Converts all transactions stored in Dexie to the target currency at real exchange rates */
  convertAllStoredTransactions: (toCurrency: string) => Promise<void>;

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
  cumulativeBalance: 0,
  cumulativeLoading: false,

  loadTransactions: async (month: string, userId: string) => {
    const state = get();
    if (state.loadedMonth === month && state.currentUserId === userId && !state.loading) {
      return;
    }
    set({ loading: true, currentUserId: userId });
    try {
      // Ensure exchange rates are fetched / fresh within 3 hours
      useExchangeRateStore.getState().fetchRates().catch(() => {});

      const { startDate, endDate } = getMonthRange(month);
      const txs = await db.transactions
        .where("[userId+date]")
        .between([userId, startDate], [userId, endDate], true, true)
        .toArray();
      set({ transactions: txs, loading: false, loadedMonth: month, selectedMonth: month, currentUserId: userId });
    } catch (err) {
      console.error("Failed to load transactions:", err);
      set({ loading: false, loadedMonth: month, selectedMonth: month, currentUserId: userId });
    }
    // Always refresh cumulative balance alongside month load
    get().loadCumulativeBalance(userId);
  },

  refreshTransactions: async (userId: string) => {
    const month = get().selectedMonth;
    set({ loading: true });
    try {
      useExchangeRateStore.getState().fetchRates().catch(() => {});

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
    get().loadCumulativeBalance(userId);
  },

  loadCumulativeBalance: async (userId: string) => {
    set({ cumulativeLoading: true });
    try {
      const defaultCurrency = useSettingsStore.getState().defaultCurrency || "USD";
      const rates = useExchangeRateStore.getState().rates;

      // Fetch ALL transactions for this user across all months
      const allTxs = await db.transactions.where("userId").equals(userId).toArray();
      let balance = 0;
      for (const tx of allTxs) {
        const txAmount = convertCurrency(
          tx.amount,
          tx.currency || defaultCurrency,
          defaultCurrency,
          rates
        );
        if (tx.type === "income") balance += txAmount;
        else balance -= txAmount;
      }
      set({
        cumulativeBalance: Math.round(balance * 100) / 100,
        cumulativeLoading: false,
      });
    } catch (err) {
      console.error("Failed to compute cumulative balance:", err);
      set({ cumulativeLoading: false });
    }
  },

  addTransaction: async (txData: NewTransactionData, userId: string) => {
    const now = new Date().toISOString();
    const defaultCurrency = useSettingsStore.getState().defaultCurrency || "USD";
    const rates = useExchangeRateStore.getState().rates;

    const id = await db.transactions.add({
      ...txData,
      currency: txData.currency || defaultCurrency,
      userId,
      createdAt: now,
      updatedAt: now,
    } as Transaction);

    const tx = await db.transactions.get(id as number);
    if (tx) {
      set((state) => ({ transactions: [tx, ...state.transactions] }));
    }

    // Convert new transaction amount to active defaultCurrency for cumulative balance
    const convertedAmount = convertCurrency(
      txData.amount,
      txData.currency || defaultCurrency,
      defaultCurrency,
      rates
    );

    set((state) => ({
      cumulativeBalance:
        Math.round(
          (state.cumulativeBalance +
            (txData.type === "income" ? convertedAmount : -convertedAmount)) *
            100
        ) / 100,
    }));

    if (typeof window !== "undefined") {
      notifyTransactionLogged({
        type: txData.type,
        amount: txData.amount,
        title: txData.title,
        currency: txData.currency || defaultCurrency,
      }).catch(() => {});
    }
  },

  updateTransaction: async (id: number, updates: Partial<Transaction>) => {
    const now = new Date().toISOString();
    const defaultCurrency = useSettingsStore.getState().defaultCurrency || "USD";
    const rates = useExchangeRateStore.getState().rates;

    const old = get().transactions.find((tx) => tx.id === id);
    await db.transactions.update(id, { ...updates, updatedAt: now });

    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === id ? { ...tx, ...updates, updatedAt: now } : tx
      ),
    }));

    // Recalculate cumulative delta with currency conversion
    if (old) {
      const oldConverted = convertCurrency(
        old.amount,
        old.currency || defaultCurrency,
        defaultCurrency,
        rates
      );
      const oldContrib = old.type === "income" ? oldConverted : -oldConverted;

      const newType = updates.type ?? old.type;
      const newAmount = updates.amount ?? old.amount;
      const newCurrency = updates.currency ?? old.currency ?? defaultCurrency;

      const newConverted = convertCurrency(
        newAmount,
        newCurrency,
        defaultCurrency,
        rates
      );
      const newContrib = newType === "income" ? newConverted : -newConverted;

      set((state) => ({
        cumulativeBalance:
          Math.round((state.cumulativeBalance - oldContrib + newContrib) * 100) / 100,
      }));
    }
  },

  deleteTransaction: async (id: number) => {
    const defaultCurrency = useSettingsStore.getState().defaultCurrency || "USD";
    const rates = useExchangeRateStore.getState().rates;

    const old = get().transactions.find((tx) => tx.id === id);
    await db.transactions.delete(id);
    set((state) => ({
      transactions: state.transactions.filter((tx) => tx.id !== id),
    }));

    if (old) {
      const oldConverted = convertCurrency(
        old.amount,
        old.currency || defaultCurrency,
        defaultCurrency,
        rates
      );
      set((state) => ({
        cumulativeBalance:
          Math.round(
            (state.cumulativeBalance - (old.type === "income" ? oldConverted : -oldConverted)) *
              100
          ) / 100,
      }));
    }
  },

  convertAllStoredTransactions: async (toCurrency: string) => {
    const rates = useExchangeRateStore.getState().rates;
    const currentUserId = get().currentUserId;
    if (!currentUserId) return;

    const allTxs = await db.transactions.where("userId").equals(currentUserId).toArray();
    for (const tx of allTxs) {
      if (tx.id && (tx.currency || "").toUpperCase() !== toCurrency.toUpperCase()) {
        const fromCurr = tx.currency || toCurrency;
        const newAmount = convertCurrency(tx.amount, fromCurr, toCurrency, rates);
        await db.transactions.update(tx.id, {
          amount: newAmount,
          currency: toCurrency,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    await get().refreshTransactions(currentUserId);
  },

  totalIncome: () => {
    const target = useSettingsStore.getState().defaultCurrency || "USD";
    const rates = useExchangeRateStore.getState().rates;
    const sum = get().transactions
      .filter((tx) => tx.type === "income")
      .reduce(
        (acc, tx) => acc + convertCurrency(tx.amount, tx.currency || target, target, rates),
        0
      );
    return Math.round(sum * 100) / 100;
  },

  totalExpense: () => {
    const target = useSettingsStore.getState().defaultCurrency || "USD";
    const rates = useExchangeRateStore.getState().rates;
    const sum = get().transactions
      .filter((tx) => tx.type === "expense")
      .reduce(
        (acc, tx) => acc + convertCurrency(tx.amount, tx.currency || target, target, rates),
        0
      );
    return Math.round(sum * 100) / 100;
  },

  netSavings: () =>
    Math.round((get().totalIncome() - get().totalExpense()) * 100) / 100,

  recent: () =>
    [...get().transactions]
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 15),

  weeklyTotals: () => {
    const target = useSettingsStore.getState().defaultCurrency || "USD";
    const rates = useExchangeRateStore.getState().rates;
    const days = getLast7Days();
    return days.map((day) => ({
      day,
      amount:
        Math.round(
          get()
            .transactions.filter((tx) => tx.type === "expense" && tx.date === day)
            .reduce(
              (sum, tx) => sum + convertCurrency(tx.amount, tx.currency || target, target, rates),
              0
            ) * 100
        ) / 100,
    }));
  },
}));
