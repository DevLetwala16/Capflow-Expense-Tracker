import { create } from 'zustand';
import { persist, createJSONStorage, StorageValue } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AutoLockTimeout = 'immediate' | '1min' | '5min' | 'never';
export type FontScale = 'small' | 'medium' | 'default' | 'large' | 'xlarge';
export type Density = 'standard' | 'compact';
export type AccentPreset = 'indigo' | 'emerald' | 'purple' | 'orange' | 'blue';
export type NumberingSystem = 'western' | 'indian';

export interface AutoCategorizeRule {
  keyword: string;
  category: string;
}

export interface UserSession {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

interface SettingsState {
  // ── Existing fields ────────────────────────────────────────────────────────
  defaultCurrency: string;
  theme: 'light' | 'dark' | 'system';
  selectedMonth: string; // "YYYY-MM"
  notifEMIReminders: boolean;
  notifEMISync: boolean;
  notifMonthlyStatement: boolean;

  // ── Profile ────────────────────────────────────────────────────────────────
  /** User's display name shown in the UI */
  displayName: string;
  /** Contact phone number (optional) */
  phone: string;
  /** Base64/webp data-URL of the profile photo (empty = use initials avatar) */
  profilePhoto: string;
  /** Immutable member ID shown on the profile card */
  memberId: string;
  paymentQrCode: string;
  paymentUpiId: string;

  // ── Privacy & Security ─────────────────────────────────────────────────────
  /** When true, balance figures are blurred/hidden until the user taps to reveal */
  balanceMasked: boolean;
  /** Auto-lock the app after this period of inactivity */
  autoLockTimeout: AutoLockTimeout;
  /** App Lock enabled toggle */
  appLockEnabled: boolean;
  /** 4-digit PIN for app lock */
  appLockPin: string;
  /** Type of lock (biometric or pin) */
  appLockType: 'biometric' | 'pin';
  /** Active device sessions */
  sessions: UserSession[];

  // ── Appearance ─────────────────────────────────────────────────────────────
  /** Font-size scale applied via a CSS data-attribute on <html> */
  fontScale: FontScale;
  /** UI density — standard spacing vs compact spacing */
  density: Density;
  /** Named accent-colour preset */
  accentPreset: AccentPreset;
  /** Custom hex accent colour; when non-empty it overrides accentPreset */
  customAccent: string;
  /** Custom hex background color (optional override) */
  customBackground: string;
  /** Custom hex surface/card color (optional override) */
  customSurface: string;
  /** Automatically switch light/dark theme based on time of day */
  timeBasedTheme: boolean;

  // ── Locale & Finance ───────────────────────────────────────────────────────
  /** Default payment method pre-selected on the add-expense form */
  defaultPaymentMethod: string;
  /** First month of the fiscal year (1 = Jan, 4 = Apr, etc.) */
  fiscalStartMonth: number;
  /** Number-formatting system used for large amounts */
  numberingSystem: NumberingSystem;
  /** Overall monthly spending target (0 = auto-calculate from category budgets or income) */
  monthlySpendingBudget: number;

  // ── Notifications ──────────────────────────────────────────────────────────
  emailAlertsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  /** HH:MM string for daily reminder, empty string = disabled */
  dailyReminderTime: string;
  /** Fire a notification when a budget reaches 80 % */
  budgetAlert80: boolean;
  /** Fire a notification when a budget is fully consumed (100 %) */
  budgetAlert100: boolean;
  /** Toggle for the daily spending-summary reminder */
  notifDailyReminder: boolean;
  /** Hardware & Permissions */
  hasPromptedPermissions: boolean;
  cameraPermission: 'prompt' | 'granted' | 'denied';
  notificationPermission: 'prompt' | 'granted' | 'denied';
  lastDailyReminderDate: string;
  lastMonthlyStatementSentMonth: string;

  // ── Auto-Categorisation ────────────────────────────────────────────────────
  /** Keyword → category mapping rules applied when auto-tagging new expenses */
  autoCategorizeRules: AutoCategorizeRule[];

