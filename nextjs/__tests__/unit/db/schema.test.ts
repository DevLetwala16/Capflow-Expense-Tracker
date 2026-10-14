/**
 * @jest-environment node
 *
 * Use the Node environment (not jsdom) so `structuredClone` is natively
 * available — required by fake-indexeddb and Dexie during unit tests.
 *
 * __tests__/unit/db/schema.test.ts
 *
 * Unit tests for the Dexie schema:
 *   - DEFAULT_CATEGORIES data integrity
 *   - seedDefaultCategories() idempotency
 *   - DB TypeScript interface shapes (compile-time + runtime checks)
 *
 * Uses a fake in-memory Dexie powered by "fake-indexeddb".
 */

// Polyfill IndexedDB for Node.js test environment
import 'fake-indexeddb/auto';

import { db, DEFAULT_CATEGORIES, seedDefaultCategories, ExpenseTrackerDB } from '@/lib/db';
import type { Category, Transaction, Budget, EMI, Goal } from '@/lib/db';

describe('DEFAULT_CATEGORIES', () => {
  it('contains exactly 10 default categories', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(10);
  });

  it('includes the required expense categories', () => {
    const names = DEFAULT_CATEGORIES.map((c) => c.name);
    ['Food', 'Rent', 'Travel', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'EMI'].forEach(
      (required) => expect(names).toContain(required)
    );
  });

  it('includes Salary as income category', () => {
    const salary = DEFAULT_CATEGORIES.find((c) => c.name === 'Salary');
    expect(salary).toBeDefined();
    expect(salary?.type).toBe('income');
  });

  it('has Other category with type "both"', () => {
    const other = DEFAULT_CATEGORIES.find((c) => c.name === 'Other');
    expect(other?.type).toBe('both');
  });

  it('every category has a non-empty icon and hex color', () => {
    DEFAULT_CATEGORIES.forEach((cat) => {
      expect(cat.icon).toBeTruthy();
      expect(cat.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('isDefault is true for every default category', () => {
    DEFAULT_CATEGORIES.forEach((cat) => {
      expect(cat.isDefault).toBe(true);
    });
  });
});

describe('seedDefaultCategories()', () => {
  const testUserId = 'seed-test-user';

  beforeEach(async () => {
    // Wipe categories table before each test
    await db.categories.where('userId').equals(testUserId).delete();
  });

  it('seeds all 10 default categories for a new user', async () => {
    await seedDefaultCategories(testUserId);
    const cats = await db.categories.where('userId').equals(testUserId).toArray();
    expect(cats.length).toBe(10);
  });

  it('is idempotent — calling twice does not duplicate categories', async () => {
    await seedDefaultCategories(testUserId);
    await seedDefaultCategories(testUserId);
    const cats = await db.categories.where('userId').equals(testUserId).toArray();
    // Should still have 10, no duplicates (deduplication removes extras)
    expect(cats.length).toBe(10);
  });

  it('assigns the correct userId to all seeded categories', async () => {
    await seedDefaultCategories(testUserId);
    const cats = await db.categories.where('userId').equals(testUserId).toArray();
    cats.forEach((cat) => expect(cat.userId).toBe(testUserId));
  });
});

describe('Dexie schema — Transaction interface', () => {
  it('can add and retrieve a transaction', async () => {
    const userId = 'tx-shape-user';
    const tx: Omit<Transaction, 'id'> = {
      userId,
      type: 'expense',
      amount: 500,
      currency: 'INR',
      categoryId: 1,
      title: 'Coffee',
      date: '2026-10-12',
      paymentMethod: 'upi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const id = await db.transactions.add(tx as Transaction);
    const saved = await db.transactions.get(id as number);
    expect(saved?.title).toBe('Coffee');
    expect(saved?.userId).toBe(userId);
    expect(saved?.amount).toBe(500);
  });
});

describe('Dexie schema — Budget interface', () => {
  it('can add and retrieve a budget', async () => {
    const budget: Omit<Budget, 'id'> = {
      userId: 'budget-shape-user',
      categoryId: 2,
      month: '2026-10',
      limit: 5000,
      alertThreshold: 90,
      createdAt: new Date().toISOString(),
    };
    const id = await db.budgets.add(budget as Budget);
    const saved = await db.budgets.get(id as number);
    expect(saved?.limit).toBe(5000);
    expect(saved?.alertThreshold).toBe(90);
  });
});

describe('Dexie schema — EMI interface', () => {
  it('can add and retrieve an EMI', async () => {
    const emi: Omit<EMI, 'id'> = {
      userId: 'emi-shape-user',
      name: 'Home Loan',
      totalCost: 5000000,
      monthlyCost: 25000,
      startDate: '2024-01-01',
      endDate: '2044-01-01',
      dueDay: 5,
      totalInstallments: 240,
      paidInstallments: 33,
      reminderLeadDays: 3,
      emailSyncEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const id = await db.emis.add(emi as EMI);
    const saved = await db.emis.get(id as number);
    expect(saved?.name).toBe('Home Loan');
    expect(saved?.monthlyCost).toBe(25000);
    expect(saved?.emailSyncEnabled).toBe(false);
  });
});
