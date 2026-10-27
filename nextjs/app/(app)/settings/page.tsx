"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  QrCode,
  Sun,
  Database,
  Shield,
  LogOut,
  LogIn,
  Globe,
  Bell,
  Tag,
  Palette,
  Eye,
  EyeOff,
  Smartphone,
  HelpCircle,
  Camera,
  Check,
  Copy,
  CreditCard,
  Calendar,
  Hash,
  Clock,
  Laptop,
  Fingerprint,
  Lock,
  Trash2,
  AlertCircle,
  Sparkles,
  Info,
  Maximize2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/store/authStore";
import {
  useSettingsStore,
  NumberingSystem,
  UserSession,
} from "@/lib/store/settingsStore";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { CurrencySelectorModal } from "@/components/shared/CurrencySelectorModal";
import { CURRENCIES, useExchangeRateStore } from "@/lib/currency/exchangeRates";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useEMIStore } from "@/lib/store/emiStore";
import {
  sendNativeNotification,
  requestNotificationPermission,
} from "@/lib/notifications/notificationEngine";
import { DevicePermissionModal } from "@/components/shared/DevicePermissionModal";
import { PaymentQRModal } from "@/components/shared/PaymentQRModal";
import { QRCodeExpandModal } from "@/components/shared/QRCodeExpandModal";

// ─── Payment Methods ──────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "HDFC Bank",
  "SBI Bank",
  "ICICI Bank",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateMemberId(name?: string, email?: string): string {
  const base = (name || email || "user")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  const rand = Math.random().toString(36).substring(2, 6);
  return `@${base || "cap"}_${rand}`;
}

// ─── iOS-style Toggle Switch ──────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
        checked
          ? "bg-slate-700 dark:bg-slate-700 border border-slate-600/50"
          : "bg-slate-300 dark:bg-slate-800/80 border border-slate-400/20 dark:border-slate-700/50"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Section Container ────────────────────────────────────────────────────────

function SettingsSection({
  label,
  children,
  delay = 0,
}: {
  label?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="space-y-1.5"
    >
      {label && (
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          {label}
        </p>
      )}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
        {children}
      </div>
    </motion.div>
  );
}

// ─── Navigation Chevron Row ───────────────────────────────────────────────────

