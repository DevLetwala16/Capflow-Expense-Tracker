"use client";

import { db, EMI, Transaction, Category, Budget } from "@/lib/db";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { PDFTransactionItem } from "@/lib/email/transactionStatementPdf";

// ─── Event Dispatcher for In-App Toasts ───────────────────────────────────────
export interface InAppNotificationEventDetail {
  id: string;
  title: string;
  body: string;
  tag?: string;
  type?: "info" | "warning" | "alert" | "success";
  timestamp: number;
}

export function emitInAppNotification(detail: Omit<InAppNotificationEventDetail, "id" | "timestamp">) {
  if (typeof window === "undefined") return;
  const event = new CustomEvent<InAppNotificationEventDetail>("capflow-inapp-notification", {
    detail: {
      ...detail,
      id: "notif_" + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    },
  });
  window.dispatchEvent(event);
}

// ─── Permission Checkers & Request Handlers ───────────────────────────────────

export async function checkDevicePermissions(): Promise<{
  notifications: "granted" | "denied" | "default" | "unsupported";
  camera: "granted" | "denied" | "prompt" | "unsupported";
}> {
  let notifications: "granted" | "denied" | "default" | "unsupported" = "unsupported";
  let camera: "granted" | "denied" | "prompt" | "unsupported" = "unsupported";

  if (typeof window !== "undefined") {
    // Check Notification API
    if ("Notification" in window) {
      notifications = Notification.permission;
    }

    // Check Camera permissions via Permissions API
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const camStatus = await navigator.permissions.query({ name: "camera" as any });
        camera = camStatus.state as any;
      } catch {
        // Fallback: mediaDevices check
        if (typeof navigator.mediaDevices?.getUserMedia === "function") {
          camera = "prompt";
        }
      }
    } else if (typeof navigator.mediaDevices?.getUserMedia === "function") {
      camera = "prompt";
    }
  }

  return { notifications, camera };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToWebPush(userId?: string, email?: string): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn("[NotificationEngine] NEXT_PUBLIC_VAPID_PUBLIC_KEY not configured.");
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // Register Periodic Background Sync if supported (Android Chrome)
    try {
      if ("periodicSync" in reg) {
        // @ts-ignore
        await reg.periodicSync.register("capflow-daily-check", {
          minInterval: 12 * 60 * 60 * 1000,
        });
      }
    } catch {}

    // Send subscription to server
    await fetch("/api/notifications/push-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        userId,
        email,
      }),
    });

    return true;
  } catch (err) {
    console.warn("[NotificationEngine] WebPush registration error:", err);
    return false;
  }
}

export async function requestNotificationPermission(userId?: string, email?: string): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const perm = await Notification.requestPermission();
    const settings = useSettingsStore.getState();
    settings.setNotificationPermission(perm === "granted" ? "granted" : perm === "denied" ? "denied" : "prompt");
    if (perm === "granted") {
      settings.setPushNotificationsEnabled(true);
      settings.setNotifDailyReminder(true);
      if (!settings.dailyReminderTime) {
        settings.setDailyReminderTime("21:00");
      }
      // Automatically register Web Push subscription for background delivery
      await subscribeUserToWebPush(userId, email);
    }
    return perm;
  } catch (err) {
    console.warn("[NotificationEngine] Error requesting notification permission:", err);
    return "denied";
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    // Immediately stop tracks to release hardware camera
    stream.getTracks().forEach((track) => track.stop());

    const settings = useSettingsStore.getState();
    settings.setCameraPermission("granted");
    return true;
  } catch (err: any) {
    console.warn("[NotificationEngine] Camera permission denied or failed:", err);
    useSettingsStore.getState().setCameraPermission("denied");
    return false;
  }
}

// ─── Native Push Notification Sender ─────────────────────────────────────────

