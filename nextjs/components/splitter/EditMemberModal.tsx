"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Phone,
  Mail,
  Palette,
  Sparkles,
  HeartHandshake,
  Users,
} from "lucide-react";
import { SplitMember } from "@/types/splitter";

const MEMBER_COLORS = [
  "#6366F1",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#0EA5E9",
  "#F97316",
  "#14B8A6",
  "#64748B",
];

interface EditMemberModalProps {
  open: boolean;
  onClose: () => void;
  member: SplitMember | null;
  allMembers: SplitMember[];
  isFamilyTemplate: boolean;
  onSave: (updatedMember: SplitMember) => Promise<void>;
}

export function EditMemberModal({
  open,
  onClose,
  member,
  allMembers,
  isFamilyTemplate,
  onSave,
}: EditMemberModalProps) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const [familyCount, setFamilyCount] = useState<number>(1);
  const [isDependent, setIsDependent] = useState(false);
  const [primaryPayerId, setPrimaryPayerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (member && open) {
      setName(member.name);
      setHandle(member.handle.replace(/^@/, ""));
      setPhone(member.phone || "");
      setEmail(member.email || "");
      setColor(member.color || MEMBER_COLORS[0]);
      setFamilyCount(member.familyCount && member.familyCount > 0 ? member.familyCount : 1);
      setIsDependent(!!member.isDependent);
      setPrimaryPayerId(member.primaryPayerMemberId || "");
      setError("");
    }
  }, [member, open]);

  if (!member) return null;

  const otherMembers = allMembers.filter((m) => m.id !== member.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Member name is required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const cleanHandle = handle.trim()
        ? `@${handle.trim().replace(/^@/, "")}`
        : `@${name.toLowerCase().replace(/[^a-z0-9]/g, "") || "member"}`;

      await onSave({
        ...member,
        name: name.trim(),
        handle: cleanHandle,
        phone: phone.trim() || undefined,
        email: email.trim().toLowerCase() || undefined,
        color,
        familyCount: familyCount > 0 ? familyCount : 1,
        isDependent,
        primaryPayerMemberId: isDependent ? (primaryPayerId || otherMembers[0]?.id) : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update member");
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
            className="relative w-full max-w-[420px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
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
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm transition-colors"
                style={{ backgroundColor: color }}
              >
                {name ? name.charAt(0).toUpperCase() : <User size={22} />}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Edit Member Details
                </h3>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {member.name} ({member.handle})
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 mb-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs font-semibold text-[#EF4444]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Full / Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              {/* Handle */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Tag / Handle
                </label>
                <div className="flex items-center rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] overflow-hidden focus-within:border-[#6366F1]">
                  <span className="px-3 text-xs font-bold text-[var(--text-secondary)] select-none">
                    @
                  </span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="rahul"
                    className="w-full py-2.5 pr-3 bg-transparent text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Phone (for WhatsApp / SMS)
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-3 text-[var(--text-secondary)]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Email Address (for Reports)
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-3 text-[var(--text-secondary)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Palette size={13} />
                  <span>Avatar Accent Color</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {MEMBER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-xl transition-transform ${
                        color === c ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-card)]" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Family Headcount / Size */}
              <div className="p-3 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Users size={13} className="text-[#6366F1]" />
                    <span>Family Headcount (Persons)</span>
                  </label>
                  <span className="text-[10px] font-bold text-[#6366F1] px-2 py-0.5 rounded-full bg-[#6366F1]/10 flex items-center gap-1">
                    {familyCount === 1 ? (
                      <>
                        <User size={11} />
                        <span>1 Person (Self)</span>
                      </>
                    ) : (
                      <>
                        <Users size={11} />
                        <span>{familyCount} Persons</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  Total people represented by this family member. Expenses in equal mode are automatically split by this headcount.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setFamilyCount(Math.max(1, familyCount - 1))}
                    className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-sm font-bold text-[var(--text-primary)] hover:border-[#6366F1] flex items-center justify-center transition-all"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={familyCount}
                    onChange={(e) => setFamilyCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  />
                  <button
                    type="button"
                    onClick={() => setFamilyCount(Math.min(20, familyCount + 1))}
                    className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-sm font-bold text-[var(--text-primary)] hover:border-[#6366F1] flex items-center justify-center transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Dependent Member Toggle (Household / Family mode) */}
              {(isFamilyTemplate || isDependent) && (
                <div className="p-3 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HeartHandshake size={16} className="text-[#EC4899]" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Dependent Member
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isDependent}
                      onChange={(e) => setIsDependent(e.target.checked)}
                      className="w-4 h-4 rounded text-[#EC4899] focus:ring-[#EC4899]"
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    Dependent member dues are automatically routed to the designated primary payer.
                  </p>

                  {isDependent && otherMembers.length > 0 && (
                    <div className="pt-2 border-t border-[var(--border-color)]">
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">
                        Primary Payer (Parent / Head)
                      </label>
                      <select
                        value={primaryPayerId}
                        onChange={(e) => setPrimaryPayerId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                      >
                        {otherMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.handle})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Buttons */}
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
                  <span>{submitting ? "Saving..." : "Update Member"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
