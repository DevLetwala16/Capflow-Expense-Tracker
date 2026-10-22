"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useEMIStore } from "@/lib/store/emiStore";
import { useBudgetStore } from "@/lib/store/budgetStore";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { useTransactionStore } from "@/lib/store/transactionStore";
import {
  checkDailyExpenseReminder,
  checkEMIDueReminders,
  checkBudgetWarnings,
  checkAutomatedMonthlyStatementEmail,
  subscribeUserToWebPush,
} from "@/lib/notifications/notificationEngine";
import { format } from "date-fns";

export function useNotificationEngine() {
  const { user } = useAuthStore();
  const settings = useSettingsStore();
  const { emis } = useEMIStore();
  const { budgets } = useBudgetStore();
  const { categories } = useCategoryStore();
  const { transactions } = useTransactionStore();

  const isRunningRef = useRef(false);

  useEffect(() => {
    async function runAllNotificationChecks() {
      if (isRunningRef.current) return;
      isRunningRef.current = true;

      try {
        const userId = user?.id || user?.email;

        // Ensure Web Push subscription is registered on the device and server for background alerts
        if (settings.pushNotificationsEnabled && typeof window !== "undefined") {
          subscribeUserToWebPush(user?.id, user?.email).catch(() => {});
        }

        // 1. Daily expense reminder (Zomato/Duolingo style)
        if (settings.notifDailyReminder && userId) {
          await checkDailyExpenseReminder(userId);
        }

        // 2. Native EMI Due Alerts (client push/system notifications)
        if (settings.pushNotificationsEnabled && emis.length > 0) {
          await checkEMIDueReminders(emis);
        }

        // 3. Budget Threshold Warnings (80% / 100%)
        if (
          (settings.budgetAlert80 || settings.budgetAlert100) &&
          budgets.length > 0 &&
          transactions.length > 0
        ) {
          await checkBudgetWarnings(budgets, categories, transactions);
        }

        // 4. Automated Monthly Statement Email
        if (user?.email && (settings.notifMonthlyStatement || settings.emailAlertsEnabled)) {
          await checkAutomatedMonthlyStatementEmail(user, categories);
        }

        // 5. Automated Server-side EMI Due Email Check (Once per day)
        if (user?.email && (settings.emailAlertsEnabled || settings.notifEMISync)) {
          const todayStr = format(new Date(), "yyyy-MM-dd");
          const lastEmailCheckKey = `capflow_last_emi_email_check_${user.email}`;
          if (localStorage.getItem(lastEmailCheckKey) !== todayStr) {
            try {
              await fetch("/api/notifications/check-emi-due", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: user.email,
                  emis: emis.map((e) => ({
                    name: e.name,
                    monthlyCost: e.monthlyCost,
                    dueDay: e.dueDay,
                    reminderLeadDays: e.reminderLeadDays,
                  })),
                }),
              });
              localStorage.setItem(lastEmailCheckKey, todayStr);
            } catch (err) {
              console.warn("[useNotificationEngine] Server EMI due check failed:", err);
            }
          }
        }
      } catch (err) {
        console.error("[useNotificationEngine] Error running notification cycle:", err);
      } finally {
        isRunningRef.current = false;
      }
    }

    // Run immediately on mount or dependency update
    runAllNotificationChecks();

    // Check periodically every 60 seconds (keeps daily reminder time accurate to the minute)
    const interval = setInterval(runAllNotificationChecks, 60 * 1000);

    // Also run when user switches back to app tab/screen
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        runAllNotificationChecks();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [
    user,
    settings.notifDailyReminder,
    settings.pushNotificationsEnabled,
    settings.budgetAlert80,
    settings.budgetAlert100,
    settings.emailAlertsEnabled,
    settings.notifMonthlyStatement,
    settings.notifEMISync,
    settings.dailyReminderTime,
    emis,
    budgets,
    categories,
    transactions,
  ]);
}
