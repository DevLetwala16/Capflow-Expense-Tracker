/**
 * __tests__/unit/store/settingsStore.test.ts
 *
 * Unit tests for settingsStore helpers:
 *   - getSettingsKey()
 *   - resolveMonth() (tested through store rehydration)
 *   - Zustand state setters
 */

// Mock localStorage before importing the store
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import { getSettingsKey, useSettingsStore } from '@/lib/store/settingsStore';

describe('getSettingsKey()', () => {
  it('returns a generic key when userId is null', () => {
    expect(getSettingsKey(null)).toBe('capflow-settings');
  });

  it('returns a generic key when userId is undefined', () => {
    expect(getSettingsKey(undefined)).toBe('capflow-settings');
  });

  it('returns a user-scoped key for a normal email', () => {
    const key = getSettingsKey('user@example.com');
    expect(key).toBe('capflow-settings-user_example_com');
  });

  it('sanitizes special characters in userId', () => {
    const key = getSettingsKey('user+tag@example.com');
    expect(key).toMatch(/^capflow-settings-/);
    expect(key).not.toContain('+');
    expect(key).not.toContain('@');
  });
});

describe('settingsStore — initial state', () => {
  it('has INR as defaultCurrency', () => {
    expect(useSettingsStore.getState().defaultCurrency).toBe('INR');
  });

  it('has theme set to system', () => {
    expect(useSettingsStore.getState().theme).toBe('system');
  });

  it('has all notification toggles defaulting to false', () => {
    const state = useSettingsStore.getState();
    expect(state.notifEMIReminders).toBe(false);
    expect(state.notifEMISync).toBe(false);
    expect(state.notifMonthlyStatement).toBe(false);
  });

  it('selectedMonth is in YYYY-MM format', () => {
    const month = useSettingsStore.getState().selectedMonth;
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('settingsStore — setters', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      defaultCurrency: 'INR',
      theme: 'system',
      notifEMIReminders: false,
      notifEMISync: false,
      notifMonthlyStatement: false,
    });
  });

  it('setDefaultCurrency updates the currency', () => {
    useSettingsStore.getState().setDefaultCurrency('USD');
    expect(useSettingsStore.getState().defaultCurrency).toBe('USD');
  });

  it('setTheme updates the theme', () => {
    useSettingsStore.getState().setTheme('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('setNotifMonthlyStatement remains OFF by default (spec requirement)', () => {
    // Verify default is false (must never auto-enable)
    expect(useSettingsStore.getState().notifMonthlyStatement).toBe(false);
    // User explicitly enables it
    useSettingsStore.getState().setNotifMonthlyStatement(true);
    expect(useSettingsStore.getState().notifMonthlyStatement).toBe(true);
  });

  it('setNotifEMIReminders toggles correctly', () => {
    useSettingsStore.getState().setNotifEMIReminders(true);
    expect(useSettingsStore.getState().notifEMIReminders).toBe(true);
    useSettingsStore.getState().setNotifEMIReminders(false);
    expect(useSettingsStore.getState().notifEMIReminders).toBe(false);
  });

  it('setSelectedMonth updates the month string', () => {
    useSettingsStore.getState().setSelectedMonth('2026-12');
    expect(useSettingsStore.getState().selectedMonth).toBe('2026-12');
  });
});
