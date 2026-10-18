"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  QrCode,
  Users2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  Sparkles,
  WifiOff,
  Edit2,
  Trash2,
} from "lucide-react";
import { useSplitterStore } from "@/lib/store/splitterStore";
import { useAuthStore } from "@/lib/store/authStore";
import { CreateSessionModal } from "@/components/splitter/CreateSessionModal";
import { JoinSessionModal } from "@/components/splitter/JoinSessionModal";
import { EditSessionModal } from "@/components/splitter/EditSessionModal";
import { DeleteSessionModal } from "@/components/splitter/DeleteSessionModal";
import { formatSplitCurrency } from "@/lib/splitter/debtEngine";
import { ModuleLoader } from "@/components/shared/ModuleLoader";
import { SplitSession } from "@/types/splitter";

export default function SplitterSessionsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinParam = searchParams.get("join");

  const { user } = useAuthStore();
  const {
    sessions,
    loading,
    isOffline,
    loadSessions,
    createSession,
    joinSession,
    updateSession,
    deleteSession,
  } = useSplitterStore();

  const [activeTab, setActiveTab] = useState<"all" | "active" | "settled">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(!!joinParam);
  const [editingSession, setEditingSession] = useState<SplitSession | null>(null);
  const [deletingSession, setDeletingSession] = useState<SplitSession | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadSessions(user.id);
    } else {
      loadSessions("guest_user");
    }
  }, [user, loadSessions]);

  useEffect(() => {
    if (joinParam) {
      setShowJoinModal(true);
    }
  }, [joinParam]);

  const filteredSessions = sessions.filter((s) => {
    if (activeTab === "active") return s.status === "active";
    if (activeTab === "settled") return s.status === "settled";
    return true;
  });

  return (
    <div className="min-h-full bg-[var(--bg-primary)] pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)] px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/budgets"
            className="p-1.5 -ml-1 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors shrink-0"
            aria-label="Back to Budgets"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-tight flex items-center gap-1.5 truncate">
              Splitter Sessions
              {isOffline && (
                <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] shrink-0">
                  <WifiOff size={9} />
                  Offline
                </span>
              )}
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)] leading-tight hidden xs:block truncate">
              Trips, shared flats & group expenses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold hover:border-[#6366F1] transition-all whitespace-nowrap active:scale-95"
            title="Scan QR Code or enter Session ID to join"
          >
            <QrCode size={13} className="text-[#6366F1] shrink-0" />
            <span><span className="hidden sm:inline">Scan / </span>Join</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] transition-all shadow-sm shadow-[#6366F1]/30 whitespace-nowrap active:scale-95"
          >
            <Plus size={13} className="shrink-0" />
            <span><span className="hidden sm:inline">Create </span>Session</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="px-4 pt-4 max-w-4xl mx-auto space-y-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 bg-[var(--bg-card)] p-1 rounded-2xl border border-[var(--border-color)] max-w-md">
          {(["all", "active", "settled"] as const).map((tab) => {
            const count =
              tab === "all"
                ? sessions.length
                : tab === "active"
                ? sessions.filter((s) => s.status === "active").length
                : sessions.filter((s) => s.status === "settled").length;
            const isSelected = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? "bg-[#6366F1] text-white shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="capitalize">{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sessions List */}
        {loading && sessions.length === 0 ? (
          <ModuleLoader
            title="Loading Splitter Hub..."
            description="Syncing group sessions and collaborative ledgers..."
            variant="module"
          />
        ) : filteredSessions.length === 0 ? (
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] p-10 text-center space-y-4 my-6">
            <div className="w-16 h-16 rounded-3xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center mx-auto shadow-inner">
              <Users2 size={32} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {activeTab === "all"
                  ? "No Splitter Sessions Yet"
                  : `No ${activeTab} sessions found`}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1">
                Start tracking a multi-day trip with friends, household flat expenses, or a family vacation.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] hover:border-[#6366F1]"
              >
                <QrCode size={14} className="text-[#6366F1]" />
                <span>Scan QR / Join</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-2xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] shadow-md shadow-[#6366F1]/20"
              >
                + Create New Session
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSessions.map((session) => {
              const totalSpend = session.expenses.reduce(
                (sum, e) => sum + e.amount,
                0
              );
              const isActive = session.status === "active";

              return (
                <motion.div
                  key={session.sessionId}
                  layout
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/budgets/splitter/${session.sessionId}`)}
                  className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] p-5 hover:border-[#6366F1]/50 cursor-pointer transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Title & Badges */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                            {session.name}
                          </h3>
                        </div>
                        <p className="text-[11px] font-mono text-[#6366F1] font-semibold tracking-wider mt-0.5">
                          {session.sessionId}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isActive
                              ? "bg-[#6366F1]/10 text-[#6366F1]"
                              : "bg-[#10B981]/15 text-[#10B981]"
                          }`}
                        >
                          {session.status}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-primary)] text-[var(--text-secondary)] uppercase">
                          {session.template}
                        </span>
                      </div>
                    </div>

                    {session.description && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mb-3">
                        {session.description}
                      </p>
                    )}

                    {/* Spend & Dates */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] my-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                          Total Group Spend
                        </span>
                        <p className="text-sm font-extrabold text-[var(--text-primary)] mt-0.5">
                          {formatSplitCurrency(totalSpend, session.currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] flex items-center justify-end gap-1">
                          <Calendar size={10} />
                          Dates
                        </span>
                        <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-0.5">
                          {session.startDate} to {session.endDate}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer: Member avatars & CTA */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                      {session.members.slice(0, 5).map((m) => (
                        <div
                          key={m.id}
                          className="w-7 h-7 rounded-full border-2 border-[var(--bg-card)] flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: m.color }}
                          title={m.name}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {session.members.length > 5 && (
                        <div className="w-7 h-7 rounded-full border-2 border-[var(--bg-card)] bg-[var(--bg-primary)] text-[var(--text-secondary)] flex items-center justify-center text-[9px] font-bold">
                          +{session.members.length - 5}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSession(session);
                        }}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[#6366F1] hover:bg-[var(--bg-primary)] transition-all"
                        title="Edit Session Details"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingSession(session);
                        }}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[#EF4444] hover:bg-[var(--bg-primary)] transition-all"
                        title="Delete Session"
                      >
                        <Trash2 size={13} />
                      </button>
                      <div className="flex items-center gap-1 text-xs font-bold text-[#6366F1] pl-1">
                        <span>Open</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateSessionModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        currentUser={user ? { id: user.id, name: user.name, email: user.email } : null}
        onCreate={async (data) => {
          const created = await createSession(
            data,
            user?.id || "guest_user",
            user?.name || "Organizer"
          );
          router.push(`/budgets/splitter/${created.sessionId}`);
        }}
      />

      <JoinSessionModal
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        currentUser={user ? { id: user.id, name: user.name, email: user.email } : null}
        initialSessionId={joinParam || ""}
        onJoin={async (sessionId, member) => {
          const joined = await joinSession(sessionId, member);
          router.push(`/budgets/splitter/${joined.sessionId}`);
        }}
      />

      {editingSession && (
        <EditSessionModal
          open={!!editingSession}
          onClose={() => setEditingSession(null)}
          session={editingSession}
          onSave={async (updates) => {
            await updateSession(
              editingSession.sessionId,
              updates,
              user?.name || "Organizer"
            );
          }}
        />
      )}

      {deletingSession && (
        <DeleteSessionModal
          open={!!deletingSession}
          onClose={() => setDeletingSession(null)}
          session={deletingSession}
          onConfirmDelete={async () => {
            await deleteSession(deletingSession.sessionId);
          }}
        />
      )}
    </div>
  );
}
