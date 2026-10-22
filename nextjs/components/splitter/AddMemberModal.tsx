"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Link as LinkIcon, Users, User } from "lucide-react";
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
];

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  existingMembers: SplitMember[];
  onAddMember: (member: SplitMember) => Promise<void>;
}

export function AddMemberModal({
  open,
  onClose,
  existingMembers,
  onAddMember,
}: AddMemberModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [familyCount, setFamilyCount] = useState<number>(1);
  const [isDependent, setIsDependent] = useState(false);
  const [primaryPayerId, setPrimaryPayerId] = useState(
    existingMembers.find((m) => !m.isDependent)?.id || existingMembers[0]?.id || ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const independentMembers = existingMembers.filter((m) => !m.isDependent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a member name");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const cleanName = name.trim();
      const cleanHandle = `@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${
        existingMembers.length + 1
      }`;
      const color = MEMBER_COLORS[existingMembers.length % MEMBER_COLORS.length];

      const newMember: SplitMember = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        handle: cleanHandle,
        color,
        familyCount: familyCount > 0 ? familyCount : 1,
        isDependent,
        primaryPayerMemberId: isDependent ? primaryPayerId : undefined,
      };

      await onAddMember(newMember);
      setName("");
      setPhone("");
      setEmail("");
      setFamilyCount(1);
      setIsDependent(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add member");
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
            className="relative w-full max-w-[380px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl z-10"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center mx-auto mb-3">
              <UserPlus size={24} />
            </div>

            <h3 className="text-base font-bold text-[var(--text-primary)] text-center">
              Add Group Participant
            </h3>
            <p className="text-xs text-[var(--text-secondary)] text-center mt-0.5 mb-5">
              Add an independent or dependent member to this session
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-2xl text-xs font-semibold text-[#EF4444]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Member Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul, Sneha, Aarav"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Email for PDF Statements (Optional)
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                />
              </div>

              {/* Family Headcount / Size */}
              <div className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
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
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Total people this member represents in the family. Expenses split automatically based on this headcount.
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

              {/* Dependent checkbox */}
              <div className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={isDependent}
                    onChange={(e) => setIsDependent(e.target.checked)}
                    className="rounded border-[var(--border-color)] text-[#6366F1] focus:ring-0"
                  />
                  <span>Dependent Member (Kids, Spouse, Non-paying)</span>
                </label>

                {isDependent && (
                  <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-color)]">
                    <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                      <LinkIcon size={11} />
                      Route liability to:
                    </span>
                    <select
                      value={primaryPayerId}
                      onChange={(e) => setPrimaryPayerId(e.target.value)}
                      className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] font-bold outline-none"
                    >
                      {independentMembers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
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
                  {submitting ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
