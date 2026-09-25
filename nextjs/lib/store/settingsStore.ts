import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
      name: 'capflow-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
