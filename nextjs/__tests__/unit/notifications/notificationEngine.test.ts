/**
 * __tests__/unit/notifications/notificationEngine.test.ts
 *
 * Unit tests for Notification & Reminders Engine:
 *   - Device permissions checks and requests
 *   - Daily expense reminder (Duolingo/Zomato style)
 *   - EMI due date alerts
 *   - 80% & 100% budget threshold warnings
 */

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

// Mock Notification API
const mockNotification = jest.fn();
(mockNotification as any).permission = "granted";
(mockNotification as any).requestPermission = jest.fn().mockResolvedValue("granted");
Object.defineProperty(global, "Notification", {
  value: mockNotification,
  writable: true,
});

// Mock navigator.vibrate
Object.defineProperty(navigator, "vibrate", {
  value: jest.fn(),
  writable: true,
});

import { useSettingsStore } from "@/lib/store/settingsStore";
import {
  checkDevicePermissions,
  requestNotificationPermission,
  checkEMIDueReminders,
  checkBudgetWarnings,
} from "@/lib/notifications/notificationEngine";
import { EMI, Budget, Category, Transaction } from "@/lib/db";
import { format } from "date-fns";

describe("NotificationEngine — Permissions", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it("checks device permission status correctly", async () => {
    const status = await checkDevicePermissions();
    expect(status.notifications).toBe("granted");
    expect(status.camera).toBeDefined();
  });

  it("requestNotificationPermission updates settingsStore when granted", async () => {
    const res = await requestNotificationPermission();
    expect(res).toBe("granted");

    const state = useSettingsStore.getState();
    expect(state.pushNotificationsEnabled).toBe(true);
    expect(state.notifDailyReminder).toBe(true);
    expect(state.dailyReminderTime).toBe("21:00");
  });
});

describe("NotificationEngine — EMI Due Reminders", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    useSettingsStore.setState({
      pushNotificationsEnabled: true,
    });
  });

  it("fires alerts for EMIs due today", async () => {
    const todayDate = new Date().getDate();
    const sampleEmis: EMI[] = [
      {
        id: 101,
        userId: "test@example.com",
        name: "HDFC Home Loan",
        totalCost: 500000,
        monthlyCost: 25000,
        startDate: "2026-01-01",
        endDate: "2028-01-01",
        dueDay: todayDate,
        totalInstallments: 24,
        paidInstallments: 5,
        reminderLeadDays: 3,
        emailSyncEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const sent = await checkEMIDueReminders(sampleEmis);
    expect(sent).toBe(1);

    // Running a second time should not duplicate
    const sentAgain = await checkEMIDueReminders(sampleEmis);
    expect(sentAgain).toBe(0);
  });
});

describe("NotificationEngine — Budget Warnings", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    useSettingsStore.setState({
      pushNotificationsEnabled: true,
      budgetAlert80: true,
      budgetAlert100: true,
    });
  });

  it("fires warning when spending reaches 80% and alert when 100% exceeded", async () => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const todayStr = format(new Date(), "yyyy-MM-dd");

    const categories: Category[] = [
      {
        id: 1,
        userId: "test@example.com",
        name: "Groceries",
        icon: "shopping-bag",
        color: "#6366F1",
        type: "expense",
        order: 1,
        isDefault: true,
        createdAt: new Date().toISOString(),
      },
    ];

    const budgets: Budget[] = [
      {
        id: 10,
        userId: "test@example.com",
        categoryId: 1,
        month: currentMonth,
        limit: 10000,
        alertThreshold: 80,
        createdAt: new Date().toISOString(),
      },
    ];

    // Scenario 1: Spent 8500 out of 10000 (85% -> 80% warning)
    const tx80: Transaction[] = [
      {
        id: 201,
        userId: "test@example.com",
        type: "expense",
        amount: 8500,
        currency: "INR",
        categoryId: 1,
        title: "Supermarket shopping",
        date: todayStr,
        paymentMethod: "upi",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const count80 = await checkBudgetWarnings(budgets, categories, tx80);
    expect(count80).toBe(1);

    // Running again for 80% should not re-fire
    const countRepeat = await checkBudgetWarnings(budgets, categories, tx80);
    expect(countRepeat).toBe(0);

    // Scenario 2: Spent 10500 out of 10000 (105% -> 100% exceeded)
    const tx100: Transaction[] = [
      {
        id: 202,
        userId: "test@example.com",
        type: "expense",
        amount: 10500,
        currency: "INR",
        categoryId: 1,
        title: "Large grocery run",
        date: todayStr,
        paymentMethod: "credit_card",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const count100 = await checkBudgetWarnings(budgets, categories, tx100);
    expect(count100).toBe(1);
  });
});