export async function sendNativeNotification(
  title: string,
  options: NotificationOptions & { inAppType?: "info" | "warning" | "alert" | "success" } = {}
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const { inAppType = "info", ...nativeOptions } = options;

  // Always emit an in-app visual notification for active foreground sessions
  emitInAppNotification({
    title,
    body: (nativeOptions.body as string) || "",
    tag: nativeOptions.tag,
    type: inAppType,
  });

  // Haptic feedback for mobile
  try {
    if (navigator.vibrate) {
      navigator.vibrate([150, 75, 150]);
    }
  } catch {}

  // Native system / push notification
  if ("Notification" in window && Notification.permission === "granted") {
    // Try service worker registration first (works for mobile PWA & Android Chrome)
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            icon: "/capflow-logo.png",
            badge: "/icons/icon-192x192.png",
            ...nativeOptions,
          } as any);
          return true;
        }
      } catch (swErr) {
        console.warn("[NotificationEngine] SW showNotification fallback:", swErr);
      }
    }

    // Direct Notification API
    try {
      new Notification(title, {
        icon: "/capflow-logo.png",
        ...nativeOptions,
      });
      return true;
    } catch (notifErr) {
      console.warn("[NotificationEngine] Native Notification constructor failed:", notifErr);
    }
  }

  return false;
}

// ─── Zomato / Duolingo Style Daily Expense Reminder ───────────────────────────

const ENGAGING_DAILY_PROMPTS = [
  {
    title: "🔥 CapFlow: Keep Your Streak Alive!",
    body: "Did you log today's expenses? Tap to track your spending in 5 seconds before your day ends!",
  },
  {
    title: "🍽️ Had Lunch or Dinner Today?",
    body: "Don't forget to track your food and shopping bills to keep your budget on target!",
  },
  {
    title: "⚡ 5-Second Money Check-in",
    body: "A minute a day keeps debt away. Record today's transactions in CapFlow now!",
  },
  {
    title: "🎯 Protect Your Monthly Savings",
    body: "Stay in full control of your cashflow. Log any cash or UPI payments made today!",
  },
];

export async function checkDailyExpenseReminder(userId?: string): Promise<boolean> {
  if (!userId || typeof window === "undefined") return false;

  const state = useSettingsStore.getState();
  if (!state.notifDailyReminder) return false;

  const reminderTime = state.dailyReminderTime || "21:00";
  const [remHour, remMin] = reminderTime.split(":").map(Number);
  if (isNaN(remHour) || isNaN(remMin)) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  // Has scheduled time arrived today?
  const timeArrived = currentHour > remHour || (currentHour === remHour && currentMin >= remMin);
  if (!timeArrived) return false;

  const todayStr = format(now, "yyyy-MM-dd");

  // Prevent multiple reminders on the exact same date
  if (state.lastDailyReminderDate === todayStr) {
    return false;
  }

  // Check if user has already added any transaction today
  try {
    const todayCount = await db.transactions
      .where("userId")
      .equals(userId)
      .filter((tx) => tx.date === todayStr)
      .count();

    if (todayCount > 0) {
      // User has already logged today! Mark as checked and skip
      state.setLastDailyReminderDate(todayStr);
      return false;
    }
  } catch (err) {
    console.error("[NotificationEngine] Error checking today's transactions:", err);
  }

  // Pick engaging message
  const prompt = ENGAGING_DAILY_PROMPTS[now.getDate() % ENGAGING_DAILY_PROMPTS.length];

  await sendNativeNotification(prompt.title, {
    body: prompt.body,
    tag: `daily-reminder-${todayStr}`,
    inAppType: "info",
  });

  state.setLastDailyReminderDate(todayStr);
  return true;
}

// ─── EMI Due Date Alerts ──────────────────────────────────────────────────────

export async function checkEMIDueReminders(emis: EMI[]): Promise<number> {
  if (!emis || emis.length === 0 || typeof window === "undefined") return 0;

  const state = useSettingsStore.getState();
  if (!state.pushNotificationsEnabled) return 0;

  const now = new Date();
  const todayDate = now.getDate();
  const todayMonthYear = format(now, "yyyy-MM");
  let sent = 0;

  for (const emi of emis) {
    const leadDays = emi.reminderLeadDays ?? 3;
    const diff = emi.dueDay - todayDate;
    const isDueToday = diff === 0;
    const isDueSoon = diff > 0 && diff <= leadDays;

    if (!isDueToday && !isDueSoon) continue;

    const notifCycleKey = `capflow_emi_notified_${emi.id}_${todayMonthYear}_${todayDate}`;
    if (localStorage.getItem(notifCycleKey)) {
      continue; // Already notified today
    }

    const title = isDueToday
      ? `💳 EMI Due Today: ${emi.name}`
      : `📅 Upcoming EMI in ${diff} day${diff > 1 ? "s" : ""}: ${emi.name}`;

    const body = `₹${emi.monthlyCost.toLocaleString("en-IN")} is due. Ensure sufficient bank balance!`;

    await sendNativeNotification(title, {
      body,
      tag: `emi-${emi.id}-${todayMonthYear}-${todayDate}`,
      inAppType: isDueToday ? "alert" : "warning",
    });

    localStorage.setItem(notifCycleKey, "true");
    sent++;
  }

  return sent;
}

