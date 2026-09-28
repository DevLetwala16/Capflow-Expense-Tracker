"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit3,
  TrendingDown,
  Mail,
  Loader2,
  FileText,
  Bell,
  Send,
  ShieldCheck,
  MailCheck,
} from "lucide-react";
import { useEMIStore } from "@/lib/store/emiStore";
import { useAuthStore } from "@/lib/store/authStore";
import { AddEditEMISheet } from "@/components/emis/AddEditEMISheet";
import { EMI } from "@/lib/db";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#6366F1";
const DANGER = "#EF4444";
const WARNING = "#F59E0B";
const SUCCESS = "#10B981";

// ─── Ordinal helper ───────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── EMI status ───────────────────────────────────────────────────────────────

type EMIStatus = "overdue" | "due-soon" | "upcoming";

function getStatus(emi: EMI): EMIStatus {
  const today = new Date().getDate();
  const pastDue = today > emi.dueDay;
  const diff = emi.dueDay - today;

  if (pastDue) {
    // Check whether this month's installment has been paid
    const start = new Date(emi.startDate);
    const now = new Date();
    const monthsElapsed =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());
    const expected = Math.min(monthsElapsed + 1, emi.totalInstallments);
    if (emi.paidInstallments < expected) return "overdue";
    return "upcoming";
  }
  if (diff <= emi.reminderLeadDays) return "due-soon";
  return "upcoming";
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EMIStatus }) {
  if (status === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444] animate-pulse">
        <AlertTriangle size={10} />
        Overdue
      </span>
    );
  }
  if (status === "due-soon") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B]/15 text-[#F59E0B]">
        <Clock size={10} />
        Due Soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#10B981]">
      <CheckCircle2 size={10} />
      Upcoming
    </span>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--border-color)]" />
          <div>
            <div className="h-4 w-32 bg-[var(--border-color)] rounded-lg mb-1.5" />
            <div className="h-3 w-20 bg-[var(--border-color)] rounded-lg" />
          </div>
        </div>
        <div className="h-5 w-16 bg-[var(--border-color)] rounded-full" />
      </div>
      <div className="h-1.5 bg-[var(--border-color)] rounded-full mb-2" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 bg-[var(--border-color)] rounded-lg" />
        <div className="h-3 w-16 bg-[var(--border-color)] rounded-lg" />
      </div>
    </div>
  );
}

// ─── EMI Email Services (Professional & Simple) ───────────────────────────────

type SendingState = "idle" | "sending-reminder" | "sending-statement" | "success" | "error";

