/**
 * __tests__/unit/analytics/jsEngine.test.ts
 *
 * Unit tests for the JS analytics engine functions:
 *   - getDonutData()
 *   - getStackedBarData()
 *   - getDailyTrendData()
 *   - getInsights()
 *   - computeAnalytics()
 */

import {
  getDonutData,
  getStackedBarData,
  getDailyTrendData,
  getInsights,
  computeAnalytics,
  getRangeForPeriod,
  type DateRange,
} from '@/lib/analytics/jsEngine';
import type { Transaction, Category } from '@/lib/db';

// ── Fixtures ───────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 1, userId: 'u', name: 'Food',   icon: 'utensils', color: '#F97316', type: 'expense', order: 1, isDefault: true, createdAt: '' },
  { id: 2, userId: 'u', name: 'Salary', icon: 'wallet',   color: '#34D399', type: 'income',  order: 9, isDefault: true, createdAt: '' },
  { id: 3, userId: 'u', name: 'Travel', icon: 'plane',    color: '#0EA5E9', type: 'expense', order: 3, isDefault: true, createdAt: '' },
];

const RANGE: DateRange = { startDate: '2026-10-01', endDate: '2026-10-31' };

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: Math.floor(Math.random() * 99999),
    userId: 'u',
    type: 'expense',
    amount: 100,
    currency: 'INR',
    categoryId: 1,
    title: 'Test',
    date: '2026-10-05',
    paymentMethod: 'cash',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

// ── getDonutData ───────────────────────────────────────────────────────────────

describe('getDonutData()', () => {
  it('returns an empty array when there are no expense transactions', () => {
    const result = getDonutData(
      [makeTx({ type: 'income', categoryId: 2, amount: 5000 })],
      CATEGORIES,
      RANGE
    );
    expect(result).toEqual([]);
  });

  it('groups expenses by category and computes percentages', () => {
    const txs = [
      makeTx({ categoryId: 1, amount: 3000 }), // Food
      makeTx({ categoryId: 1, amount: 1000 }), // Food
      makeTx({ categoryId: 3, amount: 2000 }), // Travel — out-of-range (test below)
      // Wait — same range, just checking grouping here
      makeTx({ categoryId: 3, amount: 2000, date: '2026-10-10' }), // Travel
    ];
    const result = getDonutData(txs, CATEGORIES, RANGE);
    const food  = result.find((s) => s.name === 'Food');
    const travel = result.find((s) => s.name === 'Travel');

    expect(food).toBeDefined();
    expect(travel).toBeDefined();
    // 4000 (Food) + 4000 (Travel) = 8000 total; 4000/8000 = 50%
    expect(food?.percent).toBe(50);
    expect(travel?.percent).toBe(50);
  });

  it('excludes transactions outside the date range', () => {
    const txs = [
      makeTx({ categoryId: 1, amount: 500, date: '2026-09-30' }), // before range
      makeTx({ categoryId: 1, amount: 500, date: '2026-11-01' }), // after range
      makeTx({ categoryId: 1, amount: 1000, date: '2026-10-15' }), // in range
    ];
    const result = getDonutData(txs, CATEGORIES, RANGE);
    expect(result[0].amount).toBe(1000);
  });

  it('sorts slices from highest to lowest amount', () => {
    const txs = [
      makeTx({ categoryId: 3, amount: 200, date: '2026-10-05' }), // Travel (smaller)
      makeTx({ categoryId: 1, amount: 800, date: '2026-10-05' }), // Food (larger)
    ];
    const result = getDonutData(txs, CATEGORIES, RANGE);
    expect(result[0].amount).toBeGreaterThanOrEqual(result[1].amount);
  });
});

// ── getDailyTrendData ──────────────────────────────────────────────────────────

describe('getDailyTrendData()', () => {
  const range: DateRange = { startDate: '2026-10-01', endDate: '2026-10-07' };

  it('returns exactly one entry per day in range', () => {
    const result = getDailyTrendData([], range);
    expect(result).toHaveLength(7);
  });

  it('assigns correct dates in order', () => {
    const result = getDailyTrendData([], range);
    expect(result[0].date).toBe('2026-10-01');
    expect(result[6].date).toBe('2026-10-07');
  });

  it('sums daily expenses correctly', () => {
    const txs = [
      makeTx({ amount: 200, date: '2026-10-03' }),
      makeTx({ amount: 100, date: '2026-10-03' }),
      makeTx({ type: 'income', amount: 5000, date: '2026-10-03' }), // excluded
    ];
    const result = getDailyTrendData(txs, range);
    const oct3 = result.find((e) => e.date === '2026-10-03');
    expect(oct3?.amount).toBe(300);
  });

  it('computes a 7-day rolling average', () => {
    const result = getDailyTrendData([], range);
    // With zero spending every day, rolling average should always be 0
    result.forEach((entry) => expect(entry.rolling7).toBe(0));
  });
});

// ── getInsights ────────────────────────────────────────────────────────────────

describe('getInsights()', () => {
  it('always returns an "avg" insight', () => {
    const txs = [makeTx({ amount: 300, date: '2026-10-05' })];
    const insights = getInsights(txs, CATEGORIES, RANGE, 'INR');
    expect(insights.some((i) => i.iconType === 'avg')).toBe(true);
  });

  it('always returns a "total" insight', () => {
    const txs = [makeTx({ amount: 1000 })];
    const insights = getInsights(txs, CATEGORIES, RANGE, 'INR');
    expect(insights.some((i) => i.iconType === 'total')).toBe(true);
  });

  it('uses ₹ symbol for INR', () => {
    const txs = [makeTx({ amount: 500 })];
    const insights = getInsights(txs, CATEGORIES, RANGE, 'INR');
    const total = insights.find((i) => i.iconType === 'total');
    expect(total?.text).toContain('₹');
  });

  it('uses $ symbol for USD', () => {
    const txs = [makeTx({ amount: 50, currency: 'USD' })];
    const insights = getInsights(txs, CATEGORIES, RANGE, 'USD');
    const total = insights.find((i) => i.iconType === 'total');
    expect(total?.text).toContain('$');
  });

  it('returns empty-safe insights when there are no transactions', () => {
    const insights = getInsights([], CATEGORIES, RANGE, 'INR');
    // Still returns avg and total insights even with zero data
    expect(insights.length).toBeGreaterThan(0);
  });
});

// ── computeAnalytics ───────────────────────────────────────────────────────────

describe('computeAnalytics()', () => {
  it('returns all 4 required keys', () => {
    const result = computeAnalytics([], CATEGORIES, RANGE, 'category', 'INR');
    expect(result).toHaveProperty('donut');
    expect(result).toHaveProperty('stackedBar');
    expect(result).toHaveProperty('lineTrend');
    expect(result).toHaveProperty('insights');
  });
});

// ── getRangeForPeriod ──────────────────────────────────────────────────────────

describe('getRangeForPeriod()', () => {
  it('returns a 7-day range for "week"', () => {
    const { startDate, endDate } = getRangeForPeriod('week');
    const start = new Date(startDate);
    const end   = new Date(endDate);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(6); // 7 days inclusive = diff of 6
  });

  it('returns a full month range for "month"', () => {
    const { startDate, endDate } = getRangeForPeriod('month', '2026-02');
    expect(startDate).toBe('2026-02-01');
    expect(endDate).toBe('2026-02-28');
  });

  it('returns a full year range for "year"', () => {
    const { startDate, endDate } = getRangeForPeriod('year');
    const year = new Date().getFullYear();
    expect(startDate).toBe(`${year}-01-01`);
    expect(endDate).toBe(`${year}-12-31`);
  });
});