// ─── 80% & 100% Budget Warning Alerts ─────────────────────────────────────────

export async function checkBudgetWarnings(
  budgets: Budget[],
  categories: Category[],
  transactions: Transaction[]
): Promise<number> {
  const state = useSettingsStore.getState();
  if (!state.pushNotificationsEnabled && !state.budgetAlert80 && !state.budgetAlert100) {
    return 0;
  }

  const currentMonthStr = format(new Date(), "yyyy-MM");
  const monthBudgets = budgets.filter((b) => b.month === currentMonthStr && b.limit > 0);
  if (monthBudgets.length === 0) return 0;

  let alertCount = 0;

  for (const b of monthBudgets) {
    const cat = categories.find((c) => c.id === b.categoryId);
    const catName = cat?.name || "Category";

    const catSpent = transactions
      .filter(
        (tx) =>
          tx.type === "expense" &&
          tx.categoryId === b.categoryId &&
          tx.date.startsWith(currentMonthStr)
      )
      .reduce((sum, tx) => sum + tx.amount, 0);

    const percent = Math.round((catSpent / b.limit) * 100);

    // 100% exceeded alert
    if (state.budgetAlert100 && percent >= 100) {
      const lockKey = `budget_100_notified_${b.id}_${currentMonthStr}`;
      if (!localStorage.getItem(lockKey)) {
        await sendNativeNotification(`🚨 100% Budget Exceeded: ${catName}`, {
          body: `You've spent ₹${catSpent.toLocaleString("en-IN")} of your ₹${b.limit.toLocaleString("en-IN")} limit (${percent}%).`,
          tag: lockKey,
          inAppType: "alert",
        });
        localStorage.setItem(lockKey, "true");
        alertCount++;
      }
    }
    // 80% limit warning
    else if (state.budgetAlert80 && percent >= 80 && percent < 100) {
      const lockKey = `budget_80_notified_${b.id}_${currentMonthStr}`;
      if (!localStorage.getItem(lockKey)) {
        await sendNativeNotification(`⚠️ 80% Budget Warning: ${catName}`, {
          body: `You've reached ${percent}% of your monthly limit (₹${catSpent.toLocaleString("en-IN")} / ₹${b.limit.toLocaleString("en-IN")}).`,
          tag: lockKey,
          inAppType: "warning",
        });
        localStorage.setItem(lockKey, "true");
        alertCount++;
      }
    }
  }

  return alertCount;
}

// ─── Automated Monthly Transaction Statement Email Sender ─────────────────────

export async function checkAutomatedMonthlyStatementEmail(
  user: { email: string; name: string } | null,
  categories: Category[]
): Promise<boolean> {
  if (!user?.email || typeof window === "undefined") return false;

  const state = useSettingsStore.getState();
  if (!state.notifMonthlyStatement && !state.emailAlertsEnabled) return false;

  const now = new Date();
  const prevMonth = subMonths(now, 1);
  const prevMonthStr = format(prevMonth, "yyyy-MM"); // e.g. "2026-09"

  // Only run if not already sent for this previous month
  if (state.lastMonthlyStatementSentMonth === prevMonthStr) {
    return false;
  }

  // Statement period
  const startDateStr = format(startOfMonth(prevMonth), "yyyy-MM-dd");
  const endDateStr = format(endOfMonth(prevMonth), "yyyy-MM-dd");
  const periodLabel = format(prevMonth, "MMMM yyyy");

  try {
    const txList = await db.transactions
      .where("userId")
      .equals(user.email) // or userId
      .filter((tx) => tx.date >= startDateStr && tx.date <= endDateStr)
      .toArray();

    // Map to PDF items
    const pdfItems: PDFTransactionItem[] = txList.map((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      return {
        date: tx.date,
        title: tx.title || "Transaction",
        category: cat?.name || "General",
        paymentMethod: tx.paymentMethod ? tx.paymentMethod.replace("_", " ").toUpperCase() : "CASH",
        type: tx.type,
        amount: tx.amount,
      };
    });

    const totalIncome = txList.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = txList.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const netSavings = totalIncome - totalExpense;

    const res = await fetch("/api/transactions/statement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodLabel,
        startDate: startDateStr,
        endDate: endDateStr,
        transactions: pdfItems,
        totalIncome,
        totalExpense,
        netSavings,
        fallbackEmail: user.email,
        fallbackName: user.name || "CapFlow Member",
      }),
    });

    if (res.ok) {
      state.setLastMonthlyStatementSentMonth(prevMonthStr);
      emitInAppNotification({
        title: `📧 Monthly Statement Sent`,
        body: `Your statement for ${periodLabel} has been automatically emailed to ${user.email}!`,
        type: "success",
      });
      return true;
    }
  } catch (err) {
    console.error("[NotificationEngine] Automated monthly statement failed:", err);
  }

  return false;
}

