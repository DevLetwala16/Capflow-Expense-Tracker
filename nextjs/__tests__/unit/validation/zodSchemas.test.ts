/**
 * __tests__/unit/validation/zodSchemas.test.ts
 *
 * Unit tests for Zod validation schemas used in form inputs.
 * These are inline schema definitions that mirror what Add/Edit Transaction
 * and Budget forms use in the real UI.
 */

import { z } from 'zod';

// ── Inline schema definitions (mirrors real form schemas) ──────────────────────

const TransactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.number({ invalid_type_error: 'Amount must be a number' }).positive('Amount must be greater than 0'),
  currency: z.string().min(3, 'Currency code required'),
  categoryId: z.number().int().positive('Category is required'),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  paymentMethod: z.enum(['cash', 'credit_card', 'bank_transfer', 'upi']),
  notes: z.string().max(500, 'Notes too long').optional(),
});

type TransactionInput = z.infer<typeof TransactionSchema>;

const BudgetSchema = z.object({
  categoryId: z.number().int().positive('Category is required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'),
  limit: z.number().positive('Limit must be greater than 0'),
  alertThreshold: z.number().min(1).max(100, 'Threshold must be 1–100'),
});

const GoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(80),
  targetAmount: z.number().positive('Target amount must be positive'),
  savedAmount: z.number().min(0, 'Saved amount cannot be negative'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

// ── TransactionSchema ──────────────────────────────────────────────────────────

describe('TransactionSchema', () => {
  const validInput: TransactionInput = {
    type: 'expense',
    amount: 500,
    currency: 'INR',
    categoryId: 1,
    title: 'Lunch',
    date: '2026-10-12',
    paymentMethod: 'upi',
  };

  it('accepts a valid expense transaction', () => {
    expect(() => TransactionSchema.parse(validInput)).not.toThrow();
  });

  it('accepts a valid income transaction', () => {
    expect(() => TransactionSchema.parse({ ...validInput, type: 'income', amount: 50000 })).not.toThrow();
  });

  it('rejects amount ≤ 0', () => {
    const result = TransactionSchema.safeParse({ ...validInput, amount: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('greater than 0');
    }
  });

  it('rejects negative amounts', () => {
    const result = TransactionSchema.safeParse({ ...validInput, amount: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects an empty title', () => {
    const result = TransactionSchema.safeParse({ ...validInput, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a title longer than 100 characters', () => {
    const result = TransactionSchema.safeParse({ ...validInput, title: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = TransactionSchema.safeParse({ ...validInput, date: '12/10/2026' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid payment method', () => {
    const result = TransactionSchema.safeParse({ ...validInput, paymentMethod: 'paypal' as never });
    expect(result.success).toBe(false);
  });

  it('rejects categoryId of 0', () => {
    const result = TransactionSchema.safeParse({ ...validInput, categoryId: 0 });
    expect(result.success).toBe(false);
  });

  it('allows optional notes field', () => {
    const withNotes = TransactionSchema.safeParse({ ...validInput, notes: 'Paid at Café' });
    expect(withNotes.success).toBe(true);
  });

  it('rejects notes longer than 500 characters', () => {
    const result = TransactionSchema.safeParse({ ...validInput, notes: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });
});

// ── BudgetSchema ──────────────────────────────────────────────────────────────

describe('BudgetSchema', () => {
  const validBudget = {
    categoryId: 1,
    month: '2026-10',
    limit: 5000,
    alertThreshold: 90,
  };

  it('accepts a valid budget', () => {
    expect(() => BudgetSchema.parse(validBudget)).not.toThrow();
  });

  it('rejects limit of 0', () => {
    expect(BudgetSchema.safeParse({ ...validBudget, limit: 0 }).success).toBe(false);
  });

  it('rejects invalid month format', () => {
    expect(BudgetSchema.safeParse({ ...validBudget, month: '10-2026' }).success).toBe(false);
  });

  it('rejects alertThreshold > 100', () => {
    expect(BudgetSchema.safeParse({ ...validBudget, alertThreshold: 101 }).success).toBe(false);
  });

  it('rejects alertThreshold = 0', () => {
    expect(BudgetSchema.safeParse({ ...validBudget, alertThreshold: 0 }).success).toBe(false);
  });

  it('accepts threshold at boundary values (1 and 100)', () => {
    expect(BudgetSchema.safeParse({ ...validBudget, alertThreshold: 1 }).success).toBe(true);
    expect(BudgetSchema.safeParse({ ...validBudget, alertThreshold: 100 }).success).toBe(true);
  });
});

// ── GoalSchema ────────────────────────────────────────────────────────────────

describe('GoalSchema', () => {
  const validGoal = {
    name: 'Emergency Fund',
    targetAmount: 100000,
    savedAmount: 20000,
    targetDate: '2027-06-30',
  };

  it('accepts a valid goal', () => {
    expect(() => GoalSchema.parse(validGoal)).not.toThrow();
  });

  it('rejects an empty goal name', () => {
    expect(GoalSchema.safeParse({ ...validGoal, name: '' }).success).toBe(false);
  });

  it('rejects negative targetAmount', () => {
    expect(GoalSchema.safeParse({ ...validGoal, targetAmount: -1 }).success).toBe(false);
  });

  it('rejects negative savedAmount', () => {
    expect(GoalSchema.safeParse({ ...validGoal, savedAmount: -1 }).success).toBe(false);
  });

  it('accepts savedAmount = 0 (goal not started)', () => {
    expect(GoalSchema.safeParse({ ...validGoal, savedAmount: 0 }).success).toBe(true);
  });

  it('rejects invalid targetDate format', () => {
    expect(GoalSchema.safeParse({ ...validGoal, targetDate: '30-06-2027' }).success).toBe(false);
  });
});
