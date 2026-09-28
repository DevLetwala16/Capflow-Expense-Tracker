"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  FileText,
  Calendar,
  CalendarRange,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  subDays,
  startOfYear,
} from "date-fns";
import { db, Transaction } from "@/lib/db";
import { useAuthStore } from "@/lib/store/authStore";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { PDFTransactionItem } from "@/lib/email/transactionStatementPdf";

interface TransactionStatementSheetProps {
  open: boolean;
  onClose: () => void;
}

type StatementMode = "last_month" | "custom_range";

export function TransactionStatementSheet({
  open,
  onClose,
}: TransactionStatementSheetProps) {
  const { user } = useAuthStore();
  const { categories } = useCategoryStore();
  const { defaultCurrency } = useSettingsStore();

  const [mode, setMode] = useState<StatementMode>("last_month");
  const [recipientEmail, setRecipientEmail] = useState("");

  // Custom range dates
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [customStart, setCustomStart] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [customEnd, setCustomEnd] = useState(todayStr);

  // Computed state
  const [matchedTransactions, setMatchedTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync recipient email from user
  useEffect(() => {
    if (user?.email) {
      setRecipientEmail(user.email);
    }
  }, [user]);

  // Determine active start & end dates
  const { activeStartDate, activeEndDate, activePeriodLabel } = useMemo(() => {
    if (mode === "last_month") {
      const prevMonth = subMonths(new Date(), 1);
      const start = format(startOfMonth(prevMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(prevMonth), "yyyy-MM-dd");
      return {
        activeStartDate: start,
        activeEndDate: end,
        activePeriodLabel: format(prevMonth, "MMMM yyyy"),
      };
    } else {
      let label = "Custom Range";
      try {
        if (customStart && customEnd) {
          const s = format(new Date(customStart + "T00:00:00"), "dd MMM yyyy");
          const e = format(new Date(customEnd + "T00:00:00"), "dd MMM yyyy");
          label = `${s} - ${e}`;
        }
      } catch {
        label = "Custom Range";
      }
      return {
        activeStartDate: customStart,
        activeEndDate: customEnd,
        activePeriodLabel: label,
      };
    }
  }, [mode, customStart, customEnd]);

  // Load transactions for the active range from Dexie
  const loadTransactions = useCallback(async () => {
    if (!open || !activeStartDate || !activeEndDate) return;
    setLoadingData(true);
    setErrorMessage(null);
    try {
      let txs: Transaction[] = [];
      const uid = user?.id;

      if (uid) {
        txs = await db.transactions
          .where("[userId+date]")
          .between([uid, activeStartDate], [uid, activeEndDate], true, true)
          .toArray();
      } else {
        txs = await db.transactions
          .where("date")
          .between(activeStartDate, activeEndDate, true, true)
          .toArray();
      }

      // Sort descending by date
      txs.sort((a, b) => (b.date > a.date ? 1 : -1));
      setMatchedTransactions(txs);
    } catch (err) {
      console.error("Failed to query transactions for statement:", err);
      // Fallback: load all transactions and filter
      try {
        const all = await db.transactions.toArray();
        const filtered = all.filter(
          (t) =>
            t.date >= activeStartDate &&
            t.date <= activeEndDate &&
            (!user?.id || t.userId === user.id)
        );
        filtered.sort((a, b) => (b.date > a.date ? 1 : -1));
        setMatchedTransactions(filtered);
      } catch (e) {
        console.error("Dexie fallback error:", e);
      }
    } finally {
      setLoadingData(false);
    }
  }, [open, activeStartDate, activeEndDate, user?.id]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Calculations
  const { totalIncome, totalExpense, netSavings } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of matchedTransactions) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return {
      totalIncome: income,
      totalExpense: expense,
      netSavings: income - expense,
    };
  }, [matchedTransactions]);

  // Preset handlers for custom range
  const handlePreset = (preset: "this_month" | "last_30" | "last_90" | "this_year") => {
    const now = new Date();
    if (preset === "this_month") {
      setCustomStart(format(startOfMonth(now), "yyyy-MM-dd"));
      setCustomEnd(todayStr);
    } else if (preset === "last_30") {
      setCustomStart(format(subDays(now, 30), "yyyy-MM-dd"));
      setCustomEnd(todayStr);
    } else if (preset === "last_90") {
      setCustomStart(format(subDays(now, 90), "yyyy-MM-dd"));
      setCustomEnd(todayStr);
    } else if (preset === "this_year") {
      setCustomStart(format(startOfYear(now), "yyyy-MM-dd"));
      setCustomEnd(todayStr);
    }
  };

  // Send statement handler
  const handleSendStatement = async () => {
    const targetEmail = recipientEmail.trim() || user?.email;
    if (!targetEmail) {
      setErrorMessage("Please enter an email address to receive the statement.");
      return;
    }

    setSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Map matched transactions to PDFTransactionItem format
      const pdfItems: PDFTransactionItem[] = matchedTransactions.map((tx) => {
        const cat = categories.find((c) => c.id === tx.categoryId);
        return {
          date: tx.date,
          title: tx.title || "Untitled",
          category: cat?.name || "General",
          paymentMethod: tx.paymentMethod
            ? tx.paymentMethod.replace("_", " ").toUpperCase()
            : "CASH",
          type: tx.type,
          amount: tx.amount,
        };
      });

      const res = await fetch("/api/transactions/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodLabel: activePeriodLabel,
          startDate: activeStartDate,
          endDate: activeEndDate,
          transactions: pdfItems,
          totalIncome,
          totalExpense,
          netSavings,
          fallbackEmail: targetEmail,
          fallbackName: user?.name || "User",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send transaction statement");
      }

      setSuccessMessage(
        `Statement PDF successfully sent to ${targetEmail}! Please check your email inbox.`
      );
    } catch (err: any) {
      console.error("[Send Statement Error]:", err);
      setErrorMessage(
        err?.message || "Failed to send statement. Please check your SMTP settings."
      );
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="tx-statement-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!sending) onClose();
            }}
            className="fixed inset-0 bg-black/80 z-[90] backdrop-blur-sm"
          />

          {/* Modal / Bottom Sheet Positioning Wrapper */}
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <motion.div
              key="tx-statement-sheet"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="pointer-events-auto relative w-full max-w-[480px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[85dvh] sm:max-h-[88dvh] overflow-hidden"
            >
              {/* Drag Handle (Mobile) */}
              <div className="flex sm:hidden justify-center pt-2.5 pb-1 flex-shrink-0">
                <div className="w-12 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-[var(--border-color)] flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-tight">
                      Transaction Statement
                    </h2>
                    <p className="text-[11px] sm:text-xs text-[var(--text-secondary)]">
                      Export email & official PDF statement
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={sending}
                  className="w-8 h-8 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3.5 space-y-3.5">
                {/* Mode Tabs */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => {
                  setMode("last_month");
                  setSuccessMessage(null);
                  setErrorMessage(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  mode === "last_month"
                    ? "bg-[#6366F1] text-white shadow-md shadow-indigo-500/20"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Calendar size={14} />
                <span>Last Month</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("custom_range");
                  setSuccessMessage(null);
                  setErrorMessage(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  mode === "custom_range"
                    ? "bg-[#6366F1] text-white shadow-md shadow-indigo-500/20"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <CalendarRange size={14} />
                <span>Custom Date Range</span>
              </button>
            </div>

            {/* Custom Date Pickers & Presets (Visible only in custom_range mode) */}
            {mode === "custom_range" && (
              <div className="space-y-3 bg-[var(--bg-primary)]/60 border border-[var(--border-color)] rounded-2xl p-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      max={customEnd || todayStr}
                      onChange={(e) => {
                        setCustomStart(e.target.value);
                        setSuccessMessage(null);
                      }}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] font-medium outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      min={customStart}
                      max={todayStr}
                      onChange={(e) => {
                        setCustomEnd(e.target.value);
                        setSuccessMessage(null);
                      }}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] font-medium outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { id: "this_month", label: "This Month" },
                    { id: "last_30", label: "Last 30 Days" },
                    { id: "last_90", label: "Last 90 Days" },
                    { id: "this_year", label: "This Year" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePreset(p.id as any)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Statement Summary Card */}
            <div className="bg-gradient-to-br from-indigo-950/20 via-[var(--bg-card)] to-slate-900/30 border border-indigo-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    Selected Statement Period
                  </span>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mt-1">
                    {activePeriodLabel}
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {activeStartDate} to {activeEndDate}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    {loadingData ? (
                      <Loader2 size={16} className="animate-spin text-indigo-400" />
                    ) : (
                      `${matchedTransactions.length} items`
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Transactions
                  </span>
                </div>
              </div>

              {/* Stat breakdown */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-color)]/60">
                <div className="bg-[var(--bg-primary)]/80 rounded-xl p-2.5 text-center border border-[var(--border-color)]/40">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                    Income
                  </span>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5 truncate">
                    +₹{totalIncome.toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-[var(--bg-primary)]/80 rounded-xl p-2.5 text-center border border-[var(--border-color)]/40">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                    Expense
                  </span>
                  <div className="text-xs font-bold text-red-400 mt-0.5 truncate">
                    -₹{totalExpense.toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-[var(--bg-primary)]/80 rounded-xl p-2.5 text-center border border-[var(--border-color)]/40">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase">
                    Net
                  </span>
                  <div
                    className={`text-xs font-bold mt-0.5 truncate ${
                      netSavings >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {netSavings >= 0 ? "+" : "-"}₹
                    {Math.abs(netSavings).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient Email Input */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Send statement to email
              </label>
              <div className="flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2">
                <Mail size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
              </div>
              {/* <p className="text-[11px] text-[var(--text-secondary)] mt-1"></p> */}
            </div>

            {/* Status alerts */}
            {errorMessage && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 text-xs">
                <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                <span className="flex-1 font-medium">{successMessage}</span>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div
            className="px-5 pt-3 pb-8 sm:pb-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col gap-2 flex-shrink-0"
            style={{ paddingBottom: "max(1.75rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))" }}
          >
            <button
              type="button"
              onClick={handleSendStatement}
              disabled={sending || loadingData || !recipientEmail.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generating PDF & Sending Email...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>
                    {mode === "last_month"
                      ? "Send Last Month Statement (PDF)"
                      : "Send Custom Range Statement (PDF)"}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 active:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )}
</AnimatePresence>
  );
}
