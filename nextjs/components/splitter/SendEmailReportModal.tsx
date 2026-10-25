"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Send,
  Check,
  AlertCircle,
  Plus,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { SplitSession } from "@/types/splitter";
import { formatSplitCurrency } from "@/lib/splitter/debtEngine";

interface SendEmailReportModalProps {
  open: boolean;
  onClose: () => void;
  session: SplitSession;
  currentUserEmail?: string;
  currentUserName?: string;
  onDispatched?: (message: string) => void;
  initialFilterMode?: 'whole' | 'last_month' | 'custom';
  initialStartDate?: string;
  initialEndDate?: string;
}

export function SendEmailReportModal({
  open,
  onClose,
  session,
  currentUserEmail,
  currentUserName,
  onDispatched,
  initialFilterMode = 'whole',
  initialStartDate = '',
  initialEndDate = '',
}: SendEmailReportModalProps) {
  const [filterMode, setFilterMode] = useState<'whole' | 'last_month' | 'custom'>(initialFilterMode);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setFilterMode(initialFilterMode);
      setStartDate(initialStartDate);
      setEndDate(initialEndDate);
    }
  }, [open, initialFilterMode, initialStartDate, initialEndDate]);

  // Initialize recipients when modal opens or session changes
  useEffect(() => {
    if (open) {
      const initialSet = new Set<string>();

      // 1. Add current user's email if available
      if (currentUserEmail && currentUserEmail.includes("@")) {
        initialSet.add(currentUserEmail.trim().toLowerCase());
      }

      // 2. Add all members who have an email in session.members
      session.members.forEach((m) => {
        if (m.email && m.email.includes("@")) {
          initialSet.add(m.email.trim().toLowerCase());
        }
      });

      setRecipients(Array.from(initialSet));
      setEmailInput("");
      setPersonalNote("");
      setStatusMessage(null);
    }
  }, [open, session, currentUserEmail]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const handleAddEmail = (rawInput?: string) => {
    const textToAdd = rawInput !== undefined ? rawInput : emailInput;
    if (!textToAdd.trim()) return;

    // Support comma, semicolon, space, or newline delimited strings
    const candidates = textToAdd
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const validNewEmails: string[] = [];
    const invalidEmails: string[] = [];

    candidates.forEach((email) => {
      if (isValidEmail(email)) {
        if (!recipients.includes(email)) {
          validNewEmails.push(email);
        }
      } else {
        invalidEmails.push(email);
      }
    });

    if (validNewEmails.length > 0) {
      setRecipients((prev) => [...prev, ...validNewEmails]);
      setEmailInput("");
      setStatusMessage(null);
    }

    if (invalidEmails.length > 0) {
      setStatusMessage({
        type: "error",
        text: `Invalid email format: ${invalidEmails.join(", ")}`,
      });
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setRecipients((prev) => prev.filter((e) => e !== emailToRemove));
    setStatusMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleSendStatement = async () => {
    // If user typed an email in the input without pressing enter/add, add it first
    let currentRecipients = [...recipients];
    if (emailInput.trim()) {
      const candidates = emailInput
        .split(/[,;\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => isValidEmail(e));
      candidates.forEach((c) => {
        if (!currentRecipients.includes(c)) currentRecipients.push(c);
      });
      setRecipients(currentRecipients);
      setEmailInput("");
    }

    if (currentRecipients.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Please specify at least one recipient email address.",
      });
      return;
    }

    setSending(true);
    setStatusMessage(null);

    let dateRangeLabel: string | undefined = undefined;
    if (filterMode === 'last_month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      dateRangeLabel = `Last Month (${firstDay} to ${lastDay})`;
    } else if (filterMode === 'custom') {
      dateRangeLabel = `Custom Range (${startDate || 'Start'} to ${endDate || 'Now'})`;
    }

    try {
      const res = await fetch(
        `/api/splitter/sessions/${encodeURIComponent(session.sessionId)}/email-report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipients: currentRecipients,
            note: personalNote.trim() || undefined,
            filterMode,
            startDate: filterMode === "custom" && startDate ? startDate : undefined,
            endDate: filterMode === "custom" && endDate ? endDate : undefined,
            dateRangeLabel,
          }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        const msg =
          data.message ||
          `Statement PDF successfully sent to ${currentRecipients.length} recipient(s)!`;
        setStatusMessage({ type: "success", text: msg });
        if (onDispatched) onDispatched(msg);

        // Auto close after brief celebration
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || data.details || "Failed to dispatch email statement.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Network error while sending report.",
      });
    } finally {
      setSending(false);
    }
  };

  // Find member name label for each email chip
  const getRecipientLabel = (email: string) => {
    if (
      currentUserEmail &&
      email.toLowerCase() === currentUserEmail.toLowerCase()
    ) {
      return "You";
    }
    const matchedMember = session.members.find(
      (m) => m.email && m.email.toLowerCase() === email.toLowerCase()
    );
    if (matchedMember) return matchedMember.name;
    return null;
  };

  const scopedExpenses = useMemo(() => {
    if (filterMode === 'last_month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return session.expenses.filter((e) => {
        const d = e.date ? e.date.split('T')[0] : '';
        return d >= firstDay && d <= lastDay;
      });
    }
    if (filterMode === 'custom' && (startDate || endDate)) {
      return session.expenses.filter((e) => {
        const d = e.date ? e.date.split('T')[0] : '';
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    }
    return session.expenses;
  }, [session.expenses, filterMode, startDate, endDate]);

  const scopedSpend = scopedExpenses.reduce((s, e) => s + e.amount, 0);

  // Unselected member emails that can be quick-added
  const availableMemberShortcuts = session.members.filter(
    (m) => m.email && isValidEmail(m.email) && !recipients.includes(m.email.toLowerCase())
  );

  const currentUserAvailableShortcut =
    currentUserEmail &&
    isValidEmail(currentUserEmail) &&
    !recipients.includes(currentUserEmail.toLowerCase());

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-[480px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={sending}
              className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center flex-shrink-0">
                <Mail size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Email PDF Statement
                </h3>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {session.name} ({session.sessionId})
                </p>
              </div>
            </div>

            {/* Date Scope Filter Tabs */}
            <div className="space-y-2 mb-3">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Select Report Scope
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterMode('whole')}
                  className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                    filterMode === 'whole'
                      ? 'bg-[#6366F1] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Whole History
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('last_month')}
                  className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                    filterMode === 'last_month'
                      ? 'bg-[#6366F1] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('custom')}
                  className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                    filterMode === 'custom'
                      ? 'bg-[#6366F1] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Custom Range
                </button>
              </div>

              {/* Custom Date Pickers */}
              {filterMode === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Statement Summary Card */}
            <div className="p-3.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Scope Spend:</span>
                <span className="font-extrabold text-[#10B981]">
                  {formatSplitCurrency(scopedSpend, session.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Scoped Expenses:</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {scopedExpenses.length} of {session.expenses.length} included
                </span>
              </div>
              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6366F1]">
                  <FileText size={13} />
                  <span>CapFlow_Split_{session.sessionId}.pdf</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6366F1]/10 text-[#6366F1]">
                  {filterMode === 'whole' ? 'All-Time' : filterMode === 'last_month' ? 'Last Month' : 'Custom'}
                </span>
              </div>
            </div>

            {/* Status Feedback Banner */}
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-2xl mb-4 flex items-start gap-2.5 text-xs font-semibold ${
                  statusMessage.type === "success"
                    ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                    : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <Check size={16} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 leading-snug">{statusMessage.text}</div>
              </motion.div>
            )}

            {/* Recipients Section */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Recipients ({recipients.length})
                </label>
                {recipients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRecipients([])}
                    className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[#EF4444]"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Recipient Chips List */}
              {recipients.length === 0 ? (
                <div className="p-3 bg-[var(--bg-primary)] border border-dashed border-[var(--border-color)] rounded-xl text-center text-xs text-[var(--text-secondary)]">
                  No recipient emails added yet. Enter email(s) below to dispatch report.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl max-h-36 overflow-y-auto">
                  {recipients.map((email) => {
                    const label = getRecipientLabel(email);
                    return (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-medium shadow-sm"
                      >
                        <Mail size={12} className="text-[#6366F1]" />
                        <span className="truncate max-w-[180px]">{email}</span>
                        {label && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#6366F1]/15 text-[#6366F1]">
                            {label}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          className="p-0.5 rounded-full hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-[#EF4444] transition-colors"
                          title="Remove recipient"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Quick Add Pills */}
              {(currentUserAvailableShortcut || availableMemberShortcuts.length > 0) && (
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] mr-1">
                    Quick Add:
                  </span>
                  {currentUserAvailableShortcut && (
                    <button
                      type="button"
                      onClick={() => handleAddEmail(currentUserEmail)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[#6366F1]/10 text-[#6366F1] hover:bg-[#6366F1]/20 transition-colors"
                    >
                      <Plus size={10} />
                      <span>My Email ({currentUserEmail})</span>
                    </button>
                  )}
                  {availableMemberShortcuts.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleAddEmail(m.email)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <Plus size={10} />
                      <span>{m.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Add Custom Email Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Email Address"
                  className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                />
                <button
                  type="button"
                  onClick={() => handleAddEmail()}
                  disabled={!emailInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add</span>
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">
                You can paste multiple emails separated by commas or spaces.
              </p>
            </div>

            {/* Optional Personal Note */}
            <div className="space-y-1.5 mb-5">
              <label className="text-xs font-bold text-[var(--text-secondary)]">
                Personal Note / Message <span className="font-normal">(Optional)</span>
              </label>
              <textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Message / Note"
                rows={2}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[#6366F1] resize-none"
              />
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--border-color)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendStatement}
                disabled={sending || (recipients.length === 0 && !emailInput.trim())}
                className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] text-slate-900 text-xs font-extrabold hover:bg-[#D97706] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-[#F59E0B]/20"
              >
                {sending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Send PDF Statement</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
