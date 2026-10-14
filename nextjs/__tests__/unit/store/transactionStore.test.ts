/**
 * __tests__/unit/store/transactionStore.test.ts
 *
 * Unit tests for Zustand transactionStore selectors.
 * All Dexie / IndexedDB operations are mocked — no real DB is used.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock the entire Dexie db module so no real IndexedDB calls happen
jest.mock('@/lib/db', () => ({
  db: {
    transactions: {
      add: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      get: jest.fn(),
      where: jest.fn(() => ({
        between: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
        equals: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
      })),
    },
  },
}));

// Mock exchange rate store — always return identity rates (1:1 conversion)
jest.mock('@/lib/currency/exchangeRates', () => ({
  convertCurrency: (amount: number) => amount, // identity
  useExchangeRateStore: {
    getState: () => ({
      rates: {},
      fetchRates: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock settings store — always return INR as default currency
jest.mock('@/lib/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ defaultCurrency: 'INR' }),
  },
}));

// ── Import after mocks ─────────────────────────────────────────────────────────
import { useTransactionStore } from '@/lib/store/transactionStore';
import type { Transaction } from '@/lib/db';

// ── Helpers ────────────────────────────────────────────────────────────────────

const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: Math.floor(Math.random() * 100000),
    userId: 'user-1',
    type: 'expense',
    amount: 100,
    currency: 'INR',
    categoryId: 1,
    title: 'Test',
    date: todayStr,
    paymentMethod: 'cash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function setTransactions(txs: Transaction[]) {
  useTransactionStore.setState({ transactions: txs });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('transactionStore — selectors', () => {
  beforeEach(() => {
    // Reset to clean state before each test
    useTransactionStore.setState({
      transactions: [],
      loading: false,
      loadedMonth: null,
      selectedMonth: '2026-10',
      currentUserId: 'user-1',
      cumulativeBalance: 0,
      cumulativeLoading: false,
    });
  });

  describe('totalIncome()', () => {
    it('returns 0 when there are no transactions', () => {
      expect(useTransactionStore.getState().totalIncome()).toBe(0);
    });

    it('sums only income transactions', () => {
      setTransactions([
        makeTx({ type: 'income', amount: 5000 }),
        makeTx({ type: 'income', amount: 3000 }),
        makeTx({ type: 'expense', amount: 1000 }),
      ]);
      expect(useTransactionStore.getState().totalIncome()).toBe(8000);
    });

    it('rounds to 2 decimal places', () => {
      setTransactions([
        makeTx({ type: 'income', amount: 1000.005 }),
        makeTx({ type: 'income', amount: 0.005 }),
      ]);
      // 1000.005 + 0.005 = 1000.01
      expect(useTransactionStore.getState().totalIncome()).toBeCloseTo(1000.01, 2);
    });
  });

  describe('totalExpense()', () => {
    it('returns 0 when there are no transactions', () => {
      expect(useTransactionStore.getState().totalExpense()).toBe(0);
    });

    it('sums only expense transactions', () => {
      setTransactions([
        makeTx({ type: 'expense', amount: 200 }),
        makeTx({ type: 'expense', amount: 300 }),
        makeTx({ type: 'income', amount: 5000 }),
      ]);
      expect(useTransactionStore.getState().totalExpense()).toBe(500);
    });
  });

  describe('netSavings()', () => {
    it('is totalIncome - totalExpense', () => {
      setTransactions([
        makeTx({ type: 'income', amount: 10000 }),
        makeTx({ type: 'expense', amount: 4000 }),
        makeTx({ type: 'expense', amount: 2000 }),
      ]);
      // 10000 - 6000 = 4000
      expect(useTransactionStore.getState().netSavings()).toBe(4000);
    });

    it('can be negative (overspent)', () => {
      setTransactions([
        makeTx({ type: 'income', amount: 1000 }),
        makeTx({ type: 'expense', amount: 5000 }),
      ]);
      expect(useTransactionStore.getState().netSavings()).toBe(-4000);
    });
  });

  describe('recent()', () => {
    it('returns at most 15 transactions', () => {
      const txs = Array.from({ length: 20 }, (_, i) =>
        makeTx({ id: i + 1, date: `2026-10-${String(i + 1).padStart(2, '0')}` })
      );
      setTransactions(txs);
      expect(useTransactionStore.getState().recent().length).toBe(15);
    });

    it('returns newest-first (sorted descending by date)', () => {
      setTransactions([
        makeTx({ id: 1, date: '2026-10-01' }),
        makeTx({ id: 2, date: '2026-10-15' }),
        makeTx({ id: 3, date: '2026-10-08' }),
      ]);
      const recent = useTransactionStore.getState().recent();
      expect(recent[0].date).toBe('2026-10-15');
      expect(recent[1].date).toBe('2026-10-08');
      expect(recent[2].date).toBe('2026-10-01');
    });
  });

  describe('weeklyTotals()', () => {
    it('returns exactly 7 entries', () => {
      setTransactions([]);
      expect(useTransactionStore.getState().weeklyTotals().length).toBe(7);
    });

    it('sums expenses for the current day correctly', () => {
      setTransactions([
        makeTx({ type: 'expense', amount: 200, date: todayStr }),
        makeTx({ type: 'expense', amount: 300, date: todayStr }),
        makeTx({ type: 'income', amount: 5000, date: todayStr }), // income excluded
      ]);
      const totals = useTransactionStore.getState().weeklyTotals();
      const todayEntry = totals.find((e) => e.day === todayStr);
      expect(todayEntry?.amount).toBe(500);
    });

    it('returns 0 for days with no transactions', () => {
      setTransactions([]);
      const totals = useTransactionStore.getState().weeklyTotals();
      totals.forEach((entry) => {
        expect(entry.amount).toBe(0);
      });
    });
  });
});
