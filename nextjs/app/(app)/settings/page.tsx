"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Sun,
  Database,
  Shield,
  LogOut,
  LogIn,
  Globe,
  Bell,
  Tag,
  Search,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/store/authStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
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
import { CURRENCIES, CURRENCY_SYMBOLS, useExchangeRateStore } from "@/lib/currency/exchangeRates";
import { useTransactionStore } from "@/lib/store/transactionStore";

// ─── iOS-style Toggle Switch ──────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? "bg-[#6366F1]" : "bg-[var(--border-color)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── Section container ────────────────────────────────────────────────────────

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
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
        {children}
      </div>
    </motion.div>
  );
}

// ─── Chevron row ──────────────────────────────────────────────────────────────

function ChevronRow({
  label,
  sub,
  onClick,
  noBorder = false,
}: {
  label: string;
  sub?: string;
  onClick: () => void;
  noBorder?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-card-hover)] transition-colors ${
        noBorder ? "" : "border-t border-[var(--border-color)]"
      }`}
    >
      <div className="text-left">
        <p className="text-sm text-[var(--text-primary)]">{label}</p>
        {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</p>}
      </div>
      <ChevronRight size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
    </button>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  sub,
  checked,
  onChange,
  noBorder = false,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  noBorder?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between px-4 py-3.5 gap-3 ${
        noBorder ? "" : "border-t border-[var(--border-color)]"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)]">{label}</p>
        {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{sub}</p>}
      </div>
      <div className="flex-shrink-0 pt-0.5">
        <ToggleSwitch checked={checked} onChange={onChange} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const FEATURE_MONTHLY = process.env.NEXT_PUBLIC_FEATURE_MONTHLY_STATEMENT === "true";

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const {
    defaultCurrency,
    setDefaultCurrency,
    notifEMIReminders,
    setNotifEMIReminders,
    notifEMISync,
    setNotifEMISync,
    notifMonthlyStatement,
    setNotifMonthlyStatement,
  } = useSettingsStore();

  const [signingOut, setSigningOut] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showCurrencySheet, setShowCurrencySheet] = useState(false);
  const [showMonthlyConfirm, setShowMonthlyConfirm] = useState(false);
  const [convertingAll, setConvertingAll] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { lastUpdated } = useExchangeRateStore();
  const timeAgoMinutes = mounted && lastUpdated > 0 ? Math.floor((Date.now() - lastUpdated) / (60 * 1000)) : null;

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

  const handleMonthlyToggle = (val: boolean) => {
    if (val && !notifMonthlyStatement) {
      setShowMonthlyConfirm(true);
    } else {
      setNotifMonthlyStatement(val);
    }
  };

  const initials = mounted && user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "G";

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
      {/* Header */}
      <header className="px-4 py-5 border-b border-[var(--border-color)]">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>
      </header>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-10">
        {/* ── Profile ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
          className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#6366F1] to-[#38bdf8] flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white font-bold text-xl">{initials}</span>
              </div>
              <div>
                <p suppressHydrationWarning className="font-semibold text-[var(--text-primary)]">
                  {mounted && user?.name ? user.name : "Guest User"}
                </p>
                <p suppressHydrationWarning className="text-xs text-[var(--text-secondary)]">
                  {mounted && user?.email ? user.email : "Not signed in"}
                </p>
              </div>
            </div>
            {mounted && user ? (
              <button
                onClick={() => setShowSignOutDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EF4444]/10 text-[#EF4444] text-xs font-semibold border border-[#EF4444]/20 hover:bg-[#EF4444]/20 transition-colors cursor-pointer"
              >
                <LogOut size={12} />
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => { window.location.href = "/auth"; }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6366F1] text-white text-xs font-semibold shadow-sm hover:bg-[#5558E6] transition-colors cursor-pointer"
              >
                <LogIn size={12} />
                Sign In
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Preferences ── */}
        <SettingsSection label="Preferences" delay={0.06}>
          {/* Currency */}
          <button
            onClick={() => setShowCurrencySheet(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                <Globe size={15} className="text-[#6366F1]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--text-primary)]">Currency</p>
                <p className="text-xs text-[var(--text-secondary)]">{activeCurrency.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#6366F1]/10 text-xs font-bold text-[#6366F1] border border-[#6366F1]/20">
                <span>{activeCurrency.symbol}</span>
                <span>{activeCurrency.code}</span>
              </span>
              <ChevronRight size={15} className="text-[var(--text-secondary)]" />
            </div>
          </button>

          {/* Real-time Exchange Rate Status & Bulk Sync */}
          <div className="px-4 py-2 bg-[var(--bg-card-hover)]/30 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span suppressHydrationWarning>Real rates • Refreshed every 3h {mounted && timeAgoMinutes !== null ? `(${timeAgoMinutes}m ago)` : ""}</span>
            </span>
            <button
              type="button"
              onClick={async () => {
                setConvertingAll(true);
                await useTransactionStore.getState().convertAllStoredTransactions(defaultCurrency);
                setConvertingAll(false);
                setConvertSuccess(`All stored transactions synced to ${defaultCurrency}!`);
                setTimeout(() => setConvertSuccess(null), 4500);
              }}
              disabled={convertingAll}
              className="text-[#6366F1] hover:underline font-semibold cursor-pointer disabled:opacity-50"
            >
              {convertingAll ? "Converting…" : `Sync records to ${defaultCurrency}`}
            </button>
          </div>
          {convertSuccess && (
            <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold text-center border-t border-emerald-500/20">
              {convertSuccess}
            </div>
          )}

          {/* Theme */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                <Sun size={15} className="text-[#F59E0B]" />
              </div>
              <span className="text-sm text-[var(--text-primary)]">Theme</span>
            </div>
            <ThemeToggle />
          </div>

          {/* Notification preferences — only when signed in */}
          {user && (
            <>
              <div className="px-4 pt-3 pb-1 border-t border-[var(--border-color)] flex items-center gap-2">
                <Bell size={14} className="text-[var(--text-secondary)]" />
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Notifications
                </p>
              </div>

              <ToggleRow
                label="EMI Reminder Emails"
                checked={notifEMIReminders}
                onChange={setNotifEMIReminders}
              />

              <ToggleRow
                label="EMI Email Sync"
                sub="Store your EMI schedule on our server to send you email reminders. Only EMI name, amount, and due date are stored — not your transactions."
                checked={notifEMISync}
                onChange={setNotifEMISync}
              />

              {FEATURE_MONTHLY && (
                <ToggleRow
                  label="Monthly Email Summary"
                  sub="Sync your monthly totals (income, expense, savings — no transaction details) to send you a monthly email summary."
                  checked={notifMonthlyStatement}
                  onChange={handleMonthlyToggle}
                />
              )}
            </>
          )}
        </SettingsSection>

        {/* ── Categories ── */}
        <SettingsSection label="Categories" delay={0.12}>
          <button
            onClick={() => router.push("/settings/categories")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                <Tag size={15} className="text-[#10B981]" />
              </div>
              <span className="text-sm text-[var(--text-primary)]">Manage Categories</span>
            </div>
            <ChevronRight size={15} className="text-[var(--text-secondary)]" />
          </button>
        </SettingsSection>

        {/* ── Data ── */}
        <SettingsSection label="Data" delay={0.18}>
          <button
            onClick={() => router.push("/settings/export")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                <Database size={15} className="text-[#6366F1]" />
              </div>
              <span className="text-sm text-[var(--text-primary)]">Export / Backup &amp; Restore</span>
            </div>
            <ChevronRight size={15} className="text-[var(--text-secondary)]" />
          </button>
        </SettingsSection>

        {/* ── About ── */}
        <SettingsSection label="About" delay={0.24}>
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-start gap-2">
              <Shield size={15} className="text-[#10B981] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--text-secondary)]">
                All your financial data is stored only on this device
              </p>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">CapFlow v1.0.0</p>
          </div>
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
        title="Default Currency"
        subtitle="App balances and transactions convert to this currency"
      />

      {/* ── Sign Out Confirmation Dialog ── */}
      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent showCloseButton={false} className="bg-[var(--bg-card)] border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">Sign Out</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">
            Are you sure you want to sign out?
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
            This will sync your monthly totals (income, expense, savings — no transaction details) to our servers to send you a monthly email summary.
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
                setNotifMonthlyStatement(true);
                setShowMonthlyConfirm(false);
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#6366F1] text-white hover:bg-[#5558E6] transition-colors"
            >
              Enable
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
