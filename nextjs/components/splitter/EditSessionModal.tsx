"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Edit2,
  Calendar,
  DollarSign,
  HeartHandshake,
  Users,
  User,
  Sparkles,
  Lock,
  Unlock,
} from "lucide-react";
import { SplitSession, SplitTemplate } from "@/types/splitter";

const TEMPLATES: {
  id: SplitTemplate;
  name: string;
  badge: string;
  desc: string;
  icon: any;
}[] = [
  {
    id: "group",
    name: "Group / Friends Trip",
    badge: "Most Popular",
    desc: "Everyone pays and settles their own individual shares.",
    icon: Users,
  },
  {
    id: "family",
    name: "Family / Primary Payer",
    badge: "Household Mode",
    desc: "Head/Parent covers dependents (kids/family).",
    icon: HeartHandshake,
  },
  {
    id: "solo",
    name: "Solo Project / Trip",
    badge: "Individual",
    desc: "Track spending on a personal trip or project without group splitting overhead.",
    icon: User,
  },
];

interface EditSessionModalProps {
  open: boolean;
  onClose: () => void;
  session: SplitSession;
  onSave: (updates: Partial<SplitSession>) => Promise<void>;
}

export function EditSessionModal({
  open,
  onClose,
  session,
  onSave,
}: EditSessionModalProps) {
  const [name, setName] = useState(session.name);
  const [description, setDescription] = useState(session.description || "");
  const [template, setTemplate] = useState<SplitTemplate>(session.template);
  const [currency, setCurrency] = useState(session.currency || "INR");
  const [budgetCap, setBudgetCap] = useState(
    session.budgetCap ? String(session.budgetCap) : ""
  );
  const [startDate, setStartDate] = useState(session.startDate || "");
  const [endDate, setEndDate] = useState(session.endDate || "");
  const [status, setStatus] = useState<"active" | "settled">(session.status);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(session.name);
      setDescription(session.description || "");
      setTemplate(session.template);
      setCurrency(session.currency || "INR");
      setBudgetCap(session.budgetCap ? String(session.budgetCap) : "");
      setStartDate(session.startDate || "");
      setEndDate(session.endDate || "");
      setStatus(session.status);
      setError("");
    }
  }, [open, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Session name cannot be empty");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const parsedCap = budgetCap ? parseFloat(budgetCap) : undefined;
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        template,
        currency,
        budgetCap: parsedCap && !isNaN(parsedCap) ? Math.max(0, parsedCap) : undefined,
        startDate: startDate || session.startDate,
        endDate: endDate || session.endDate,
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update session details");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
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
              disabled={submitting}
              className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/15 text-[#6366F1] flex items-center justify-center flex-shrink-0">
                <Edit2 size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Edit Session Details
                </h3>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {session.name} ({session.sessionId})
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 mb-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs font-semibold text-[#EF4444]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Session Name */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Session Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Goa Trip 2026, Flat 402 Rent"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief context or destination details"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1] resize-none"
                />
              </div>

              {/* Template Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Splitting Template
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {TEMPLATES.map((tpl) => {
                    const Icon = tpl.icon;
                    const isSelected = template === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setTemplate(tpl.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? "bg-[#6366F1]/10 border-[#6366F1] shadow-sm"
                            : "bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-[#6366F1]/50"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? "bg-[#6366F1] text-white"
                              : "bg-[var(--bg-card)] text-[var(--text-secondary)]"
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                              {tpl.name}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#6366F1]/15 text-[#6366F1]">
                              {tpl.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                            {tpl.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Currency & Budget Cap */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                  >
                    <option value="INR">INR (₹) Indian Rupee</option>
                    <option value="USD">USD ($) US Dollar</option>
                    <option value="EUR">EUR (€) Euro</option>
                    <option value="GBP">GBP (£) British Pound</option>
                    <option value="AED">AED (د.إ) UAE Dirham</option>
                    <option value="JPY">JPY (¥) Japanese Yen</option>
                    <option value="CAD">CAD ($) Canadian Dollar</option>
                    <option value="AUD">AUD ($) Australian Dollar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Budget Cap (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={budgetCap}
                    onChange={(e) => setBudgetCap(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
              </div>

              {/* Status Switcher */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Session Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus("active")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      status === "active"
                        ? "bg-[#6366F1] text-white border-[#6366F1] shadow-sm"
                        : "bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <Unlock size={14} />
                    <span>Active (Open)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("settled")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      status === "settled"
                        ? "bg-[#10B981] text-white border-[#10B981] shadow-sm"
                        : "bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <Lock size={14} />
                    <span>Settled (Locked)</span>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#6366F1]/20 disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  <span>{submitting ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