function NavRow({
  icon,
  iconBg,
  label,
  sub,
  onClick,
  badge,
  noBorder = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  sub?: string;
  onClick: () => void;
  badge?: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-card-hover)] transition-colors text-left ${
        noBorder ? "" : "border-t border-[var(--border-color)]"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
          {sub && (
            <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
              {sub}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {badge}
        <ChevronRight size={16} className="text-[var(--text-secondary)]" />
      </div>
    </button>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────

function ToggleRow({
  icon,
  label,
  sub,
  checked,
  onChange,
  disabled = false,
  noBorder = false,
}: {
  icon?: React.ReactNode;
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  noBorder?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between px-4 py-3.5 gap-3 ${
        noBorder ? "" : "border-t border-[var(--border-color)]"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {icon && <div className="mt-0.5 flex-shrink-0">{icon}</div>}
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-primary)]">{label}</p>
          {sub && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
              {sub}
            </p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 pt-0.5">
        <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

const FEATURE_MONTHLY = process.env.NEXT_PUBLIC_FEATURE_MONTHLY_STATEMENT === "true";

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();

  const {
    // Basic preferences
    defaultCurrency,
    setDefaultCurrency,
    notifEMIReminders,
    setNotifEMIReminders,
    notifEMISync,
    setNotifEMISync,
    notifMonthlyStatement,
    setNotifMonthlyStatement,

    // Profile
    displayName,
    setDisplayName,
    phone,
    setPhone,
    profilePhoto,
    setProfilePhoto,
    memberId,
    setMemberId,
    paymentQrCode,
    paymentUpiId,

    // App Lock & Sessions
    appLockEnabled,
    setAppLockEnabled,
    appLockPin,
    setAppLockPin,
    appLockType,
    setAppLockType,
    sessions,
    removeOtherSessions,

    // Financial & Regional
    defaultPaymentMethod,
    setDefaultPaymentMethod,
    fiscalStartMonth,
    setFiscalStartMonth,
    numberingSystem,
    setNumberingSystem,

    // Granular Notifications
    emailAlertsEnabled,
    setEmailAlertsEnabled,
    pushNotificationsEnabled,
    setPushNotificationsEnabled,
    dailyReminderTime,
    setDailyReminderTime,
    notifDailyReminder,
    setNotifDailyReminder,
    budgetAlert80,
    setBudgetAlert80,
    budgetAlert100,
    setBudgetAlert100,
  } = useSettingsStore();

  const [mounted, setMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showCurrencySheet, setShowCurrencySheet] = useState(false);
  const [showMonthlyConfirm, setShowMonthlyConfirm] = useState(false);
  const [convertingAll, setConvertingAll] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);

  // Profile Edit states
  const [editingProfile, setEditingProfile] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // App Lock PIN Setup Dialog
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { emis } = useEMIStore();
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showPaymentQRModal, setShowPaymentQRModal] = useState(false);
  const [showQrExpandModal, setShowQrExpandModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [testingNotif, setTestingNotif] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  // Sync preferences with backend
  const handleToggleEmailAlerts = async (val: boolean) => {
    setEmailAlertsEnabled(val);
    setNotifEMIReminders(val);
    if (user?.email) {
      try {
        await fetch("/api/user/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, emiReminders: val }),
        });
        showToast(val ? "Email alerts enabled for EMI dues" : "Email alerts disabled");
      } catch (e) {
        console.warn("Failed updating email alerts preference", e);
      }
    }
  };

  const handleTogglePushNotifications = async (val: boolean) => {
    if (val) {
      const res = await requestNotificationPermission();
      if (res === "granted") {
        setPushNotificationsEnabled(true);
        showToast("Local push notifications active");
      } else {
        setPushNotificationsEnabled(false);
        showToast("Notification permission not granted in browser");
      }
    } else {
      setPushNotificationsEnabled(false);
      showToast("Local push notifications disabled");
    }
  };

  const handleToggleEMISync = async (val: boolean) => {
    setNotifEMISync(val);
    if (user?.email) {
      try {
        await fetch("/api/user/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            emiEmailSync: val,
            emiReminders: val ? true : emailAlertsEnabled,
          }),
        });

        if (val) {
          await fetch("/api/emis/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              emis,
              enableSync: true,
            }),
          });
          showToast("EMIs synchronized with cloud reminder server!");
        } else {
          showToast("EMI server sync disabled");
        }
      } catch (e) {
        console.warn("Failed syncing EMIs to server", e);
      }
    }
  };

  const handleToggleMonthlyStatement = async (val: boolean) => {
    setNotifMonthlyStatement(val);
    if (user?.email) {
      try {
        await fetch("/api/user/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, monthlyStatement: val }),
        });
        showToast(val ? "Monthly email statement enabled" : "Monthly email statement disabled");
      } catch (e) {
        console.warn("Failed updating monthly statement preference", e);
      }
    }
  };

  const handleTestNotification = async () => {
    setTestingNotif(true);
    try {
      await sendNativeNotification("🔔 CapFlow Alert Test", {
        body: "Your device notifications & vibrations are working! You'll receive daily expense prompts & EMI alerts.",
        inAppType: "success",
      });
      showToast("Test notification dispatched to your device!");
    } catch {
      showToast("Could not send test notification");
    } finally {
      setTestingNotif(false);
    }
  };

  const handleTestEmail = async (type: "emi" | "summary") => {
    if (!user?.email) {
      showToast("Please sign in with your email first to receive test emails.");
      return;
    }
    setTestingEmail(true);
    try {
      const res = await fetch("/api/notifications/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          type,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Test email delivered successfully!");
      } else {
        showToast(data.error || "Failed sending test email");
      }
    } catch {
      showToast("Network error sending test email");
    } finally {
      setTestingEmail(false);
    }
  };

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Member ID if empty
  useEffect(() => {
    if (mounted && !memberId) {
      const generated = generateMemberId(user?.name, user?.email);
      setMemberId(generated);
    }
  }, [mounted, memberId, user?.name, user?.email, setMemberId]);

  // Sync temp name & phone from store/user
  useEffect(() => {
    if (mounted) {
      setTempName(displayName || user?.name || "");
      setTempPhone(phone || user?.phone || "");
    }
  }, [mounted, displayName, phone, user?.name, user?.phone]);

  const { lastUpdated } = useExchangeRateStore();
  const timeAgoMinutes =
    mounted && lastUpdated > 0 ? Math.floor((Date.now() - lastUpdated) / (60 * 1000)) : null;

  // ── Profile Photo Compression (WebP / Base64) ─────────────────────────────
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for compression
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to webp base64 (fallback to jpeg)
          let dataUrl = canvas.toDataURL("image/webp", 0.85);
          if (!dataUrl.startsWith("data:image/webp")) {
            dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          }
          setProfilePhoto(dataUrl);
          showToast("Profile photo updated & compressed locally");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Profile Completion Percentage ──────────────────────────────────────────
  const profileCompletion = useMemo(() => {
    let completed = 0;
    const effectiveName = displayName || user?.name;
    if (effectiveName && effectiveName.trim().length > 0) completed += 25;
    if (profilePhoto && profilePhoto.length > 0) completed += 25;
    if (phone && phone.trim().length > 0) completed += 25;
    if (defaultCurrency) completed += 25;
    return completed;
  }, [displayName, user?.name, profilePhoto, phone, defaultCurrency]);

  // ── Copy Member ID ─────────────────────────────────────────────────────────
  const handleCopyMemberId = () => {
    if (!memberId) return;
    navigator.clipboard.writeText(memberId);
    setCopiedId(true);
    showToast(`Copied ${memberId} to clipboard`);
    setTimeout(() => setCopiedId(false), 2500);
  };

  // ── Save Profile Details ───────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    const trimmedName = tempName.trim();
    const trimmedPhone = tempPhone.trim();

    setDisplayName(trimmedName);
    setPhone(trimmedPhone);
    setSavingProfile(true);

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          updateUser({
            name: data.user.name,
            phone: data.user.phone,
          });
        }
        showToast("Profile details updated in MongoDB database");
      } else {
        showToast("Profile details saved");
      }
    } catch (e) {
      console.warn("Failed saving profile to DB:", e);
      showToast("Profile details saved");
    } finally {
      setSavingProfile(false);
      setEditingProfile(false);
    }
  };

  // ── App Lock Toggle Handler ────────────────────────────────────────────────
  const handleAppLockToggle = (val: boolean) => {
    if (val) {
      if (!appLockPin) {
        setShowPinDialog(true);
      } else {
        setAppLockEnabled(true);
        showToast("App Lock enabled");
      }
    } else {
      setAppLockEnabled(false);
      showToast("App Lock disabled");
    }
  };

  const handleSavePin = () => {
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      setPinError("PIN must be exactly 4 digits");
      return;
    }
    if (pinInput !== pinConfirm) {
      setPinError("PINs do not match");
      return;
    }
    setAppLockPin(pinInput);
    setAppLockEnabled(true);
    setShowPinDialog(false);
    setPinInput("");
    setPinConfirm("");
    setPinError(null);
    showToast("4-digit PIN set and App Lock activated");
  };

  // ── Sign Out ───────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch (err) {
      console.error("Signout error:", err);
    }
    logout();
    window.location.href = "/auth";
  };

  const effectiveName = mounted ? displayName || user?.name || "Guest User" : "User";
  const initials = mounted && effectiveName
    ? effectiveName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CF";

  const activeCurrency = useMemo(
    () =>
      CURRENCIES.find((c) => c.code === defaultCurrency) || {
        code: defaultCurrency,
        symbol: "$",
        name: defaultCurrency,
      },
    [defaultCurrency]
  );

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[var(--accent,#6366F1)] text-white text-xs font-semibold shadow-lg flex items-center gap-2 border border-white/20"
          >
            <Sparkles size={14} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-4 py-5 border-b border-[var(--border-color)] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>
            <span className="px-2 py-0.5 rounded-full bg-[var(--accent,#6366F1)]/10 text-[var(--accent,#6366F1)] text-[11px] font-bold border border-[var(--accent,#6366F1)]/20">
              v1.0.0
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Personal financial controls, sync & security
          </p>
        </div>
      </header>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-12">
        {/* ── 1. Profile & Account Management Card (Hero) ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[var(--bg-card)] rounded-2xl sm:rounded-3xl border border-[var(--border-color)] p-5 space-y-4 shadow-sm relative overflow-hidden"
        >
          {/* Top Avatar + User Info + Sign Out */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Photo Upload Area */}
              <div
                className="relative flex-shrink-0 cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#10B981] shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#10B981] to-[#0ea5e9] flex items-center justify-center border-2 border-[#10B981] shadow-md">
                    <span className="text-white font-bold text-xl">{initials}</span>
                  </div>
                )}
                {/* Green Camera Icon pill */}
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-md">
                  <Camera size={11} />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              {/* Name + Email + Member ID */}
              <div className="min-w-0 flex-1">
                <p suppressHydrationWarning className="font-bold text-base text-[var(--text-primary)] truncate leading-tight">
                  {effectiveName}
                </p>
                <p suppressHydrationWarning className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                  {mounted && user?.email ? user.email : "letwala.dev@gmail.com"}
                </p>
                {/* Member ID Pill + Copy button */}
                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
                  <span className="font-mono text-xs text-[var(--text-secondary)] font-medium">
                    {memberId || "@letwalad_c3mo"}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMemberId}
                    title="Copy Member ID"
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-0.5"
                  >
                    {copiedId ? <Check size={12} className="text-[#10B981]" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Sign Out / Sign In Pill Button */}
            {mounted && user ? (
              <button
                type="button"
                onClick={() => setShowSignOutDialog(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EF4444]/10 text-[#EF4444] text-xs font-semibold border border-[#EF4444]/25 hover:bg-[#EF4444]/20 transition-colors cursor-pointer flex-shrink-0"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/auth";
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EF4444]/10 text-[#EF4444] text-xs font-semibold border border-[#EF4444]/25 hover:bg-[#EF4444]/20 transition-colors cursor-pointer flex-shrink-0"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            )}
          </div>

          {/* Profile Completion */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                <Sparkles size={15} className="text-[#10B981]" />
                Profile Completion
              </span>
              <span className="font-bold text-sm text-[#10B981]">{profileCompletion}%</span>
            </div>
            {/* Glowing gradient progress bar */}
            <div className="w-full h-2 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6366F1] via-[#06B6D4] to-[#10B981] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(5, profileCompletion)}%` }}
              />
            </div>
          </div>

          {/* Phone row & inline edit form */}
          {editingProfile ? (
            <div className="space-y-2.5 pt-2 border-t border-[var(--border-color)]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Display Name</label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Name"
                    className="w-full mt-0.5 px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Phone Number</label>
                  <input
                    type="tel"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    placeholder="Phone Number"
                    className="w-full mt-0.5 px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  disabled={savingProfile}
                  className="px-3 py-1 rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-3 py-1 rounded-xl bg-[#10B981] text-white text-xs font-semibold hover:bg-[#0ea572] disabled:opacity-50"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-[var(--text-secondary)]">Phone:</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {phone || user?.phone ? (
                    phone || user?.phone
                  ) : (
                    <span className="text-[var(--text-secondary)] font-normal italic">Not added yet</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTempName(displayName || user?.name || "");
                  setTempPhone(phone || user?.phone || "");
                  setEditingProfile(true);
                }}
                className="text-xs font-semibold text-[#10B981] hover:underline cursor-pointer"
              >
                Edit details
              </button>
            </div>
          )}

          {/* Subtle Divider */}
          <div className="border-t border-[var(--border-color)] my-1" />

          {/* Biometric / App Lock */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-start gap-3 min-w-0 pr-3">
              <Fingerprint size={20} className="text-[#10B981] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
                  Biometric / App Lock
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Require PIN or Face ID/Touch ID on app launch
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <ToggleSwitch
                checked={appLockEnabled}
                onChange={handleAppLockToggle}
              />
            </div>
          </div>

          {/* Active Sessions */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                <Laptop size={14} />
                <span>ACTIVE SESSIONS</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  removeOtherSessions();
                  showToast("Signed out from all other devices");
                }}
                className="text-xs font-semibold text-[#EF4444] hover:underline cursor-pointer"
              >
                Sign Out Other Devices
              </button>
            </div>

            <div className="space-y-1.5">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs"
                >
                  <div className="flex items-center">
                    <span
                      className={`w-2 h-2 rounded-full mr-2.5 flex-shrink-0 ${
                        sess.isCurrent ? "bg-[#10B981]" : "bg-slate-400"
                      }`}
                    />
                    <span className="font-bold text-[var(--text-primary)]">
                      {sess.device === "Current Device" ? "Current Device" : sess.device}
                    </span>
                    <span className="text-[var(--text-secondary)] ml-1">
                      ({sess.browser})
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    {sess.isCurrent ? "Current" : sess.lastActive}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── 2. Appearance & Navigation Link ─────────────────────────────────── */}
        <SettingsSection label="Appearance & Personalization" delay={0.06}>
          <NavRow
            icon={<Palette size={16} className="text-[#9333EA]" />}
            iconBg="bg-[#9333EA]/10"
            label="Appearance & Themes"
            sub="Font slider, compact density, 5 color presets & custom palette"
            onClick={() => router.push("/settings/appearance")}
            noBorder
          />
          {/* Quick Theme Toggle Row */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                <Sun size={15} className="text-[#F59E0B]" />
              </div>
              <span className="text-sm text-[var(--text-primary)]">Quick Theme</span>
            </div>
            <ThemeToggle />
          </div>
        </SettingsSection>

        {/* ── 3. Financial & Regional Preferences ─────────────────────────────── */}
        <SettingsSection label="Financial & Regional Preferences" delay={0.12}>
          {/* Primary Currency */}
          <button
            onClick={() => setShowCurrencySheet(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent,#6366F1)]/10 flex items-center justify-center">
                <Globe size={15} className="text-[var(--accent,#6366F1)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Primary Currency</p>
                <p className="text-xs text-[var(--text-secondary)]">{activeCurrency.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent,#6366F1)]/10 text-xs font-bold text-[var(--accent,#6366F1)] border border-[var(--accent,#6366F1)]/20">
                <span>{activeCurrency.symbol}</span>
                <span>{activeCurrency.code}</span>
              </span>
              <ChevronRight size={15} className="text-[var(--text-secondary)]" />
            </div>
          </button>

          {/* Default Payment Method */}
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                <CreditCard size={15} className="text-[#10B981]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Default Payment Method</p>
                <p className="text-xs text-[var(--text-secondary)]">Auto-applied to new transactions</p>
              </div>
            </div>
            <select
              value={defaultPaymentMethod}
              onChange={(e) => setDefaultPaymentMethod(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>

          {/* Payment QR Code */}
          <div
            onClick={() => setShowPaymentQRModal(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer text-left"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowPaymentQRModal(true);
              }
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center flex-shrink-0">
                <QrCode size={15} className="text-[#6366F1]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">Payment QR Code</p>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {user?.paymentQrCode || paymentQrCode
                    ? "QR code active • Ready for Splitter settlements"
                    : "Add your UPI / payment QR for receiving payments"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {user?.paymentQrCode || paymentQrCode ? (
                <>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQrExpandModal(true);
                    }}
                    title="Click to preview QR code"
                    className="relative w-8 h-8 rounded-lg bg-white p-0.5 border border-[var(--border-color)] shadow-xs hover:ring-2 hover:ring-[#6366F1] transition-all flex items-center justify-center overflow-hidden cursor-pointer group flex-shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={user?.paymentQrCode || paymentQrCode}
                      alt="Payment QR"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 size={11} className="text-white" />
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#10B981]/10 text-xs font-semibold text-[#10B981] border border-[#10B981]/20">
                    <Check size={12} strokeWidth={2.5} />
                    Active
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-primary)] text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border-color)]">
                  Add QR
                </span>
              )}
              <ChevronRight size={15} className="text-[var(--text-secondary)]" />
            </div>
          </div>
          {/* Fiscal Year Configuration */}
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                <Calendar size={15} className="text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Fiscal Year Start</p>
                <p className="text-xs text-[var(--text-secondary)]">Financial reporting cycle</p>
              </div>
            </div>
            <select
              value={fiscalStartMonth}
              onChange={(e) => setFiscalStartMonth(Number(e.target.value))}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
            >
              <option value={1}>Jan - Dec (Calendar)</option>
              <option value={4}>Apr - Mar (India / UK)</option>
              <option value={7}>Jul - Jun (Australia)</option>
              <option value={10}>Oct - Sep (US Govt)</option>
            </select>
          </div>

          {/* Numbering System Format Toggle */}
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center">
                <Hash size={15} className="text-[#0EA5E9]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Numbering System</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {numberingSystem === "indian" ? "Indian: 10,00,000.00" : "Western: 1,000,000.00"}
                </p>
              </div>
            </div>
            <div className="flex gap-1 p-0.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
              <button
                onClick={() => setNumberingSystem("western")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  numberingSystem === "western"
                    ? "bg-[var(--accent,#6366F1)] text-white shadow-sm"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                Western
              </button>
              <button
                onClick={() => setNumberingSystem("indian")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  numberingSystem === "indian"
                    ? "bg-[var(--accent,#6366F1)] text-white shadow-sm"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                Indian
              </button>
            </div>
          </div>

          {/* Bulk currency conversion */}
          <div className="px-4 py-2 bg-[var(--bg-card-hover)]/30 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span suppressHydrationWarning>
                Rates refreshed {mounted && timeAgoMinutes !== null ? `(${timeAgoMinutes}m ago)` : ""}
              </span>
            </span>
            <button
              type="button"
              onClick={async () => {
                setConvertingAll(true);
                await useTransactionStore.getState().convertAllStoredTransactions(defaultCurrency);
                setConvertingAll(false);
                setConvertSuccess(`Synced records to ${defaultCurrency}!`);
                setTimeout(() => setConvertSuccess(null), 4000);
              }}
              disabled={convertingAll}
              className="text-[var(--accent,#6366F1)] hover:underline font-semibold cursor-pointer disabled:opacity-50"
            >
              {convertingAll ? "Converting…" : `Sync records to ${defaultCurrency}`}
            </button>
          </div>
          {convertSuccess && (
            <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold text-center border-t border-emerald-500/20">
              {convertSuccess}
            </div>
          )}
        </SettingsSection>

        {/* ── 4. Notifications & Reminders ────────────────────────────────────── */}
        <SettingsSection label="Notifications & Reminders" delay={0.16}>
          {/* Channel Switches */}
          <ToggleRow
            label="Email Alerts for EMI Dues"
            sub="Receive reminder emails directly in your inbox"
            checked={emailAlertsEnabled}
            onChange={handleToggleEmailAlerts}
            noBorder
          />
          <ToggleRow
            label="Local Push Notifications"
            sub="Native device alerts for upcoming bills & EMIs"
            checked={pushNotificationsEnabled}
            onChange={handleTogglePushNotifications}
          />

          {/* Daily Expense Logging Reminder */}
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-[var(--border-color)]">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Daily Expense Reminder</p>
              <p className="text-xs text-[var(--text-secondary)]">
                &ldquo;Did you log today&apos;s expenses?&rdquo; alert
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={dailyReminderTime || "21:00"}
                onChange={(e) => {
                  setDailyReminderTime(e.target.value);
                  setNotifDailyReminder(true);
                }}
                className="px-2 py-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)]"
              />
              <ToggleSwitch
                checked={notifDailyReminder}
                onChange={(val) => setNotifDailyReminder(val)}
              />
            </div>
          </div>

          {/* Budget Limit Threshold Alerts */}
          <ToggleRow
            label="80% Budget Warning"
            sub="Notify when any monthly category reaches 80% of limit"
            checked={budgetAlert80}
            onChange={setBudgetAlert80}
          />
          <ToggleRow
            label="100% Budget Exceeded Alert"
            sub="High-priority warning when category limit is fully consumed"
            checked={budgetAlert100}
            onChange={setBudgetAlert100}
          />

          {/* Server Sync for EMIs */}
          {user && (
            <>
              <ToggleRow
                label="EMI Server Sync"
                sub="Store your EMI schedule on our server to send email notifications"
                checked={notifEMISync}
                onChange={handleToggleEMISync}
              />
              {FEATURE_MONTHLY && (
                <ToggleRow
                  label="Monthly Email Statement"
                  sub="Sync high-level monthly totals & receive official statement"
                  checked={notifMonthlyStatement}
                  onChange={(val) => {
                    if (val && !notifMonthlyStatement) setShowMonthlyConfirm(true);
                    else handleToggleMonthlyStatement(val);
                  }}
                />
              )}
            </>
          )}
        </SettingsSection>

        {/* ── 5. Advanced Modules (Sub-Pages) ─────────────────────────────────── */}
        <SettingsSection label="Data, Security & Diagnostics" delay={0.20}>
          <NavRow
            icon={<Shield size={16} className="text-[#10B981]" />}
            iconBg="bg-[#10B981]/10"
            label="Privacy, Rules & Diagnostics"
            sub="Balance masking, auto-lock timeout, auto-categorize rules, storage cache"
            onClick={() => router.push("/settings/privacy")}
            noBorder
          />
          <NavRow
            icon={<Smartphone size={16} className="text-[var(--accent,#6366F1)]" />}
            iconBg="bg-[var(--accent,#6366F1)]/10"
            label="Device-to-Device Migration"
            sub="Push encrypted backup QR code or scan to restore data across devices"
            onClick={() => router.push("/settings/transfer")}
          />
          <NavRow
            icon={<Tag size={16} className="text-[#F59E0B]" />}
            iconBg="bg-[#F59E0B]/10"
            label="Manage Categories"
            sub="Customize expense & income category icons and colors"
            onClick={() => router.push("/settings/categories")}
          />
          <NavRow
            icon={<Database size={16} className="text-[#3B82F6]" />}
            iconBg="bg-[#3B82F6]/10"
            label="Export & Data Wipe"
            sub="Export Excel (.xlsx), PDF, CSV, JSON and double-confirmed reset"
            onClick={() => router.push("/settings/export")}
          />
        </SettingsSection>

        {/* ── 6. About, Support & Feedback ────────────────────────────────────── */}
        <SettingsSection label="Support & Feedback" delay={0.24}>
          <NavRow
            icon={<HelpCircle size={16} className="text-[#EC4899]" />}
            iconBg="bg-[#EC4899]/10"
            label="About, Support & Feedback Form"
            sub="v1.0.0 Changelog, Help FAQ, in-app email dispatch & WhatsApp fallback"
            onClick={() => router.push("/settings/about")}
            noBorder
          />
        </SettingsSection>
      </div>

      {/* ── Currency Modal ── */}
      <CurrencySelectorModal
        open={showCurrencySheet}
        onClose={() => setShowCurrencySheet(false)}
        currentCode={defaultCurrency}
        onSelect={async (newCode) => {
          setDefaultCurrency(newCode);
          setShowCurrencySheet(false);
          const uid = user?.id ?? "anonymous";
          await useTransactionStore.getState().loadCumulativeBalance(uid);
          await useTransactionStore.getState().refreshTransactions(uid);
        }}
        title="Primary Currency"
        subtitle="All dashboards and entries convert to this currency"
      />

      {/* ── App Lock 4-Digit PIN Dialog ── */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent showCloseButton={false} className="bg-[var(--bg-card)] border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <Lock size={18} className="text-[var(--accent,#6366F1)]" />
              Set 4-Digit App Lock PIN
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-[var(--text-secondary)]">
              This PIN will be requested each time you open CapFlow to protect your sensitive financial data.
            </p>
            {pinError && (
              <div className="p-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444] text-xs flex items-center gap-1.5">
                <AlertCircle size={14} />
                {pinError}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Enter 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full mt-1 px-3 py-2 text-center text-lg font-mono tracking-widest rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent,#6366F1)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Confirm 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full mt-1 px-3 py-2 text-center text-lg font-mono tracking-widest rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent,#6366F1)]"
              />
            </div>
          </div>
          <DialogFooter className="bg-transparent border-[var(--border-color)]">
            <DialogClose
              render={
                <button className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors border border-[var(--border-color)]" />
              }
            >
              Cancel
            </DialogClose>
            <button
              onClick={handleSavePin}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--accent,#6366F1)] text-white hover:opacity-90 transition-opacity"
            >
              Activate PIN
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sign Out Confirmation Dialog ── */}
      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent showCloseButton={false} className="bg-[var(--bg-card)] border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">Sign Out</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">
            Are you sure you want to sign out? Your local transactions will remain safe on this device.
          </p>
          <DialogFooter className="bg-transparent border-[var(--border-color)]">
            <DialogClose
              render={
                <button className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors border border-[var(--border-color)]" />
              }
            >
              Cancel
            </DialogClose>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#EF4444] text-white hover:bg-[#DC2626] transition-colors disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign Out"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Monthly Summary Confirmation Dialog ── */}
      <Dialog open={showMonthlyConfirm} onOpenChange={setShowMonthlyConfirm}>
        <DialogContent showCloseButton={false} className="bg-[var(--bg-card)] border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">Enable Monthly Summary?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">
            This will sync your monthly totals (income, expense, savings — no individual transaction items) to our servers to send you a monthly email summary.
          </p>
          <DialogFooter className="bg-transparent border-[var(--border-color)]">
            <DialogClose
              render={
                <button className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors border border-[var(--border-color)]" />
              }
            >
              Cancel
            </DialogClose>
            <button
              onClick={() => {
                handleToggleMonthlyStatement(true);
                setShowMonthlyConfirm(false);
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--accent,#6366F1)] text-white hover:opacity-90 transition-opacity"
            >
              Enable
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Device Hardware & Permissions Modal ── */}
      <DevicePermissionModal
        forceOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
      />

      {/* ── Payment QR Code Modal ── */}
      <PaymentQRModal
        open={showPaymentQRModal}
        onClose={() => setShowPaymentQRModal(false)}
      />

      {/* ── QR Code Expand Preview Modal ── */}
      <QRCodeExpandModal
        open={showQrExpandModal}
        onClose={() => setShowQrExpandModal(false)}
        title="Payment QR Code Preview"
        subtitle="Enlarged view for quick scanning & settlements"
        imageUrl={user?.paymentQrCode || paymentQrCode}
        upiId={user?.upiId || paymentUpiId}
        userName={displayName || user?.name || "Your Account"}
        downloadFileName={user?.name ? `${user.name.replace(/\s+/g, "_")}_Payment_QR` : "CapFlow_Payment_QR"}
      />
    </div>
  );
}
