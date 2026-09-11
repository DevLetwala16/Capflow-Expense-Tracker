import Dexie, { Table } from 'dexie';

export interface User {
  id?: number;
  email: string;
  name: string;
  avatar?: string;
  defaultCurrency: string;
  theme: 'light' | 'dark' | 'system';
  emailNotifications: {
    emiReminders: boolean;
    monthlyStatement: boolean;
    emiEmailSync: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id?: number;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  order: number;
  isDefault: boolean;
  createdAt: string;
}

export interface Transaction {
  id?: number;
  type: 'expense' | 'income';
  amount: number;
  currency: string;
  categoryId: number;
  title: string;
  notes?: string;
  date: string;
  paymentMethod: 'cash' | 'credit_card' | 'bank_transfer' | 'upi';
  receiptImage?: string;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    endDate?: string;
    nextOccurrence?: string;
    parentId?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id?: number;
  categoryId: number;
  month: string;
  limit: number;
  alertThreshold: number;
  createdAt: string;
}

export interface Goal {
  id?: number;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  icon: string;
  color: string;
  autoContributionRule?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EMI {
  id?: number;
  name: string;
  totalCost: number;
  monthlyCost: number;
  startDate: string;
  endDate: string;
  dueDay: number;
  totalInstallments: number;
  paidInstallments: number;
  reminderLeadDays: number;
  emailSyncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ExpenseTrackerDB extends Dexie {
  users!: Table<User>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;
  budgets!: Table<Budget>;
  goals!: Table<Goal>;
  emis!: Table<EMI>;

  constructor() {
    super('ExpenseTrackerDB');
    this.version(1).stores({
      users:        '++id, email',
      categories:   '++id, order, type',
      transactions: '++id, date, categoryId, type, [categoryId+date], paymentMethod',
      budgets:      '++id, [categoryId+month], categoryId, month',
      goals:        '++id, targetDate',
      emis:         '++id, dueDay, name',
    });
  }
}

export const db = new ExpenseTrackerDB();

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food',          icon: 'utensils',        color: '#F97316', type: 'expense', order: 1,  isDefault: true, createdAt: new Date().toISOString() },
  { name: 'Rent',          icon: 'home',            color: '#6366F1', type: 'expense', order: 2,  isDefault: true, createdAt: new Date().toISOString() },
  { name: 'Travel',        icon: 'plane',           color: '#0EA5E9', type: 'expense', order: 3,  isDefault: true, createdAt: new Date().toISOString() },
  { name: 'Utilities',     icon: 'zap',             color: '#F59E0B', type: 'expense', order: 4,  isDefault: true, createdAt: new Date().toISOString() },
  { name: 'Entertainment', icon: 'clapperboard',    color: '#EC4899', type: 'expense', order: 5,  isDefault: true, createdAt: new Date().toISOString() },
  { name: 'Shopping',      icon: 'shopping-bag',    color: '#8B5CF6', type: 'expense', order: 6,  isDefault: true, createdAt: new Date().toISOString() },
  { name: 'Health',        icon: 'heart-pulse',     color: '#10B981', type: 'expense', order: 7,  isDefault: true, createdAt: new Date().toISOString() },
  { name: 'EMI',           icon: 'banknote',        color: '#EF4444', type: 'expense', order: 8,  isDefault: true, createdAt: new Date().toISOString() },
  { name: 'Salary',        icon: 'wallet',          color: '#34D399', type: 'income',  order: 9,  isDefault: true, createdAt: new Date().toISOString() },
  { name: 'Other',         icon: 'circle-ellipsis', color: '#94A3B8', type: 'both',    order: 10, isDefault: true, createdAt: new Date().toISOString() },
];

export async function seedDefaultCategories(): Promise<void> {
  const count = await db.categories.count();
  if (count === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  }
}
