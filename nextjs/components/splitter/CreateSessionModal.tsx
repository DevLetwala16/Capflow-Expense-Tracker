"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  Users,
  User,
  HeartHandshake,
  DollarSign,
  Calendar,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import { SplitMember, SplitTemplate } from "@/types/splitter";

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
    desc: "Head/Parent covers dependents (kids/family). Tracks consumption per member, routes debt to parent.",
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

const MEMBER_COLORS = [
  "#6366F1",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#0EA5E9",
  "#F97316",
  "#14B8A6",
];

interface CreateSessionModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    email?: string;
    paymentQrCode?: string;
    upiId?: string;
  } | null;
  defaultCurrency?: string;
  onCreate: (data: {
    name: string;
    description?: string;
    template: SplitTemplate;
    startDate: string;
    endDate: string;
    currency: string;
    budgetCap?: number;
    members: SplitMember[];
  }) => Promise<void>;
}

export function CreateSessionModal({
  open,
  onClose,
  currentUser,
  defaultCurrency = "INR",
  onCreate,
}: CreateSessionModalProps) {
  const [template, setTemplate] = useState<SplitTemplate>("group");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [currency, setCurrency] = useState(defaultCurrency);
  const [budgetCap, setBudgetCap] = useState("");

  const [members, setMembers] = useState<SplitMember[]>([
    {
      id: "mem_1",
      name: currentUser?.name || "You",
      handle: `@${(currentUser?.name || "you")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")}`,
      color: "#6366F1",
      isDependent: false,
      familyCount: 1,
      userId: currentUser?.id,
      email: currentUser?.email,
      paymentQrCode: currentUser?.paymentQrCode,
      upiId: currentUser?.upiId,
    },
  ]);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberFamilyCount, setNewMemberFamilyCount] = useState<number>(1);
  const [newMemberIsDependent, setNewMemberIsDependent] = useState(false);
  const [newMemberPrimaryPayerId, setNewMemberPrimaryPayerId] = useState("mem_1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleUpdateMemberFamilyCount = (memberId: string, delta: number) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        const currentCount = m.familyCount ?? 1;
        const newCount = Math.max(1, Math.min(20, currentCount + delta));
        return { ...m, familyCount: newCount };
      })
    );
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const cleanName = newMemberName.trim();
    const cleanHandle = `@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${members.length + 1}`;
    const nextColor = MEMBER_COLORS[members.length % MEMBER_COLORS.length];

    const newMember: SplitMember = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      phone: newMemberPhone.trim() || undefined,
      email: newMemberEmail.trim() || undefined,
      handle: cleanHandle,
      color: nextColor,
      isDependent: newMemberIsDependent,
      familyCount: newMemberFamilyCount > 0 ? newMemberFamilyCount : 1,
      primaryPayerMemberId: newMemberIsDependent ? newMemberPrimaryPayerId : undefined,
    };

    setMembers([...members, newMember]);
    setNewMemberName("");
    setNewMemberPhone("");
    setNewMemberEmail("");
    setNewMemberFamilyCount(1);
    setNewMemberIsDependent(false);
  };

  const handleRemoveMember = (id: string) => {
    if (members.length <= 1) return;
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a session name.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        template,
        startDate,
        endDate,
        currency,
        budgetCap: budgetCap ? parseFloat(budgetCap) : undefined,
        members: template === "solo" ? [members[0]] : members,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create session");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
            className="relative w-full max-w-[520px] max-h-[90vh] flex flex-col bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Create Splitter Session
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Set up a collaborative group or multi-day trip ledger
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-2xl text-xs font-semibold text-[#EF4444]">
                  {error}
                </div>
              )}

              {/* Template Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Session Template & Mode
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {TEMPLATES.map((tmpl) => {
                    const Icon = tmpl.icon;
                    const selected = template === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => {
                          setTemplate(tmpl.id);
                          if (tmpl.id === "family" && members.length === 1) {
                            // Pre-fill family mode hint
                            setNewMemberIsDependent(true);
                          }
                        }}
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                          selected
                            ? "border-[#6366F1] bg-[#6366F1]/5"
                            : "border-[var(--border-color)] hover:border-[var(--text-secondary)]"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            selected
                              ? "bg-[#6366F1] text-white"
                              : "bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-bold text-[var(--text-primary)]">
                              {tmpl.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6366F1]/15 text-[#6366F1]">
                              {tmpl.badge}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] leading-snug">
                            {tmpl.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Basic Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Session / Trip Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Trip Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Trip Details"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  />
                </div>
              </div>

              {/* Date Range & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  />
                </div>
              </div>

              {/* Currency & Budget Cap */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Budget Cap (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={budgetCap}
                    onChange={(e) => setBudgetCap(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  />
                </div>
              </div>

              {/* Member Management (For Group & Family modes) */}
              {template !== "solo" && (
                <div className="pt-2 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Participants Directory ({members.length})
                    </label>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      Color-coded & auto-assigned
                    </span>
                  </div>

                  {/* Existing Members List */}
                  <div className="space-y-2 mb-3">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: m.color }}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                                {m.name}
                              </p>
                              {(m.familyCount ?? 1) > 1 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#6366F1]/15 text-[#6366F1] flex-shrink-0 inline-flex items-center gap-1">
                                  <Users size={10} />
                                  <span>{m.familyCount} Persons</span>
                                </span>
                              )}
                              {m.isDependent && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EC4899]/15 text-[#EC4899] flex-shrink-0">
                                  Dependent
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--text-secondary)]">
                              {m.handle}
                              {m.isDependent && m.primaryPayerMemberId && (
                                <>
                                  {" "}· Dues covered by{" "}
                                  <span className="text-[#6366F1] font-semibold">
                                    {members.find((p) => p.id === m.primaryPayerMemberId)?.name || "Parent"}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Mini Stepper for Member Family Headcount */}
                          <div
                            className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-2 py-0.5"
                            title="Family Headcount"
                          >
                            <span className="text-[10px] font-medium text-[var(--text-secondary)] hidden sm:inline">Family:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateMemberFamilyCount(m.id, -1)}
                              className="text-xs text-[var(--text-secondary)] hover:text-[#6366F1] font-bold px-1"
                            >
                              -
                            </button>
                            <span className="text-[10px] font-bold text-[var(--text-primary)] min-w-[14px] text-center">
                              {m.familyCount ?? 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateMemberFamilyCount(m.id, 1)}
                              className="text-xs text-[var(--text-secondary)] hover:text-[#6366F1] font-bold px-1"
                            >
                              +
                            </button>
                          </div>

                          {members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id)}
                              className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[#EF4444] transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Member Subform */}
                  <div className="p-3 rounded-2xl bg-[var(--bg-primary)]/50 border border-[var(--border-color)] space-y-2.5">
                    <span className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1">
                      <Plus size={12} className="text-[#6366F1]" />
                      Add Participant
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                      />
                      <input
                        type="text"
                        placeholder="Phone Number"
                        value={newMemberPhone}
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                      />
                    </div>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                    />

                    {/* Family Headcount / Size */}
                    <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Users size={12} className="text-[#6366F1]" />
                          <span>Family Headcount</span>
                        </label>
                        <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                          {newMemberFamilyCount === 1 ? (
                            <>
                              <User size={10} />
                              <span>1 Person (Self)</span>
                            </>
                          ) : (
                            <>
                              <Users size={10} />
                              <span>Family of {newMemberFamilyCount} persons</span>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setNewMemberFamilyCount((c) => Math.max(1, c - 1))}
                          className="w-7 h-7 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] hover:border-[#6366F1] flex items-center justify-center transition-all"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={newMemberFamilyCount}
                          onChange={(e) => setNewMemberFamilyCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-10 text-center py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                        />
                        <button
                          type="button"
                          onClick={() => setNewMemberFamilyCount((c) => Math.min(20, c + 1))}
                          className="w-7 h-7 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] hover:border-[#6366F1] flex items-center justify-center transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Dependent Toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={newMemberIsDependent}
                          onChange={(e) => setNewMemberIsDependent(e.target.checked)}
                          className="rounded border-[var(--border-color)] text-[#6366F1] focus:ring-0"
                        />
                        Dependent / Non-paying member (e.g. kid/family)
                      </label>
                    </div>

                    {newMemberIsDependent && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                          <LinkIcon size={11} />
                          Route debt to:
                        </span>
                        <select
                          value={newMemberPrimaryPayerId}
                          onChange={(e) => setNewMemberPrimaryPayerId(e.target.value)}
                          className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] font-semibold"
                        >
                          {members
                            .filter((m) => !m.isDependent)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.handle})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddMember}
                      disabled={!newMemberName.trim()}
                      className="w-full py-2 rounded-xl bg-[#6366F1]/10 text-[#6366F1] hover:bg-[#6366F1] hover:text-white transition-all text-xs font-bold disabled:opacity-40"
                    >
                      + Add to Session Directory
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl bg-[var(--bg-primary)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--border-color)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="flex-1 py-3 rounded-2xl bg-[#6366F1] text-white text-sm font-bold hover:bg-[#4F46E5] transition-colors disabled:opacity-50 shadow-md shadow-[#6366F1]/25"
                >
                  {submitting ? "Creating..." : "Create Split Session"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
