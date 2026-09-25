import { create } from 'zustand';
import { persist, createJSONStorage, StorageValue } from 'zustand/middleware';

interface SettingsState {
  defaultCurrency: string;
  theme: 'light' | 'dark' | 'system';
  selectedMonth: string; // "YYYY-MM"
  setDefaultCurrency: (currency: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSelectedMonth: (month: string) => void;
}

function getCurrentLocalMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
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

      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),
      setTheme: (theme) => set({ theme }),
      setSelectedMonth: (month) => set({ selectedMonth: month }),
    }),
    {
      name: 'capflow-settings', // overridden at runtime via rehydrateSettings
      storage: createJSONStorage(() => localStorage),
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
  };
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StorageValue<Partial<SettingsState>>;
      const stored = parsed?.state ?? {};
      useSettingsStore.setState({
        defaultCurrency: stored.defaultCurrency ?? defaults.defaultCurrency,
        theme: (stored.theme as SettingsState['theme']) ?? defaults.theme,
        selectedMonth: stored.selectedMonth ?? defaults.selectedMonth,
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
