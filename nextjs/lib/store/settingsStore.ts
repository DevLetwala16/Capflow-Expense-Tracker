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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultCurrency: 'INR',
      theme: 'system',
      selectedMonth: new Date().toISOString().slice(0, 7),

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