function EMIEmailServices({ emi }: { emi: EMI }) {
  const { user } = useAuthStore();
  const [sendingState, setSendingState] = useState<SendingState>("idle");
  const [feedbackMsg, setFeedbackMsg] = useState<string>("");
  const [customEmail, setCustomEmail] = useState<string>("");
  const [showEmailInput, setShowEmailInput] = useState<boolean>(false);

  const effectiveEmail = (customEmail.trim() || user?.email || "").trim();

  const handleSend = async (type: "reminder" | "statement", e: React.MouseEvent) => {
    e.stopPropagation();

    if (!effectiveEmail) {
      setShowEmailInput(true);
      setSendingState("error");
      setFeedbackMsg("Please provide your email address first.");
      return;
    }

    setSendingState(type === "reminder" ? "sending-reminder" : "sending-statement");
    setFeedbackMsg("");

    try {
      const res = await fetch("/api/emis/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          emiName: emi.name,
          monthlyCost: emi.monthlyCost,
          totalCost: emi.totalCost,
          dueDay: emi.dueDay,
          startDate: emi.startDate,
          totalInstallments: emi.totalInstallments,
          paidInstallments: emi.paidInstallments,
          reminderLeadDays: emi.reminderLeadDays,
          fallbackEmail: effectiveEmail,
          fallbackName: user?.name || "Valued User",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSendingState("success");
        setFeedbackMsg(
          type === "reminder"
            ? `Due reminder sent to ${effectiveEmail}`
            : `Statement with PDF attached sent to ${effectiveEmail}`
        );
        setTimeout(() => {
          setSendingState("idle");
          setFeedbackMsg("");
        }, 4000);
      } else {
        setSendingState("error");
        setFeedbackMsg(data.error || "Failed to send email. Check SMTP settings.");
        setTimeout(() => {
          setSendingState("idle");
        }, 5000);
      }
    } catch {
      setSendingState("error");
      setFeedbackMsg("Network error. Could not connect to mail server.");
      setTimeout(() => {
        setSendingState("idle");
      }, 5000);
    }
  };

  const isBusy = sendingState === "sending-reminder" || sendingState === "sending-statement";

  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-color)]">
      {/* Recipient indicator & edit toggle */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] px-0.5">
        <span className="flex items-center gap-1.5 truncate">
          <Mail size={11} className="text-[#6366F1] flex-shrink-0" />
          <span className="truncate">
            To: <span className="text-[var(--text-primary)] font-medium">{effectiveEmail || "Not configured"}</span>
          </span>
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowEmailInput(!showEmailInput);
          }}
          className="text-[10px] text-[#6366F1] hover:underline font-medium flex-shrink-0 ml-2"
        >
          {showEmailInput ? "Cancel" : "Change"}
        </button>
      </div>

      {/* Inline Email Input */}
      <AnimatePresence>
        {(showEmailInput || !effectiveEmail) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 overflow-hidden py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="Enter email to receive notifications"
              className="flex-1 px-3 py-2 rounded-xl text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
            />
            {customEmail && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmailInput(false);
                }}
                className="px-3 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-semibold"
              >
                Save
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two Clean Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={(e) => handleSend("reminder", e)}
          disabled={isBusy}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-semibold hover:bg-[#F59E0B]/20 transition-all disabled:opacity-50"
        >
          {sendingState === "sending-reminder" ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>Sending…</span>
            </>
          ) : (
            <>
              <Bell size={12} />
              <span>Due Reminder</span>
            </>
          )}
        </button>

        <button
          onClick={(e) => handleSend("statement", e)}
          disabled={isBusy}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#6366F1]/10 text-[#6366F1] text-xs font-semibold hover:bg-[#6366F1]/20 transition-all disabled:opacity-50"
        >
          {sendingState === "sending-statement" ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>Sending…</span>
            </>
          ) : (
            <>
              <FileText size={12} />
              <span>Send Statement</span>
            </>
          )}
        </button>
      </div>

      {/* Subtle Status Feedback Pill */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            className={`py-1.5 px-3 rounded-xl text-center text-xs font-medium flex items-center justify-center gap-1.5 ${
              sendingState === "success"
                ? "bg-[#10B981]/15 text-[#10B981]"
                : "bg-[#EF4444]/15 text-[#EF4444]"
            }`}
          >
            {sendingState === "success" ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            <span>{feedbackMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── EMI Card ─────────────────────────────────────────────────────────────────

function EMICard({
  emi,
  index,
  onEdit,
  onDelete,
  onMarkPaid,
}: {
  emi: EMI;
  index: number;
  onEdit: (emi: EMI) => void;
  onDelete: (emi: EMI) => void;
  onMarkPaid: (id: number) => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const status = getStatus(emi);
  const progressPct =
    emi.totalInstallments > 0
      ? Math.min((emi.paidInstallments / emi.totalInstallments) * 100, 100)
      : 0;

  const barColor =
    status === "overdue"
      ? DANGER
      : status === "due-soon"
      ? WARNING
      : ACCENT;

  const accentBg =
    status === "overdue"
      ? `${DANGER}18`
      : status === "due-soon"
      ? `${WARNING}18`
      : `${ACCENT}18`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
      className={`bg-[var(--bg-card)] rounded-2xl border-2 overflow-hidden transition-colors ${
        status === "overdue"
          ? "border-[#EF4444]/40"
          : status === "due-soon"
          ? "border-[#F59E0B]/40"
          : "border-[var(--border-color)]"
      }`}
    >
      {/* Main content */}
      <button
        className="w-full text-left p-4"
        onClick={() => setActionsOpen((v) => !v)}
        aria-expanded={actionsOpen}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          {/* Icon + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: accentBg }}
            >
              <TrendingDown size={18} style={{ color: barColor }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                {emi.name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Calendar size={11} className="text-[var(--text-secondary)] flex-shrink-0" />
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Due on {ordinal(emi.dueDay)} each month
                </span>
              </div>
            </div>
          </div>

          {/* Monthly cost + badge */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-base font-extrabold text-[#EF4444]">
              ₹{emi.monthlyCost.toLocaleString("en-IN")}
            </span>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: barColor }}
          />
        </div>

        {/* Installments text */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-secondary)]">
            {emi.paidInstallments} of {emi.totalInstallments} installments paid
          </span>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
            {Math.round(progressPct)}%
          </span>
        </div>
      </button>

      {/* Expandable action row */}
      <AnimatePresence>
        {actionsOpen && (
          <motion.div
            key="actions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 px-4 pb-4 pt-1 border-t border-[var(--border-color)]">
              {/* ── Row 1: Mark Paid · Edit · Delete ──────────────────────── */}
              <div className="flex items-center gap-2">
                {/* Mark paid */}
                {emi.paidInstallments < emi.totalInstallments && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (emi.id != null) onMarkPaid(emi.id);
                      setActionsOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#10B981]/10 text-[#10B981] text-xs font-bold hover:bg-[#10B981]/20 transition-colors"
                  >
                    <CheckCircle2 size={13} />
                    Mark Paid
                  </button>
                )}

                {/* Edit */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(emi);
                    setActionsOpen(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#6366F1]/10 text-[#6366F1] text-xs font-bold hover:bg-[#6366F1]/20 transition-colors"
                >
                  <Edit3 size={13} />
                  Edit
                </button>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(emi);
                    setActionsOpen(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#EF4444]/10 text-[#EF4444] text-xs font-bold hover:bg-[#EF4444]/20 transition-colors"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>

              {/* ── Row 2: Email Services (Due Reminder & Intermediate Statement) ─ */}
              <EMIEmailServices emi={emi} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] p-10 text-center mx-0"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 flex items-center justify-center mx-auto mb-4">
        <CreditCard size={28} className="text-[#6366F1]" />
      </div>
      <p className="text-base font-bold text-[var(--text-primary)] mb-1">
        No EMIs yet
      </p>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Track your loan EMIs and never miss a payment
      </p>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#6366F1] text-white text-sm font-bold hover:bg-[#5558E3] transition-colors"
      >
        <Plus size={16} />
        Add your first EMI
      </motion.button>
    </motion.div>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({
  total,
  overdueCount,
  dueSoonCount,
}: {
  total: number;
  overdueCount: number;
  dueSoonCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-3 text-center">
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">
          Monthly
        </p>
        <p className="text-base font-extrabold text-[#EF4444]">
          ₹{total.toLocaleString("en-IN")}
        </p>
      </div>
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-3 text-center">
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">
          Overdue
        </p>
        <p
          className={`text-base font-extrabold ${
            overdueCount > 0 ? "text-[#EF4444]" : "text-[var(--text-primary)]"
          }`}
        >
          {overdueCount}
        </p>
      </div>
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-3 text-center">
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">
          Due Soon
        </p>
        <p
          className={`text-base font-extrabold ${
            dueSoonCount > 0 ? "text-[#F59E0B]" : "text-[var(--text-primary)]"
          }`}
        >
          {dueSoonCount}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EMIsPage() {
  const { user } = useAuthStore();
  const {
    emis,
    loading,
    loaded,
    loadEMIs,
    deleteEMI,
    markInstallmentPaid,
    totalMonthlyEMIBurden,
  } = useEMIStore();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EMI | null>(null);

  useEffect(() => {
    if (user?.id) loadEMIs(user.id);
  }, [user, loadEMIs]);

  const handleEdit = (emi: EMI) => {
    setEditTarget(emi);
    setSheetOpen(true);
  };

  const handleAdd = () => {
    setEditTarget(null);
    setSheetOpen(true);
  };

  const handleDelete = async (emi: EMI) => {
    const confirmed = window.confirm(
      `Delete "${emi.name}"? This cannot be undone.`
    );
    if (confirmed && emi.id != null) await deleteEMI(emi.id);
  };

  const handleClose = () => {
    setSheetOpen(false);
    setEditTarget(null);
  };

  const isLoading = loading || !loaded;

  const overdueEmis = emis.filter((e) => getStatus(e) === "overdue");
  const dueSoonEmis = emis.filter((e) => getStatus(e) === "due-soon");
  const monthlyTotal = totalMonthlyEMIBurden();

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              EMI Management
            </h1>
            {emis.length > 0 && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                ₹{monthlyTotal.toLocaleString("en-IN")}/month total burden
              </p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6366F1] text-white text-sm font-bold shadow-sm hover:bg-[#5558E3] transition-colors"
          >
            <Plus size={16} />
            Add EMI
          </motion.button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="px-4 py-5 space-y-3">
        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Loaded + has EMIs */}
        {!isLoading && emis.length > 0 && (
          <>
            <SummaryBar
              total={monthlyTotal}
              overdueCount={overdueEmis.length}
              dueSoonCount={dueSoonEmis.length}
            />

            <AnimatePresence mode="popLayout">
              {emis.map((emi, i) => (
                <EMICard
                  key={emi.id ?? i}
                  emi={emi}
                  index={i}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMarkPaid={markInstallmentPaid}
                />
              ))}
            </AnimatePresence>
          </>
        )}

        {/* Empty state */}
        {!isLoading && emis.length === 0 && (
          <EmptyState onAdd={handleAdd} />
        )}
      </div>

      {/* ── Sheet ───────────────────────────────────────────────────────── */}
      <AddEditEMISheet
        open={sheetOpen}
        onClose={handleClose}
        editEMI={editTarget}
      />
    </div>
  );
}