// ─── Extra Situational Notifications ─────────────────────────────────────────

/**
 * Fires when a user adds/logs a personal transaction (expense or income)
 */
export async function notifyTransactionLogged({
  type,
  amount,
  category,
  title,
  currency = "₹",
}: {
  type: "expense" | "income" | "transfer";
  amount: number;
  category?: string;
  title?: string;
  currency?: string;
}) {
  const isExp = type === "expense";
  const icon = isExp ? "💸" : "💰";
  const formatted = `${currency}${amount.toLocaleString("en-IN")}`;
  const notifTitle = isExp ? `${icon} Expense Logged: ${formatted}` : `${icon} Income Added: ${formatted}`;
  const notifBody = `${title || "Transaction"} (${category || "General"}) recorded successfully in CapFlow.`;

  await sendNativeNotification(notifTitle, {
    body: notifBody,
    tag: `tx-${Date.now()}`,
    inAppType: "success",
  });
}

/**
 * Fires when a new Splitter session/group is created
 */
export async function notifySplitSessionCreated({
  sessionName,
  sessionId,
  creatorName,
}: {
  sessionName: string;
  sessionId: string;
  creatorName: string;
}) {
  const notifTitle = `👥 New Split Session: ${sessionName}`;
  const notifBody = `${creatorName} created "${sessionName}" (ID: ${sessionId}). Tap to view expenses and track balances!`;

  await sendNativeNotification(notifTitle, {
    body: notifBody,
    tag: `split-created-${sessionId}`,
    inAppType: "info",
  });
}

/**
 * Fires when a split expense is added or logged in a Splitter group
 */
export async function notifySplitExpenseLogged({
  sessionName,
  title,
  amount,
  currency = "₹",
  payerName,
  yourShare,
}: {
  sessionName: string;
  title: string;
  amount: number;
  currency?: string;
  payerName: string;
  yourShare?: number;
}) {
  const formattedTotal = `${currency}${amount.toLocaleString("en-IN")}`;
  const notifTitle = `👥 Itemized Expense: ${sessionName}`;
  const shareText = yourShare ? ` Your share: ${currency}${yourShare.toLocaleString("en-IN")}.` : "";
  const notifBody = `${payerName} added "${title}" for ${formattedTotal}.${shareText}`;

  await sendNativeNotification(notifTitle, {
    body: notifBody,
    tag: `split-exp-${Date.now()}`,
    inAppType: "info",
  });
}

/**
 * Fires when a settlement is recorded between members
 */
export async function notifySplitSettlementLogged({
  sessionName,
  fromName,
  toName,
  amount,
  currency = "₹",
}: {
  sessionName: string;
  fromName: string;
  toName: string;
  amount: number;
  currency?: string;
}) {
  const formatted = `${currency}${amount.toLocaleString("en-IN")}`;
  const notifTitle = `🤝 Settlement in ${sessionName}`;
  const notifBody = `${fromName} paid ${toName} ${formatted}. Group balances updated!`;

  await sendNativeNotification(notifTitle, {
    body: notifBody,
    tag: `split-stl-${Date.now()}`,
    inAppType: "success",
  });
}

