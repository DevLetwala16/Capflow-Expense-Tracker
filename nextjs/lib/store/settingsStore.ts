import { create } from 'zustand';
import { persist, createJSONStorage, StorageValue } from 'zustand/middleware';

interface SettingsState {
  defaultCurrency: string;
  theme: 'light' | 'dark' | 'system';
  selectedMonth: string; // "YYYY-MM"
  notifEMIReminders: boolean;
  notifEMISync: boolean;
  notifMonthlyStatement: boolean;
  setDefaultCurrency: (currency: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSelectedMonth: (month: string) => void;
  setNotifEMIReminders: (val: boolean) => void;
  setNotifEMISync: (val: boolean) => void;
  setNotifMonthlyStatement: (val: boolean) => void;
}

function getCurrentLocalMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Ensures the stored month is never in the past.
 *
 * Rule: if the user had "2026-09" persisted and today is "2026-10",
 * auto-advance to "2026-10" so the calendar/dashboard always open
 * on the current month after a month boundary is crossed.
 *
 * A month is "stale" when it is strictly earlier than today's month.
 * Future months (manually navigated forward) are preserved as-is.
 */
function resolveMonth(stored: string | null | undefined): string {
  const today = getCurrentLocalMonth();
  if (!stored || typeof stored !== 'string' || !/^\d{4}-\d{2}$/.test(stored)) {
    return today;
  }
  // Only auto-advance if stored month is strictly in the past
  return stored < today ? today : stored;
}

/**
 * Returns a localStorage key scoped to the given userId so that settings
 * (currency preference, theme, selected month) are isolated per account.
 */
export function getSettingsKey(userId: string | null | undefined): string {
  if (!userId) return 'capflow-settings';
  // Sanitize email / id into a safe key segment
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `capflow-settings-${safe}`;
}

/**
 * User-scoped settings store.
 * Persist key changes when the user logs in/out — call `rehydrateSettings(userId)`
 * from the app layout after the user is known.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultCurrency: 'INR',
      theme: 'system',
      selectedMonth: getCurrentLocalMonth(),
      notifEMIReminders: false,
      notifEMISync: false,
      notifMonthlyStatement: false,

      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),
      setTheme: (theme) => set({ theme }),
      setSelectedMonth: (month) => set({ selectedMonth: month }),
      setNotifEMIReminders: (val) => set({ notifEMIReminders: val }),
      setNotifEMISync: (val) => set({ notifEMISync: val }),
      setNotifMonthlyStatement: (val) => set({ notifMonthlyStatement: val }),
    }),
    {
      name: 'capflow-settings', // overridden at runtime via rehydrateSettings
      storage: createJSONStorage(() => localStorage),
      // After Zustand rehydrates from localStorage, correct any stale month
      onRehydrateStorage: () => (state) => {
        if (state) {
          const corrected = resolveMonth(state.selectedMonth);
          if (corrected !== state.selectedMonth) {
            state.selectedMonth = corrected;
          }
        }
      },
    }
  )
);

/**
 * Switch the settings store's persistence key to the given user's scoped key
 * and re-hydrate from localStorage. Call once after authenticating the user.
 */
export function rehydrateSettings(userId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const key = getSettingsKey(userId);
  const raw = localStorage.getItem(key);

  // Manually apply stored values (or defaults) to the in-memory store
  const defaults = {
    defaultCurrency: 'INR',
    theme: 'system' as const,
    selectedMonth: getCurrentLocalMonth(),
    notifEMIReminders: false,
    notifEMISync: false,
    notifMonthlyStatement: false,
  };
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StorageValue<Partial<SettingsState>>;
      const stored = parsed?.state ?? {};
      useSettingsStore.setState({
        defaultCurrency: stored.defaultCurrency ?? defaults.defaultCurrency,
        theme: (stored.theme as SettingsState['theme']) ?? defaults.theme,
        // ← resolveMonth prevents a stale past month from being restored
        selectedMonth: resolveMonth(stored.selectedMonth),
        notifEMIReminders: stored.notifEMIReminders ?? defaults.notifEMIReminders,
        notifEMISync: stored.notifEMISync ?? defaults.notifEMISync,
        notifMonthlyStatement: stored.notifMonthlyStatement ?? defaults.notifMonthlyStatement,
      });
    } catch {
      useSettingsStore.setState(defaults);
    }
  } else {
    useSettingsStore.setState(defaults);
  }

  // Subscribe future changes so they are saved under the user-scoped key
  const unsubscribe = useSettingsStore.subscribe((state) => {
    const toSave: StorageValue<Partial<SettingsState>> = {
      state: {
        defaultCurrency: state.defaultCurrency,
        theme: state.theme,
        selectedMonth: state.selectedMonth,
        notifEMIReminders: state.notifEMIReminders,
        notifEMISync: state.notifEMISync,
        notifMonthlyStatement: state.notifMonthlyStatement,
      },
      version: 0,
    };
    localStorage.setItem(key, JSON.stringify(toSave));
  });

  // Store the unsubscribe handle so we can swap it on next login
  if (typeof window !== 'undefined') {
    (window as Window & { __settingsUnsub?: () => void }).__settingsUnsub?.();
    (window as Window & { __settingsUnsub?: () => void }).__settingsUnsub = unsubscribe;
  }
}
