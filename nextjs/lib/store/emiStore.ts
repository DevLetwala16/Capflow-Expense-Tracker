import { create } from "zustand";
import { db, EMI } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

type NewEMIData = Omit<EMI, "id" | "userId" | "createdAt" | "updatedAt">;

interface EMIState {
  emis: EMI[];
  loading: boolean;
  loaded: boolean;

  loadEMIs: (userId: string) => Promise<void>;
  addEMI: (data: NewEMIData, userId: string) => Promise<number | undefined>;
  updateEMI: (id: number, updates: Partial<EMI>) => Promise<void>;
  deleteEMI: (id: number) => Promise<void>;
  /** Increments paidInstallments by 1, capped at totalInstallments */
  markInstallmentPaid: (id: number) => Promise<void>;

  // ── Computed helpers (call get() internally) ──────────────────────────────
  /** EMIs whose dueDay is within `leadDays` calendar days of today (inclusive) */
  dueToday: (leadDays?: number) => EMI[];
  /** EMIs that were due earlier this month and are not yet fully paid */
  overdue: () => EMI[];
  /** EMIs that are not overdue and not due within their reminderLeadDays window */
  upcoming: () => EMI[];
  /** Sum of all monthlyCost values */
  totalMonthlyEMIBurden: () => number;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

/**
 * Returns the number of installments that *should* have been paid by today
 * based on startDate and the current date.
 */
function expectedPaidByNow(emi: EMI): number {
  const start = new Date(emi.startDate);
  const now = new Date();
  // Number of full months elapsed since startDate
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  // If today hasn't yet reached the dueDay this month, the current month's
  // installment isn't due yet
  const dueThisMonthPast = now.getDate() >= emi.dueDay;
  return Math.min(
    Math.max(months + (dueThisMonthPast ? 1 : 0), 0),
    emi.totalInstallments
  );
}

/** Returns true when the EMI is overdue this month. */
function isOverdue(emi: EMI): boolean {
  const now = new Date();
  const today = now.getDate();
  // dueDay has passed this month
  if (today <= emi.dueDay) return false;
  // Check if this month's installment is already accounted for
  return emi.paidInstallments < expectedPaidByNow(emi);
}

/** Returns true when today is within reminderLeadDays of dueDay (but not past). */
function isDueSoon(emi: EMI): boolean {
  const today = new Date().getDate();
  if (today > emi.dueDay) return false; // already past
  return emi.dueDay - today <= emi.reminderLeadDays;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useEMIStore = create<EMIState>((set, get) => ({
  emis: [],
  loading: false,
  loaded: false,

  // ── CRUD ──────────────────────────────────────────────────────────────────

  loadEMIs: async (userId: string) => {
    const { loaded, emis } = get();
    // Avoid redundant fetches when already loaded for this session
    if (loaded && emis.length >= 0) {
      const firstUserId = emis[0]?.userId;
      if (!firstUserId || firstUserId === userId) return;
    }
    set({ loading: true });
    try {
      const list = await db.emis.where("userId").equals(userId).toArray();
      set({ emis: list, loading: false, loaded: true });
    } catch {
      set({ loading: false });
    }
  },

  addEMI: async (data: NewEMIData, userId: string) => {
    const now = new Date().toISOString();
    const id = await db.emis.add({
      ...data,
      userId,
      createdAt: now,
      updatedAt: now,
    } as EMI);
    const emi = await db.emis.get(id as number);
    if (emi) {
      set((state) => ({ emis: [...state.emis, emi] }));
    }
    return id as number;
  },

  updateEMI: async (id: number, updates: Partial<EMI>) => {
    const now = new Date().toISOString();
    await db.emis.update(id, { ...updates, updatedAt: now });
    set((state) => ({
      emis: state.emis.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: now } : e
      ),
    }));
  },

  deleteEMI: async (id: number) => {
    await db.emis.delete(id);
    set((state) => ({ emis: state.emis.filter((e) => e.id !== id) }));
  },

  markInstallmentPaid: async (id: number) => {
    const emi = get().emis.find((e) => e.id === id);
    if (!emi) return;
    const newPaid = Math.min(emi.paidInstallments + 1, emi.totalInstallments);
    await get().updateEMI(id, { paidInstallments: newPaid });
  },

  // ── Computed helpers ──────────────────────────────────────────────────────

  dueToday: (leadDays = 3) => {
    return get().emis.filter((emi) => {
      const today = new Date().getDate();
      const diff = emi.dueDay - today;
      return diff >= 0 && diff <= leadDays;
    });
  },

  overdue: () => get().emis.filter(isOverdue),

  upcoming: () =>
    get().emis.filter((emi) => !isOverdue(emi) && !isDueSoon(emi)),

  totalMonthlyEMIBurden: () =>
    get().emis.reduce((sum, e) => sum + e.monthlyCost, 0),
}));
