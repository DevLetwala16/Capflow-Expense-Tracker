"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  UserPlus,
  Mail,
  Users2,
  Check,
  ChevronRight,
  TrendingUp,
  Receipt,
  HandCoins,
  Shield,
  Trash2,
} from "lucide-react";
import { useSplitterStore } from "@/lib/store/splitterStore";
import { useAuthStore } from "@/lib/store/authStore";
import {
  calculateMemberNetPositions,
  formatSplitCurrency,
} from "@/lib/splitter/debtEngine";
import { AddMemberModal } from "@/components/splitter/AddMemberModal";
import { LiveToasts } from "@/components/splitter/LiveToasts";
import { ModuleLoader } from "@/components/shared/ModuleLoader";
import { SplitMember } from "@/types/splitter";

export default function SplitterMembersPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { user } = useAuthStore();
  const {
    activeSession,
    loading,
    liveToasts,
    loadSessionById,
    updateSession,
    dismissToast,
  } = useSplitterStore();

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  useEffect(() => {
    if (sessionId && (!activeSession || activeSession.sessionId !== sessionId)) {
      loadSessionById(sessionId);
    }
  }, [sessionId, activeSession, loadSessionById]);

  const memberPositions = useMemo(() => {
    if (!activeSession) return [];
    return calculateMemberNetPositions(activeSession);
  }, [activeSession]);

  const currentMember = useMemo(() => {
    if (!activeSession) return undefined;
    if (user?.id) {
      const match = activeSession.members.find((m) => m.userId === user.id);
      if (match) return match;
    }
    return activeSession.members[0];
  }, [activeSession, user]);

  if (loading && !activeSession) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)] p-6">
        <ModuleLoader
          title="Loading Member Directory..."
          description="Fetching participants and computing net standings..."
          variant="module"
        />
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)] p-8 text-center space-y-4">
        <p className="text-sm font-semibold text-[var(--text-secondary)]">
          Session not found or connection lost.
        </p>
        <Link
          href={`/budgets/splitter/${sessionId}`}
          className="inline-block px-4 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-bold"
        >
          Back to Session
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--bg-primary)] pb-16 overflow-x-hidden w-full max-w-full">
      {/* Real-time Floating Live Toasts */}
      <LiveToasts toasts={liveToasts} onDismiss={dismissToast} />

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/budgets/splitter/${encodeURIComponent(sessionId)}`}
            className="p-2 -ml-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Back to Session"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[var(--text-primary)] truncate">
                Members Directory
              </h1>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#6366F1]/15 text-[#6366F1] flex-shrink-0">
                {activeSession.members.length} {activeSession.members.length === 1 ? "Member" : "Members"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {activeSession.name} ({activeSession.sessionId})
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddMemberModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] shadow-sm shadow-[#6366F1]/20 transition-all flex-shrink-0"
        >
          <UserPlus size={14} />
          <span>+ Add Member</span>
        </button>
      </header>

      {/* Main Container */}
      <div className="px-4 pt-4 w-full max-w-4xl mx-auto space-y-4 overflow-x-hidden">
        {/* Mode & Summary Banner */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center flex-shrink-0">
              <Users2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {activeSession.template === "family" ? "Household / Family Mode" : "Group Expense Mode"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {activeSession.template === "family"
                  ? "Head / Parent covers dependent member dues"
                  : "All independent participants settle their own balances"}
              </p>
            </div>
          </div>

          <Link
            href={`/budgets/splitter/${encodeURIComponent(sessionId)}`}
            className="hidden sm:flex items-center gap-1 text-xs font-bold text-[#6366F1] hover:underline"
          >
            <span>Return to Ledger</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Member Cards Grid: 1 col on mobile, 2 on tablet, 3 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {memberPositions.map((pos) => {
            const isGetsBack = pos.netBalance > 0.009;
            const isOwes = pos.netBalance < -0.009;
            const isSettled = !isGetsBack && !isOwes;
            const memberObj = activeSession.members.find((m) => m.id === pos.memberId);
            const isCurrentUser = user?.id && memberObj?.userId === user.id;

            return (
              <motion.div
                key={pos.memberId}
                layout
                className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex flex-col justify-between shadow-sm hover:border-[#6366F1]/30 transition-all space-y-3"
              >
                {/* Top: Avatar, Name, Handle & Badges */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-base font-bold flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: pos.color }}
                  >
                    {pos.memberName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {pos.memberName}
                      </h4>
                      {isCurrentUser && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-[#6366F1]/15 text-[#6366F1]">
                          You
                        </span>
                      )}
                      {pos.isDependent && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-[#EC4899]/15 text-[#EC4899]">
                          Dependent
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {pos.handle}
                    </p>
                  </div>
                </div>

                {/* Contact Info (Email / Phone) */}
                {(memberObj?.email || memberObj?.phone) && (
                  <div className="text-[11px] text-[var(--text-secondary)] space-y-0.5 pt-1 border-t border-[var(--border-color)]/60">
                    {memberObj.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail size={11} className="text-[#6366F1] flex-shrink-0" />
                        <span className="truncate">{memberObj.email}</span>
                      </div>
                    )}
                    {memberObj.phone && (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[#10B981] font-mono text-[10px]">📞</span>
                        <span className="truncate">{memberObj.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Financial Metrics */}
                <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[var(--text-secondary)] text-[11px]">
                    <span>Consumed (Share):</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {formatSplitCurrency(pos.individualSpend, activeSession.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[var(--text-secondary)] text-[11px]">
                    <span>Paid for Group:</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {formatSplitCurrency(pos.totalPaid, activeSession.currency)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between font-bold">
                    <span className="text-[11px] text-[var(--text-secondary)]">Net Standing:</span>
                    {pos.isDependent ? (
                      <span className="text-[10px] text-[#EC4899] font-bold truncate">
                        Covered by {pos.primaryPayerName || "Parent"}
                      </span>
                    ) : (
                      <span
                        className={`text-xs ${
                          isGetsBack
                            ? "text-[#10B981]"
                            : isOwes
                            ? "text-[#EF4444]"
                            : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {isGetsBack
                          ? `Gets back +${formatSplitCurrency(pos.netBalance, activeSession.currency)}`
                          : isOwes
                          ? `Owes -${formatSplitCurrency(Math.abs(pos.netBalance), activeSession.currency)}`
                          : "Settled up ✓"}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* + Add Member Card */}
          <button
            onClick={() => setShowAddMemberModal(true)}
            className="p-5 bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-color)] hover:border-[#6366F1] rounded-2xl flex flex-col items-center justify-center gap-2 text-center text-xs font-bold text-[var(--text-secondary)] hover:text-[#6366F1] transition-all min-h-[160px] group shadow-sm"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#6366F1]/10 text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white flex items-center justify-center transition-colors">
              <UserPlus size={18} />
            </div>
            <span>+ Add Another Participant</span>
            <span className="text-[10px] font-normal text-[var(--text-secondary)]">
              Friends, roommates, or household members
            </span>
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        open={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        existingMembers={activeSession.members}
        onAddMember={async (newMember) => {
          const updatedMembers = [...activeSession.members, newMember];
          await updateSession(
            activeSession.sessionId,
            { members: updatedMembers },
            currentMember?.name || user?.name || "Member"
          );
        }}
      />
    </div>
  );
}