  // ── Existing setters ───────────────────────────────────────────────────────
  setDefaultCurrency: (currency: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSelectedMonth: (month: string) => void;
  setNotifEMIReminders: (val: boolean) => void;
  setNotifEMISync: (val: boolean) => void;
  setNotifMonthlyStatement: (val: boolean) => void;

  // ── New setters ────────────────────────────────────────────────────────────
  setDisplayName: (val: string) => void;
  setPhone: (val: string) => void;
  setProfilePhoto: (val: string) => void;
  setMemberId: (val: string) => void;
  setPaymentQrCode: (val: string) => void;
  setPaymentUpiId: (val: string) => void;
  setBalanceMasked: (val: boolean) => void;
  setAutoLockTimeout: (val: AutoLockTimeout) => void;
  setFontScale: (val: FontScale) => void;
  setDensity: (val: Density) => void;
  setAccentPreset: (val: AccentPreset) => void;
  setCustomAccent: (val: string) => void;
  setCustomBackground: (val: string) => void;
  setCustomSurface: (val: string) => void;
  setTimeBasedTheme: (val: boolean) => void;
  setDefaultPaymentMethod: (val: string) => void;
  setFiscalStartMonth: (val: number) => void;
  setNumberingSystem: (val: NumberingSystem) => void;
  setMonthlySpendingBudget: (val: number) => void;
  setEmailAlertsEnabled: (val: boolean) => void;
  setPushNotificationsEnabled: (val: boolean) => void;
  setDailyReminderTime: (val: string) => void;
  setBudgetAlert80: (val: boolean) => void;
  setBudgetAlert100: (val: boolean) => void;
  setNotifDailyReminder: (val: boolean) => void;
  setHasPromptedPermissions: (val: boolean) => void;
  setCameraPermission: (val: 'prompt' | 'granted' | 'denied') => void;
  setNotificationPermission: (val: 'prompt' | 'granted' | 'denied') => void;
  setLastDailyReminderDate: (val: string) => void;
  setLastMonthlyStatementSentMonth: (val: string) => void;
  setAutoCategorizeRules: (val: AutoCategorizeRule[]) => void;
  setAppLockEnabled: (val: boolean) => void;
  setAppLockPin: (val: string) => void;
  setAppLockType: (val: 'biometric' | 'pin') => void;
  setSessions: (val: UserSession[]) => void;
  removeOtherSessions: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Defaults (single source of truth — used in store init AND rehydrateSettings)
// ---------------------------------------------------------------------------

const DEFAULTS = {
  // existing
  defaultCurrency: 'INR',
  theme: 'system' as const,
  selectedMonth: getCurrentLocalMonth(),
  notifEMIReminders: false,
  notifEMISync: false,
  notifMonthlyStatement: false,

  // profile
  displayName: '',
  phone: '',
  profilePhoto: '',
  memberId: '',
  paymentQrCode: '',
  paymentUpiId: '',

  // privacy & security
  balanceMasked: false,
  autoLockTimeout: 'never' as AutoLockTimeout,

  // appearance
  fontScale: 'default' as FontScale,
  density: 'standard' as Density,
  accentPreset: 'indigo' as AccentPreset,
  customAccent: '',
  customBackground: '',
  customSurface: '',
  timeBasedTheme: false,

  // locale & finance
  defaultPaymentMethod: 'Cash',
  fiscalStartMonth: 1,
  numberingSystem: 'western' as NumberingSystem,
  monthlySpendingBudget: 0,

  // notifications
  emailAlertsEnabled: false,
  pushNotificationsEnabled: false,
  dailyReminderTime: '',
  budgetAlert80: true,
  budgetAlert100: true,
  notifDailyReminder: false,
  hasPromptedPermissions: false,
  cameraPermission: 'prompt' as 'prompt' | 'granted' | 'denied',
  notificationPermission: 'prompt' as 'prompt' | 'granted' | 'denied',
  lastDailyReminderDate: '',
  lastMonthlyStatementSentMonth: '',

  // auto-categorisation
  autoCategorizeRules: [] as AutoCategorizeRule[],

  // app lock & sessions
  appLockEnabled: false,
  appLockPin: '',
  appLockType: 'pin' as const,
  sessions: [
    {
      id: 'sess-current',
      device: 'Current Device',
      browser: 'Web App',
      os: 'Active OS',
      ip: '127.0.0.1',
      lastActive: 'Just now',
      isCurrent: true,
    },
  ] as UserSession[],
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * User-scoped settings store.
 * Persist key changes when the user logs in/out — call `rehydrateSettings(userId)`
 * from the app layout after the user is known.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      // ── Existing setters ─────────────────────────────────────────────────
      setDefaultCurrency: (currency) => set({ defaultCurrency: currency }),
      setTheme: (theme) => set({ theme }),
      setSelectedMonth: (month) => set({ selectedMonth: month }),
      setNotifEMIReminders: (val) => set({ notifEMIReminders: val }),
      setNotifEMISync: (val) => set({ notifEMISync: val }),
      setNotifMonthlyStatement: (val) => set({ notifMonthlyStatement: val }),

      // ── New setters ──────────────────────────────────────────────────────
      setDisplayName: (val) => set({ displayName: val }),
      setPhone: (val) => set({ phone: val }),
      setProfilePhoto: (val) => set({ profilePhoto: val }),
      setMemberId: (val) => set({ memberId: val }),
      setPaymentQrCode: (val) => set({ paymentQrCode: val }),
      setPaymentUpiId: (val) => set({ paymentUpiId: val }),
      setBalanceMasked: (val) => set({ balanceMasked: val }),
      setAutoLockTimeout: (val) => set({ autoLockTimeout: val }),
      setFontScale: (val) => set({ fontScale: val }),
      setDensity: (val) => set({ density: val }),
      setAccentPreset: (val) => set({ accentPreset: val }),
      setCustomAccent: (val) => set({ customAccent: val }),
      setCustomBackground: (val) => set({ customBackground: val }),
      setCustomSurface: (val) => set({ customSurface: val }),
      setTimeBasedTheme: (val) => set({ timeBasedTheme: val }),
      setDefaultPaymentMethod: (val) => set({ defaultPaymentMethod: val }),
      setFiscalStartMonth: (val) => set({ fiscalStartMonth: val }),
      setNumberingSystem: (val) => set({ numberingSystem: val }),
      setMonthlySpendingBudget: (val) => set({ monthlySpendingBudget: val }),
      setEmailAlertsEnabled: (val) => set({ emailAlertsEnabled: val }),
      setPushNotificationsEnabled: (val) => set({ pushNotificationsEnabled: val }),
      setDailyReminderTime: (val) => set({ dailyReminderTime: val }),
      setBudgetAlert80: (val) => set({ budgetAlert80: val }),
      setBudgetAlert100: (val) => set({ budgetAlert100: val }),
      setNotifDailyReminder: (val) => set({ notifDailyReminder: val }),
      setHasPromptedPermissions: (val) => set({ hasPromptedPermissions: val }),
      setCameraPermission: (val) => set({ cameraPermission: val }),
      setNotificationPermission: (val) => set({ notificationPermission: val }),
      setLastDailyReminderDate: (val) => set({ lastDailyReminderDate: val }),
      setLastMonthlyStatementSentMonth: (val) => set({ lastMonthlyStatementSentMonth: val }),
      setAutoCategorizeRules: (val) => set({ autoCategorizeRules: val }),
      setAppLockEnabled: (val) => set({ appLockEnabled: val }),
      setAppLockPin: (val) => set({ appLockPin: val }),
      setAppLockType: (val) => set({ appLockType: val }),
      setSessions: (val) => set({ sessions: val }),
      removeOtherSessions: () =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.isCurrent),
        })),
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

