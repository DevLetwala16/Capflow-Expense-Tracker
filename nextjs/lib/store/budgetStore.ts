import { create } from "zustand";
import { db, Budget, Goal } from "@/lib/db";

// ─── State types ──────────────────────────────────────────────────────────────

type NewBudgetData = Omit<Budget, "id" | "createdAt">;
type NewGoalData = Omit<Goal, "id" | "createdAt" | "updatedAt">;

interface BudgetState {
  budgets: Budget[];
  goals: Goal[];
  loading: boolean;
  loadedMonth: string | null;
  goalsLoaded: boolean;

  loadBudgets: (month: string, force?: boolean) => Promise<void>;
  addBudget: (data: NewBudgetData) => Promise<void>;
  updateBudget: (id: number, updates: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: number) => Promise<void>;

  loadGoals: (force?: boolean) => Promise<void>;
  addGoal: (data: NewGoalData) => Promise<void>;
  updateGoal: (id: number, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: number) => Promise<void>;
  addFundsToGoal: (id: number, amount: number) => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  goals: [],
  loading: false,
  loadedMonth: null,
  goalsLoaded: false,

  // ── Budgets ──────────────────────────────────────────────────────────────

  loadBudgets: async (month: string, force = false) => {
    const { loadedMonth, budgets } = get();
    if (!force && loadedMonth === month && budgets.length >= 0 && loadedMonth !== null) {
      return;
    }
    set({ loading: true });
    const bList = await db.budgets
      .where("month")
      .equals(month)
      .toArray();
    set({ budgets: bList, loading: false, loadedMonth: month });
  },

  addBudget: async (data: NewBudgetData) => {
    const now = new Date().toISOString();
    // Prevent duplicate budget for same category+month
    const existing = await db.budgets
      .where("[categoryId+month]")
      .equals([data.categoryId, data.month])
      .first();
    if (existing) {
      // Update instead of duplicate
      await db.budgets.update(existing.id!, {
        limit: data.limit,
        alertThreshold: data.alertThreshold,
      });
      set((state) => ({
        budgets: state.budgets.map((b) =>
          b.id === existing.id ? { ...b, limit: data.limit, alertThreshold: data.alertThreshold } : b
        ),
      }));
      return;
    }
    const id = await db.budgets.add({ ...data, createdAt: now } as Budget);
    const budget = await db.budgets.get(id as number);
    if (budget) {
      set((state) => ({ budgets: [...state.budgets, budget] }));
    }
  },

  updateBudget: async (id: number, updates: Partial<Budget>) => {
    await db.budgets.update(id, updates);
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }));
  },

  deleteBudget: async (id: number) => {
    await db.budgets.delete(id);
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
    }));
  },

  // ── Goals ────────────────────────────────────────────────────────────────

  loadGoals: async (force = false) => {
    const { goalsLoaded, goals } = get();
    if (!force && goalsLoaded && goals.length >= 0) {
      return;
    }
    const goalsList = await db.goals.toArray();
    set({ goals: goalsList, goalsLoaded: true });
  },

  addGoal: async (data: NewGoalData) => {
    const now = new Date().toISOString();
    const id = await db.goals.add({
      ...data,
      savedAmount: data.savedAmount ?? 0,
      createdAt: now,
      updatedAt: now,
    } as Goal);
    const goal = await db.goals.get(id as number);
    if (goal) {
      set((state) => ({ goals: [...state.goals, goal] }));
    }
  },

  updateGoal: async (id: number, updates: Partial<Goal>) => {
    const now = new Date().toISOString();
    await db.goals.update(id, { ...updates, updatedAt: now });
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id ? { ...g, ...updates, updatedAt: now } : g
      ),
    }));
  },

  deleteGoal: async (id: number) => {
    await db.goals.delete(id);
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
  },

  addFundsToGoal: async (id: number, amount: number) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;
    const newSaved = Math.min(goal.savedAmount + amount, goal.targetAmount);
    await get().updateGoal(id, { savedAmount: newSaved });
  },
}));