// ---------------------------------------------------------------------------
// rehydrateSettings
// ---------------------------------------------------------------------------

/**
 * Switch the settings store's persistence key to the given user's scoped key
 * and re-hydrate from localStorage. Call once after authenticating the user.
 */
export function rehydrateSettings(userId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const key = getSettingsKey(userId);
  const raw = localStorage.getItem(key);

  // Manually apply stored values (or defaults) to the in-memory store
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StorageValue<Partial<SettingsState>>;
      const s = parsed?.state ?? {};
      useSettingsStore.setState({
        // existing
        defaultCurrency: s.defaultCurrency ?? DEFAULTS.defaultCurrency,
        theme: (s.theme as SettingsState['theme']) ?? DEFAULTS.theme,
        // ← resolveMonth prevents a stale past month from being restored
        selectedMonth: resolveMonth(s.selectedMonth),
        notifEMIReminders: s.notifEMIReminders ?? DEFAULTS.notifEMIReminders,
        notifEMISync: s.notifEMISync ?? DEFAULTS.notifEMISync,
        notifMonthlyStatement: s.notifMonthlyStatement ?? DEFAULTS.notifMonthlyStatement,

        // profile
        displayName: s.displayName ?? DEFAULTS.displayName,
        phone: s.phone ?? DEFAULTS.phone,
        profilePhoto: s.profilePhoto ?? DEFAULTS.profilePhoto,
        memberId: s.memberId ?? DEFAULTS.memberId,
        paymentQrCode: s.paymentQrCode ?? DEFAULTS.paymentQrCode,
        paymentUpiId: s.paymentUpiId ?? DEFAULTS.paymentUpiId,

        // privacy & security
        balanceMasked: s.balanceMasked ?? DEFAULTS.balanceMasked,
        autoLockTimeout: (s.autoLockTimeout as AutoLockTimeout) ?? DEFAULTS.autoLockTimeout,

        // appearance
        fontScale: (s.fontScale as FontScale) ?? DEFAULTS.fontScale,
        density: (s.density as Density) ?? DEFAULTS.density,
        accentPreset: (s.accentPreset as AccentPreset) ?? DEFAULTS.accentPreset,
        customAccent: s.customAccent ?? DEFAULTS.customAccent,
        customBackground: s.customBackground ?? DEFAULTS.customBackground,
        customSurface: s.customSurface ?? DEFAULTS.customSurface,
        timeBasedTheme: s.timeBasedTheme ?? DEFAULTS.timeBasedTheme,

        // locale & finance
        defaultPaymentMethod: s.defaultPaymentMethod ?? DEFAULTS.defaultPaymentMethod,
        fiscalStartMonth: s.fiscalStartMonth ?? DEFAULTS.fiscalStartMonth,
        numberingSystem: (s.numberingSystem as NumberingSystem) ?? DEFAULTS.numberingSystem,
        monthlySpendingBudget: s.monthlySpendingBudget ?? DEFAULTS.monthlySpendingBudget,

        // notifications
        emailAlertsEnabled: s.emailAlertsEnabled ?? DEFAULTS.emailAlertsEnabled,
        pushNotificationsEnabled: s.pushNotificationsEnabled ?? DEFAULTS.pushNotificationsEnabled,
        dailyReminderTime: s.dailyReminderTime ?? DEFAULTS.dailyReminderTime,
        budgetAlert80: s.budgetAlert80 ?? DEFAULTS.budgetAlert80,
        budgetAlert100: s.budgetAlert100 ?? DEFAULTS.budgetAlert100,
        notifDailyReminder: s.notifDailyReminder ?? DEFAULTS.notifDailyReminder,
        hasPromptedPermissions: s.hasPromptedPermissions ?? DEFAULTS.hasPromptedPermissions,
        cameraPermission: (s.cameraPermission as any) ?? DEFAULTS.cameraPermission,
        notificationPermission: (s.notificationPermission as any) ?? DEFAULTS.notificationPermission,
        lastDailyReminderDate: s.lastDailyReminderDate ?? DEFAULTS.lastDailyReminderDate,
        lastMonthlyStatementSentMonth: s.lastMonthlyStatementSentMonth ?? DEFAULTS.lastMonthlyStatementSentMonth,

        // auto-categorisation
        autoCategorizeRules: s.autoCategorizeRules ?? DEFAULTS.autoCategorizeRules,

        // app lock & sessions
        appLockEnabled: s.appLockEnabled ?? DEFAULTS.appLockEnabled,
        appLockPin: s.appLockPin ?? DEFAULTS.appLockPin,
        appLockType: s.appLockType ?? DEFAULTS.appLockType,
        sessions: s.sessions ?? DEFAULTS.sessions,
      });
    } catch {
      useSettingsStore.setState({ ...DEFAULTS, selectedMonth: resolveMonth(null) });
    }
  } else {
    useSettingsStore.setState({ ...DEFAULTS, selectedMonth: resolveMonth(null) });
  }

  // Subscribe future changes so they are saved under the user-scoped key
  const unsubscribe = useSettingsStore.subscribe((state) => {
    const toSave: StorageValue<Partial<SettingsState>> = {
      state: {
        // existing
        defaultCurrency: state.defaultCurrency,
        theme: state.theme,
        selectedMonth: state.selectedMonth,
        notifEMIReminders: state.notifEMIReminders,
        notifEMISync: state.notifEMISync,
        notifMonthlyStatement: state.notifMonthlyStatement,

        // profile
        displayName: state.displayName,
        phone: state.phone,
        profilePhoto: state.profilePhoto,
        memberId: state.memberId,
        paymentQrCode: state.paymentQrCode,
        paymentUpiId: state.paymentUpiId,

        // privacy & security
        balanceMasked: state.balanceMasked,
        autoLockTimeout: state.autoLockTimeout,

        // appearance
        fontScale: state.fontScale,
        density: state.density,
        accentPreset: state.accentPreset,
        customAccent: state.customAccent,
        customBackground: state.customBackground,
        customSurface: state.customSurface,
        timeBasedTheme: state.timeBasedTheme,

        // locale & finance
        defaultPaymentMethod: state.defaultPaymentMethod,
        fiscalStartMonth: state.fiscalStartMonth,
        numberingSystem: state.numberingSystem,
        monthlySpendingBudget: state.monthlySpendingBudget,

        // notifications
        emailAlertsEnabled: state.emailAlertsEnabled,
        pushNotificationsEnabled: state.pushNotificationsEnabled,
        dailyReminderTime: state.dailyReminderTime,
        budgetAlert80: state.budgetAlert80,
        budgetAlert100: state.budgetAlert100,
        notifDailyReminder: state.notifDailyReminder,
        hasPromptedPermissions: state.hasPromptedPermissions,
        cameraPermission: state.cameraPermission,
        notificationPermission: state.notificationPermission,
        lastDailyReminderDate: state.lastDailyReminderDate,
        lastMonthlyStatementSentMonth: state.lastMonthlyStatementSentMonth,

        // auto-categorisation
        autoCategorizeRules: state.autoCategorizeRules,

        // app lock & sessions
        appLockEnabled: state.appLockEnabled,
        appLockPin: state.appLockPin,
        appLockType: state.appLockType,
        sessions: state.sessions,
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
