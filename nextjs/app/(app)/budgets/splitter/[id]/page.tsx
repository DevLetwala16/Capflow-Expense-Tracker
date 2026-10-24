"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  QrCode,
  Copy,
  Check,
  Plus,
  Share2,
  Download,
  Mail,
  Users2,
  Calendar,
  Receipt,
  HandCoins,
  History,
  FileText,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Lock,
  Unlock,
  Sparkles,
  X,
  UserPlus,
  ArrowLeftRight,
  Zap,
} from "lucide-react";
import { useSplitterStore } from "@/lib/store/splitterStore";
import { useAuthStore } from "@/lib/store/authStore";
import {
  calculateMemberNetPositions,
  simplifyDebts,
  formatSplitCurrency,
  getExpenseMemberStatus,
  getItemizedExpensesForPair,
  getSettlementRoadmapHistory,
  calculateMutualAdjustments,
} from "@/lib/splitter/debtEngine";
import {
  generateSplitterReportPDF,
  downloadSplitterPDF,
  generateWhatsAppSummary,
} from "@/lib/splitter/splitterPdf";
import { QRCodeModal } from "@/components/splitter/QRCodeModal";
import { AddSplitExpenseModal } from "@/components/splitter/AddSplitExpenseModal";
import { RecordSettlementModal } from "@/components/splitter/RecordSettlementModal";
import { PaymentSettlementQRModal } from "@/components/splitter/PaymentSettlementQRModal";
import { AddMemberModal } from "@/components/splitter/AddMemberModal";
import { EditSessionModal } from "@/components/splitter/EditSessionModal";
import { DeleteSessionModal } from "@/components/splitter/DeleteSessionModal";
import { SendEmailReportModal } from "@/components/splitter/SendEmailReportModal";
import { LiveToasts } from "@/components/splitter/LiveToasts";
import { ModuleLoader } from "@/components/shared/ModuleLoader";
import {
  SplitExpenseItem,
  SettlementTransaction,
  SplitMember,
} from "@/types/splitter";

import {
  syncExpenseToCapFlowTransactions,
  syncSettlementToCapFlowTransactions,
  removeSyncedExpenseTransaction,
} from "@/lib/splitter/splitterTransactionSync";

type ActiveTab = "expenses" | "status" | "roadmap" | "export";

export default function SplitterSessionDashboard() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { user } = useAuthStore();
  const {
    activeSession,
    loading,
    liveToasts,
    loadSessionById,
    addOrUpdateExpense,
    deleteExpense,
    recordSettlement,
    toggleSettleExpenseShare,
    deleteSettlement,
    updateSession,
    deleteSession,
    startRealtimeSync,
    stopRealtimeSync,
    dismissToast,
  } = useSplitterStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>("expenses");
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<SplitExpenseItem | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [suggestedSettlement, setSuggestedSettlement] = useState<SettlementTransaction | null>(null);
  const [showQrPaymentModal, setShowQrPaymentModal] = useState(false);
  const [qrPaymentTransaction, setQrPaymentTransaction] = useState<SettlementTransaction | null>(null);

  // Expanded itemized view state for Expenses tab & Roadmap tab
  const [expandedExpenseIds, setExpandedExpenseIds] = useState<Set<string>>(new Set());
  const [expandedRoadmapIndices, setExpandedRoadmapIndices] = useState<Set<number>>(new Set());
  const [historyFilter, setHistoryFilter] = useState<"all" | "marked_paid" | "auto_adjustment">("all");
  const [expandedAdjustmentIds, setExpandedAdjustmentIds] = useState<Set<string>>(new Set());

  const toggleAdjustmentExpansion = (id: string) => {
    setExpandedAdjustmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpenseExpansion = (id: string) => {
    setExpandedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRoadmapExpansion = (idx: number) => {
    setExpandedRoadmapIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSettleExpenseShare = async (expenseId: string, memberId: string) => {
    if (!activeSession) return;
    try {
      await toggleSettleExpenseShare(activeSession.sessionId, expenseId, memberId);
    } catch (e) {
      console.error("Failed to settle expense share:", e);
    }
  };

  // Date filtering state for export & share
  const [exportFilterMode, setExportFilterMode] = useState<"whole" | "last_month" | "custom">("whole");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  const [copiedId, setCopiedId] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Load session & start real-time listener
  useEffect(() => {
    if (sessionId) {
      loadSessionById(sessionId);
      startRealtimeSync(sessionId);
    }
    return () => {
      stopRealtimeSync();
    };
  }, [sessionId, loadSessionById, startRealtimeSync, stopRealtimeSync]);

  const memberPositions = useMemo(() => {
    if (!activeSession) return [];
    return calculateMemberNetPositions(activeSession);
  }, [activeSession]);

  const simplifiedDebts = useMemo(() => {
    return simplifyDebts(memberPositions);
  }, [memberPositions]);

  const appMemberDebts = useMemo(() => {
    if (!activeSession) return [];
    return simplifiedDebts.filter((st) => {
      const fromMember = activeSession.members.find((m) => m.id === st.fromMemberId);
      return Boolean(fromMember?.userId);
    });
  }, [simplifiedDebts, activeSession]);

  const manualMemberDebts = useMemo(() => {
    if (!activeSession) return [];
    return simplifiedDebts.filter((st) => {
      const fromMember = activeSession.members.find((m) => m.id === st.fromMemberId);
      return !fromMember?.userId;
    });
  }, [simplifiedDebts, activeSession]);

  const getSettlementUpToDate = (st: SettlementTransaction): string => {
    if (!activeSession)
      return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    let latestDate: string | null = null;
    for (const exp of activeSession.expenses) {
      const involvesFrom =
        exp.paidBy?.some((p) => p.memberId === st.fromMemberId) ||
        exp.splits?.some((s) => s.memberId === st.fromMemberId);
      const involvesTo =
        exp.paidBy?.some((p) => p.memberId === st.toMemberId) ||
        exp.splits?.some((s) => s.memberId === st.toMemberId);
      if (involvesFrom || involvesTo) {
        if (!latestDate || new Date(exp.date).getTime() > new Date(latestDate).getTime()) {
          latestDate = exp.date;
        }
      }
    }
    const dateObj = latestDate
      ? new Date(latestDate)
      : activeSession.createdAt
      ? new Date(activeSession.createdAt)
      : new Date();
    return dateObj.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const settlementHistoryList = useMemo(() => {
    if (!activeSession) return [];
    const memberNameMap = new Map(activeSession.members.map((m) => [m.id, m.name]));

    const directList = (activeSession.settlements || []).map((st) => ({
      id: st.id,
      settlementId: st.id,
      fromName: memberNameMap.get(st.fromMemberId) || "Member",
      toName: memberNameMap.get(st.toMemberId) || "Member",
      amount: st.amount,
      date: st.date || st.createdAt || new Date().toISOString(),
      notes: st.notes,
      canUndo: true,
    }));

    const autoList = calculateMutualAdjustments(activeSession).map((adj) => ({
      id: adj.id,
      settlementId: "",
      fromName: adj.memberA.name,
      toName: `${adj.memberB.name} (Auto-Adjusted)`,
      amount: adj.adjustedAmount,
      date: adj.latestDate,
      notes: "Mutual shared expenses offset",
      canUndo: false,
    }));

    const all = [...directList, ...autoList];
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeSession]);

  const totalGroupSpend = useMemo(() => {
    if (!activeSession) return 0;
    return activeSession.expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [activeSession]);

  // Find viewer's current member profile in this session
  const currentMember = useMemo(() => {
    if (!activeSession) return undefined;
    if (user?.id) {
      const match = activeSession.members.find((m) => m.userId === user.id);
      if (match) return match;
    }
    return activeSession.members[0];
  }, [activeSession, user]);

  const viewerPosition = useMemo(() => {
    if (!currentMember) return null;
    return memberPositions.find((p) => p.memberId === currentMember.id) || null;
  }, [memberPositions, currentMember]);

  const handleCopyId = async () => {
    if (!activeSession) return;
    try {
      await navigator.clipboard.writeText(activeSession.sessionId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // ignore
    }
  };

  // Date filtering options for export tab
  const exportFilterOptions = useMemo(() => {
    let label = "Whole Transactions (All-Time)";
    if (exportFilterMode === "last_month") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      label = `Last Month (${firstDay} to ${lastDay})`;
    } else if (exportFilterMode === "custom") {
      label = `Custom Range (${exportStartDate || "Start"} to ${exportEndDate || "Now"})`;
    }
    return {
      filterMode: exportFilterMode,
      startDate: exportFilterMode === "custom" && exportStartDate ? exportStartDate : undefined,
      endDate: exportFilterMode === "custom" && exportEndDate ? exportEndDate : undefined,
      dateRangeLabel: label,
    };
  }, [exportFilterMode, exportStartDate, exportEndDate]);

  const exportFilteredExpenses = useMemo(() => {
    if (!activeSession) return [];
    if (exportFilterMode === "last_month") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      return activeSession.expenses.filter((e) => {
        const d = e.date ? e.date.split("T")[0] : "";
        return d >= firstDay && d <= lastDay;
      });
    }
    if (exportFilterMode === "custom" && (exportStartDate || exportEndDate)) {
      return activeSession.expenses.filter((e) => {
        const d = e.date ? e.date.split("T")[0] : "";
        if (exportStartDate && d < exportStartDate) return false;
        if (exportEndDate && d > exportEndDate) return false;
        return true;
      });
    }
    return activeSession.expenses;
  }, [activeSession, exportFilterMode, exportStartDate, exportEndDate]);

  const exportFilteredSpend = useMemo(() => {
    return exportFilteredExpenses.reduce((s, e) => s + e.amount, 0);
  }, [exportFilteredExpenses]);

  const handleDownloadPDF = async () => {
    if (!activeSession) return;
    try {
      const pdfBytes = await generateSplitterReportPDF(activeSession, exportFilterOptions);
      const suffix = exportFilterMode !== "whole" ? `_${exportFilterMode}` : "";
      downloadSplitterPDF(pdfBytes, `CapFlow_${activeSession.sessionId}${suffix}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!activeSession) return;
    try {
      const summary = generateWhatsAppSummary(activeSession, exportFilterOptions);
      const pdfBytes = await generateSplitterReportPDF(activeSession, exportFilterOptions);
      const pdfFile = new File(
        [pdfBytes as any],
        `CapFlow_Split_${activeSession.sessionId}.pdf`,
        { type: "application/pdf" }
      );

      // Web Share API with physical PDF file attachment (Mobile Chrome, Safari iOS, PWA)
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [pdfFile] })
      ) {
        await navigator.share({
          title: `CapFlow Split: ${activeSession.name}`,
          text: summary,
          files: [pdfFile],
        });
        return;
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        // User cancelled share sheet
        return;
      }
      console.warn("Native file sharing unavailable, falling back:", err);
    }

    // Fallback: Download PDF directly and open WhatsApp with summary + live download link
    try {
      const pdfBytes = await generateSplitterReportPDF(activeSession, exportFilterOptions);
      downloadSplitterPDF(pdfBytes, `CapFlow_Split_${activeSession.sessionId}.pdf`);
    } catch (e) {
      // ignore
    }
    const summary = generateWhatsAppSummary(activeSession, exportFilterOptions);
    const encoded = encodeURIComponent(summary);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  const handleConfirmDeleteSession = async () => {
    if (!activeSession) return;
    await deleteSession(activeSession.sessionId);
    router.push("/budgets/splitter");
  };

  const handleSendEmailReport = async () => {
    if (!activeSession) return;
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch(
        `/api/splitter/sessions/${encodeURIComponent(activeSession.sessionId)}/email-report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setEmailStatus(data.message || "Email statement dispatched successfully!");
      } else {
        setEmailStatus(`Error: ${data.error || "Failed to dispatch email report"}`);
      }
    } catch (e: any) {
      setEmailStatus(`Failed: ${e.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const toggleSessionStatus = async () => {
    if (!activeSession) return;
    const newStatus = activeSession.status === "active" ? "settled" : "active";
    await updateSession(
      activeSession.sessionId,
      { status: newStatus },
      currentMember?.name || user?.name || "Member"
    );
  };

  if (loading && !activeSession) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)] p-6">
        <ModuleLoader
          title="Loading Session..."
          description="Calculating real-time net balances and debt simplification..."
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
          href="/budgets/splitter"
          className="inline-block px-4 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-bold"
        >
          Back to Sessions
        </Link>
      </div>
    );
  }

  const isSessionSettled = activeSession.status === "settled";
  const budgetCap = activeSession.budgetCap;
  const budgetProgress =
    budgetCap && budgetCap > 0
      ? Math.min(Math.round((totalGroupSpend / budgetCap) * 100), 100)
      : null;

  return (
    <div className="min-h-full bg-[var(--bg-primary)] pb-16 overflow-x-hidden w-full max-w-full">
      {/* Real-time Floating Live Toasts */}
      <LiveToasts toasts={liveToasts} onDismiss={dismissToast} />

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/budgets/splitter"
            className="p-2 -ml-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
            aria-label="Back to Sessions"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[var(--text-primary)] truncate">
                {activeSession.name}
              </h1>
              <span
                className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                  isSessionSettled
                    ? "bg-[#10B981]/15 text-[#10B981]"
                    : "bg-[#6366F1]/15 text-[#6366F1]"
                }`}
              >
                {activeSession.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono text-[#6366F1] font-semibold">
                {activeSession.sessionId}
              </span>
              <button
                onClick={handleCopyId}
                className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-0.5"
                title="Copy Session ID"
              >
                {copiedId ? <Check size={11} className="text-[#10B981]" /> : <Copy size={11} />}
              </button>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowQRModal(true)}
            className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#6366F1] transition-all"
            title="Show QR Code Invite"
          >
            <QrCode size={16} className="text-[#6366F1]" />
          </button>
          <button
            onClick={() => setShowEditSessionModal(true)}
            className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[#6366F1] hover:border-[#6366F1] transition-all"
            title="Edit Session Details"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setShowDeleteSessionModal(true)}
            className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[#EF4444] hover:border-[#EF4444] transition-all"
            title="Delete Session"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={toggleSessionStatus}
            className={`p-2 rounded-xl border text-xs font-bold transition-all ${
              isSessionSettled
                ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
                : "bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            title={isSessionSettled ? "Reopen Session" : "Mark as Settled"}
          >
            {isSessionSettled ? <Unlock size={16} /> : <Lock size={16} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="px-4 pt-4 w-full max-w-4xl mx-auto space-y-4 overflow-x-hidden">
        {/* ── Dashboard Hero Card ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#6366F1]/10 via-[var(--bg-card)] to-[#10B981]/5 rounded-3xl border border-[var(--border-color)] p-5 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                Total Group Spend
              </span>
              <p className="text-xl font-extrabold text-[var(--text-primary)] mt-0.5">
                {formatSplitCurrency(totalGroupSpend, activeSession.currency)}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                Active Participants
              </span>
              <p className="text-xl font-extrabold text-[#6366F1] mt-0.5 flex items-center gap-1">
                <Users2 size={18} />
                {activeSession.members.length}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                Pending Settlements
              </span>
              <p
                className={`text-xl font-extrabold mt-0.5 ${
                  simplifiedDebts.length === 0 ? "text-[#10B981]" : "text-[#F59E0B]"
                }`}
              >
                {simplifiedDebts.length}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                Your Live Net Position
              </span>
              {viewerPosition ? (
                <p
                  className={`text-base font-extrabold mt-0.5 ${
                    viewerPosition.netBalance > 0.009
                      ? "text-[#10B981]"
                      : viewerPosition.netBalance < -0.009
                      ? "text-[#EF4444]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {viewerPosition.netBalance > 0.009
                    ? `Gets back ${formatSplitCurrency(viewerPosition.netBalance, activeSession.currency)}`
                    : viewerPosition.netBalance < -0.009
                    ? `Owes ${formatSplitCurrency(Math.abs(viewerPosition.netBalance), activeSession.currency)}`
                    : "Settled up ✓"}
                </p>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] mt-1">Not in group</p>
              )}
            </div>
          </div>

          {/* Budget Cap Progress Bar (if configured) */}
          {budgetCap && budgetCap > 0 && (
            <div className="pt-2 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-[var(--text-secondary)]">
                  Trip Budget: {formatSplitCurrency(totalGroupSpend, activeSession.currency)} /{" "}
                  {formatSplitCurrency(budgetCap, activeSession.currency)}
                </span>
                <span
                  className={
                    budgetProgress! >= 90
                      ? "text-[#EF4444] font-bold"
                      : "text-[#6366F1] font-bold"
                  }
                >
                  {budgetProgress}% used
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetProgress! >= 90
                      ? "bg-[#EF4444]"
                      : budgetProgress! >= 70
                      ? "bg-[#F59E0B]"
                      : "bg-[#6366F1]"
                  }`}
                  style={{ width: `${budgetProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Member Summary Widget (Links to Dedicated Members Page) ── */}
        <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between gap-2.5 sm:gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Overlapping member avatars stack */}
            <Link
              href={`/budgets/splitter/${encodeURIComponent(activeSession.sessionId)}/members`}
              className="flex items-center -space-x-2 flex-shrink-0 hover:opacity-85 transition-opacity"
              title="View all members"
            >
              {activeSession.members.slice(0, 3).map((m) => (
                <div
                  key={m.id}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[var(--bg-card)] flex items-center justify-center text-white text-[11px] sm:text-xs font-bold shadow-sm"
                  style={{ backgroundColor: m.color }}
                  title={m.name}
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {activeSession.members.length > 3 && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[var(--bg-card)] bg-[var(--bg-primary)] text-[var(--text-secondary)] flex items-center justify-center text-[10px] font-bold shadow-sm">
                  +{activeSession.members.length - 3}
                </div>
              )}
            </Link>

            <button
              onClick={() => setActiveTab("status")}
              className="min-w-0 group text-left"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[#6366F1] transition-colors whitespace-nowrap">
                  {activeSession.members.length} {activeSession.members.length === 1 ? "Member" : "Members"}
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)] flex-shrink-0">
                  {activeSession.template === "family" ? "Household" : "Group Mode"}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 sm:line-clamp-none">
                View balances, shares & dues
              </p>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#6366F1] text-xs font-semibold transition-all flex items-center gap-1"
              title="Add Member"
            >
              <UserPlus size={14} className="text-[#6366F1]" />
              <span className="hidden sm:inline">Add</span>
            </button>

            <button
              onClick={() => setActiveTab("status")}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                activeTab === "status"
                  ? "bg-[#6366F1] text-white"
                  : "bg-[#6366F1]/10 text-[#6366F1] hover:bg-[#6366F1] hover:text-white"
              }`}
              title="View member payment status"
            >
              <span>Status</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* ── 4-Button Responsive Control Bar ── */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm w-full">
          {[
            {
              id: "expenses",
              label: "Expenses",
              shortLabel: "Expenses",
              icon: Receipt,
              count: activeSession.expenses.length,
            },
            {
              id: "status",
              label: "Member Status",
              shortLabel: "Status",
              icon: Users2,
              count: activeSession.members.length,
            },
            {
              id: "roadmap",
              label: "Settlement Roadmap",
              shortLabel: "Settlements",
              icon: HandCoins,
              count: simplifiedDebts.length,
            },
            {
              id: "export",
              label: "Export & Activity",
              shortLabel: "Export",
              icon: FileText,
              count: activeSession.auditLogs.length,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`relative py-2.5 px-1.5 sm:px-3 rounded-xl font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center w-full min-w-0 ${
                  isSelected
                    ? "bg-[#6366F1] text-white shadow-sm shadow-[#6366F1]/25"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50"
                }`}
              >
                <div className="relative flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="flex-shrink-0" />
                  {/* Floating counter badge on mobile */}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`sm:hidden absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center ${
                        isSelected
                          ? "bg-white text-[#6366F1]"
                          : "bg-[#6366F1] text-white"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </div>

                {/* Mobile short label, Desktop full label */}
                <span className="text-[11px] sm:text-xs truncate font-bold">
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>

                {/* Desktop pill count badge */}
                {tab.count !== undefined && (
                  <span
                    className={`hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab 1: Expenses Feed ── */}
        {activeTab === "expenses" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Itemized Expenses ({activeSession.expenses.length})
              </h3>
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setShowAddExpenseModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] shadow-sm shadow-[#6366F1]/20 transition-all"
              >
                <Plus size={14} />
                <span>Log Expense</span>
              </button>
            </div>

            {activeSession.expenses.length === 0 ? (
              <div className="p-8 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] text-center space-y-3">
                <Receipt size={32} className="text-[var(--text-secondary)] mx-auto opacity-40" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  No expenses recorded yet
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Tap "+ Log Expense" to add food, transport, tickets, or hotel bills.
                </p>
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5]"
                >
                  + Log First Expense
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeSession.expenses.map((exp) => {
                  const memberNameMap = new Map(
                    activeSession.members.map((m) => [m.id, m.name])
                  );
                  const payerSummary = exp.paidBy
                    .map((p) => `${memberNameMap.get(p.memberId) || "Member"}`)
                    .join(", ");

                  const isExpanded = expandedExpenseIds.has(exp.id);

                  return (
                    <motion.div
                      key={exp.id}
                      layout
                      className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] hover:border-[#6366F1]/40 transition-all shadow-sm space-y-3"
                    >
                      {/* Top Clickable Header */}
                      <div
                        onClick={() => toggleExpenseExpansion(exp.id)}
                        className="flex items-start justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Receipt Thumbnail if available */}
                          {exp.receiptImage ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(exp.receiptImage!);
                              }}
                              className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--border-color)] flex-shrink-0 hover:opacity-80 transition-opacity"
                              title="View receipt"
                            >
                              <img
                                src={exp.receiptImage}
                                alt="Receipt"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[#6366F1] flex-shrink-0">
                              <Receipt size={18} />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                                {exp.title}
                              </h4>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-primary)] text-[var(--text-secondary)] flex-shrink-0">
                                {exp.category}
                              </span>
                            </div>

                            {/* Payer & Creator Attribution */}
                            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--text-secondary)] mt-1">
                              <span>
                                Paid by{" "}
                                <strong className="text-[var(--text-primary)]">
                                  {payerSummary}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Logged by{" "}
                                <span className="text-[#6366F1] font-semibold">
                                  {exp.createdBy?.name || "Member"}
                                </span>
                              </span>
                            </div>

                            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>
                                {new Date(exp.date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span>·</span>
                              <span>
                                {exp.splits.length} participants ({exp.splitMode} split)
                              </span>
                              <span>·</span>
                              <span className="text-[#6366F1] font-semibold">
                                {isExpanded ? "Hide breakdown" : "Click to view breakdown"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Actions */}
                        <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className="text-sm font-extrabold text-[var(--text-primary)]">
                            {formatSplitCurrency(exp.amount, exp.currency)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingExpense(exp);
                                  setShowAddExpenseModal(true);
                                }}
                                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[#6366F1] hover:bg-[var(--bg-primary)]"
                                title="Edit expense"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteExpense(activeSession.sessionId, exp.id);
                                }}
                                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[#EF4444] hover:bg-[var(--bg-primary)]"
                                title="Delete expense"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <div className="p-1 text-[var(--text-secondary)]">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Card: Complete Info (Title, Category, Date, Time, Payer, All Member Dues) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-3.5 border-t border-[var(--border-color)] space-y-3 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Expense Details Card */}
                            <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]/70 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)]/50 pb-2">
                                <div className="min-w-0">
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider block">
                                    Itemized Expense Details
                                  </span>
                                  <h4 className="text-sm font-extrabold text-[var(--text-primary)] truncate mt-0.5">
                                    {exp.title}
                                  </h4>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)]/60">
                                    {exp.category}
                                  </span>
                                  <span className="text-sm font-extrabold text-[var(--text-primary)] block mt-1">
                                    Total: {formatSplitCurrency(exp.amount, exp.currency)}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                                <div>
                                  <span className="text-[10px] text-[var(--text-secondary)] block">Date & Time</span>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    {new Date(exp.date).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[var(--text-secondary)] block">Payer</span>
                                  <span className="font-semibold text-[var(--text-primary)]">
                                    {payerSummary}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* All Member Dues Breakdown */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary)] px-1">
                                <span>Member Dues Breakdown</span>
                                <span>{exp.splits.length} Members</span>
                              </div>

                              <div className="space-y-1.5">
                                {exp.splits.map((split) => {
                                  const member = activeSession.members.find((m) => m.id === split.memberId);
                                  if (!member) return null;

                                  // Calculate member's upfront paid amount for this expense
                                  const paidUpfront =
                                    exp.paidBy?.reduce(
                                      (sum, p) => (p.memberId === split.memberId ? sum + p.amount : sum),
                                      0
                                    ) || 0;

                                  // Member due calculation
                                  const dueAmount = Math.max(0, split.amount - paidUpfront);

                                  return (
                                    <div
                                      key={split.memberId}
                                      className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]/70 flex items-center justify-between gap-2.5"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm"
                                          style={{ backgroundColor: member.color }}
                                        >
                                          {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                                              {member.name}
                                            </p>
                                            {member.isDependent && (
                                              <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)]/60">
                                                Dependent
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-[var(--text-secondary)]">
                                            Share: {formatSplitCurrency(split.amount, exp.currency)}
                                            {paidUpfront > 0 &&
                                              ` · Paid upfront: ${formatSplitCurrency(paidUpfront, exp.currency)}`}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Member Due Amount */}
                                      <div className="text-right flex-shrink-0">
                                        <span
                                          className={`text-xs font-extrabold block ${
                                            dueAmount > 0 ? "text-[#EF4444]" : "text-[#10B981]"
                                          }`}
                                        >
                                          Due: {formatSplitCurrency(dueAmount, exp.currency)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: All Members Settlement Status (Read-Only) ── */}
        {activeTab === "status" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  All Members Settlement Status
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Overview of all group members showing who has fully cleared their dues or has pending payments.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold self-start sm:self-auto">
                <span className="px-2.5 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  {memberPositions.filter((p) => p.netBalance >= -0.01).length} Settled
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                  {memberPositions.filter((p) => p.netBalance < -0.01).length} Pending
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {memberPositions.map((pos) => {
                const isSettled = pos.netBalance >= -0.01;
                const member = activeSession.members.find((m) => m.id === pos.memberId);

                return (
                  <div
                    key={pos.memberId}
                    className="p-3.5 sm:p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] flex items-center justify-between gap-3 shadow-sm hover:border-[var(--border-color)]/90 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: pos.color || "#6366F1" }}
                      >
                        {pos.memberName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                            {pos.memberName}
                          </p>
                          {pos.isDependent && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                              Dependent (Covered by {pos.primaryPayerName})
                            </span>
                          )}
                          {member?.userId ? (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#6366F1]/10 text-[#6366F1]">
                              CapFlow User
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                              Manual Member
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          {pos.handle}
                        </p>
                      </div>
                    </div>

                    {/* Status & Due (No action button, pure status) */}
                    <div className="text-right flex-shrink-0">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block ${
                          isSettled
                            ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                            : "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                        }`}
                      >
                        {isSettled ? "Settled ✓" : "Pending"}
                      </span>
                      <p className="text-[11px] font-semibold mt-1">
                        {isSettled ? (
                          pos.netBalance > 0.01 ? (
                            <span className="text-[#10B981]">
                              Gets back {formatSplitCurrency(pos.netBalance, activeSession.currency)}
                            </span>
                          ) : (
                            <span className="text-[#10B981]">All dues cleared</span>
                          )
                        ) : (
                          <span className="text-[#EF4444]">
                            Due: {formatSplitCurrency(-pos.netBalance, activeSession.currency)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab 3: Settlement Roadmap (Min-Cash-Flow) ── */}
        {activeTab === "roadmap" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Settlement Roadmap
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Optimized payments to settle all group debts with minimum transactions.
                </p>
              </div>

              <button
                onClick={() => {
                  setSuggestedSettlement(null);
                  setShowSettlementModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10B981] text-white text-xs font-bold hover:bg-[#059669] transition-all shadow-sm shadow-[#10B981]/20 flex-shrink-0"
              >
                <Plus size={14} />
                <span>Record Payment</span>
              </button>
            </div>

            {simplifiedDebts.length === 0 ? (
              <div className="p-8 bg-[var(--bg-card)] rounded-3xl border border-[#10B981]/30 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center justify-center mx-auto">
                  <Check size={24} strokeWidth={3} />
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  All Debts Settled Up!
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  There are no pending payments needed between group members.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 1. CapFlow Registered Members Settlements */}
                {appMemberDebts.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          CapFlow Members Settlements
                        </h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#6366F1]/10 text-[#6366F1]">
                          {appMemberDebts.length}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)] hidden sm:inline">
                        Only the designated payer can mark their payment as settled
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {appMemberDebts.map((st) => {
                        const fromMember = activeSession.members.find((m) => m.id === st.fromMemberId);
                        const isPayerUser = user?.id && fromMember?.userId === user.id;
                        const upToDate = getSettlementUpToDate(st);

                        return (
                          <div
                            key={`${st.fromMemberId}-${st.toMemberId}`}
                            className="p-3.5 sm:p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm hover:border-[#10B981]/40 transition-all space-y-2.5"
                          >
                            <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
                              <div className="flex items-start sm:items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                                  <HandCoins size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap text-sm leading-snug">
                                    <span className="font-bold text-[#EF4444] break-words">
                                      {st.fromMemberName}
                                    </span>
                                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] px-1.5 py-0.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)]/60">
                                      pays
                                    </span>
                                    <span className="font-bold text-[#10B981] break-words">
                                      {st.toMemberName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mt-1 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Calendar size={11} />
                                      <span>
                                        For expenses up to:{" "}
                                        <strong className="text-[var(--text-primary)]">{upToDate}</strong>
                                      </span>
                                    </span>
                                    <span>·</span>
                                    {isPayerUser ? (
                                      <span className="text-[#10B981] font-bold">You are the payer</span>
                                    ) : (
                                      <span>Awaiting payment from {st.fromMemberName}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[var(--border-color)]/60 flex-shrink-0">
                                <div className="flex flex-col sm:items-end">
                                  <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] tracking-wider sm:hidden">
                                    Amount
                                  </span>
                                  <span className="text-base font-extrabold text-[var(--text-primary)]">
                                    {formatSplitCurrency(st.amount, activeSession.currency)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                                  <button
                                    onClick={() => {
                                      setQrPaymentTransaction(st);
                                      setShowQrPaymentModal(true);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-[#6366F1]/10 hover:bg-[#6366F1]/20 border border-[#6366F1]/30 text-[#6366F1] text-xs font-bold active:scale-95 transition-all flex items-center gap-1 flex-shrink-0"
                                    title="View Receiver QR code and launch payment apps"
                                  >
                                    <QrCode size={13} strokeWidth={2.5} />
                                    <span>QR Pay</span>
                                  </button>

                                  {isPayerUser ? (
                                    <button
                                      onClick={() => {
                                        setSuggestedSettlement(st);
                                        setShowSettlementModal(true);
                                      }}
                                      className="px-3.5 py-1.5 rounded-xl bg-[#10B981] text-white text-xs font-bold hover:bg-[#059669] active:scale-95 transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0"
                                      title="Settle your debt"
                                    >
                                      <Check size={13} strokeWidth={2.5} />
                                      <span>Mark as Settled</span>
                                    </button>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] text-[10px] font-semibold flex-shrink-0">
                                      Payer Action Only
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Manual / Guest Members Settlements */}
                {manualMemberDebts.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          Manual Members Settlements (No App Account)
                        </h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                          {manualMemberDebts.length}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6366F1] font-semibold">
                        Any group member can mark manual member payments as settled
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {manualMemberDebts.map((st) => {
                        const upToDate = getSettlementUpToDate(st);

                        return (
                          <div
                            key={`${st.fromMemberId}-${st.toMemberId}`}
                            className="p-3.5 sm:p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm hover:border-[#10B981]/40 transition-all space-y-2.5"
                          >
                            <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
                              <div className="flex items-start sm:items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                                  <HandCoins size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap text-sm leading-snug">
                                    <span className="font-bold text-[#EF4444] break-words">
                                      {st.fromMemberName}
                                    </span>
                                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] px-1.5 py-0.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)]/60">
                                      pays
                                    </span>
                                    <span className="font-bold text-[#10B981] break-words">
                                      {st.toMemberName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mt-1 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Calendar size={11} />
                                      <span>
                                        For expenses up to:{" "}
                                        <strong className="text-[var(--text-primary)]">{upToDate}</strong>
                                      </span>
                                    </span>
                                    <span>·</span>
                                    <span className="text-[#6366F1] font-semibold">
                                      Manual Member
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[var(--border-color)]/60 flex-shrink-0">
                                <div className="flex flex-col sm:items-end">
                                  <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] tracking-wider sm:hidden">
                                    Amount
                                  </span>
                                  <span className="text-base font-extrabold text-[var(--text-primary)]">
                                    {formatSplitCurrency(st.amount, activeSession.currency)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                                  <button
                                    onClick={() => {
                                      setQrPaymentTransaction(st);
                                      setShowQrPaymentModal(true);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-[#6366F1]/10 hover:bg-[#6366F1]/20 border border-[#6366F1]/30 text-[#6366F1] text-xs font-bold active:scale-95 transition-all flex items-center gap-1 flex-shrink-0"
                                    title="View Receiver QR code and launch payment apps"
                                  >
                                    <QrCode size={13} strokeWidth={2.5} />
                                    <span>QR Pay</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setSuggestedSettlement(st);
                                      setShowSettlementModal(true);
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-[#10B981] text-white text-xs font-bold hover:bg-[#059669] active:scale-95 transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0"
                                    title="Mark manual member payment as settled"
                                  >
                                    <Check size={13} strokeWidth={2.5} />
                                    <span>Mark as Settled</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 4. Simple History of Settlement ── */}
            <div className="pt-6 border-t border-[var(--border-color)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Settlement History ({settlementHistoryList.length})
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Records of who paid whom on which date with exact amounts.
                  </p>
                </div>
              </div>

              {settlementHistoryList.length === 0 ? (
                <div className="p-5 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] text-center text-xs text-[var(--text-secondary)]">
                  No settlement history recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {settlementHistoryList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 sm:p-3.5 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] flex items-center justify-between text-xs gap-3 shadow-sm hover:border-[var(--border-color)]/90 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[var(--text-primary)] break-words text-xs sm:text-sm">
                          <span className="text-[#EF4444]">{item.fromName}</span>
                          <span className="text-[var(--text-secondary)] font-normal mx-1.5">paid</span>
                          <span className="text-[#10B981]">{item.toName}</span>
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          {new Date(item.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {item.notes ? ` · ${item.notes}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className="text-sm font-extrabold text-[#10B981]">
                          {formatSplitCurrency(item.amount, activeSession.currency)} ✓
                        </span>
                        {item.canUndo && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm("Are you sure you want to undo this settlement payment?")) {
                                await deleteSettlement(activeSession.sessionId, item.settlementId);
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[#EF4444] text-[10px] font-bold transition-colors"
                            title="Undo payment"
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 3: Export & Activity Suite ── */}
        {activeTab === "export" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Professional PDF Reporting & Instant Share
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Download verified statement ledgers or dispatch directly to members via WhatsApp and Email
              </p>
            </div>

            {/* Date Range Scope Selector */}
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Audit Statement Scope
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Filter records for PDF export, WhatsApp statement, and email dispatch
                  </p>
                </div>
                <span className="text-xs font-bold text-[#10B981] px-2.5 py-1 rounded-full bg-[#10B981]/10 self-start sm:self-auto">
                  {exportFilteredExpenses.length} of {activeSession.expenses.length} records · {formatSplitCurrency(exportFilteredSpend, activeSession.currency)}
                </span>
              </div>

              {/* Scope Pills */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setExportFilterMode("whole")}
                  className={`py-2 px-3 rounded-lg transition-all text-center ${
                    exportFilterMode === "whole"
                      ? "bg-[#6366F1] text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Whole History
                </button>
                <button
                  type="button"
                  onClick={() => setExportFilterMode("last_month")}
                  className={`py-2 px-3 rounded-lg transition-all text-center ${
                    exportFilterMode === "last_month"
                      ? "bg-[#6366F1] text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => setExportFilterMode("custom")}
                  className={`py-2 px-3 rounded-lg transition-all text-center ${
                    exportFilterMode === "custom"
                      ? "bg-[#6366F1] text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Custom Range
                </button>
              </div>

              {/* Custom Date Pickers */}
              {exportFilterMode === "custom" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      From Date (Start)
                    </label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      To Date (End)
                    </label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#6366F1]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* PDF Download Card */}
              <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center mb-3">
                    <Download size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Download PDF Report
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Client-side fintech audit ledger containing full itemized expenses, gain/loss tables, and settlement roadmap.
                  </p>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  className="w-full py-2.5 rounded-xl bg-[#6366F1] text-white text-xs font-bold hover:bg-[#4F46E5] transition-all flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  Download Official PDF
                </button>
              </div>

              {/* WhatsApp Share Card */}
              <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center mb-3">
                    <Share2 size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Share via WhatsApp (with PDF)
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Dispatches verified group summary, attaches official PDF statement via native mobile share, and includes a live download link.
                  </p>
                </div>
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full py-2.5 rounded-xl bg-[#10B981] text-white text-xs font-bold hover:bg-[#059669] transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-[#10B981]/20"
                >
                  <Share2 size={14} />
                  Share to WhatsApp with PDF
                </button>
              </div>

              {/* Email PDF Dispatch Card */}
              <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mb-3">
                    <Mail size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Email Statement to Members
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Automated backend dispatch compiling the report PDF as an attachment to all members with registered emails.
                  </p>
                </div>
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="w-full py-2.5 rounded-xl bg-[#F59E0B] text-slate-900 text-xs font-bold hover:bg-[#D97706] transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-[#F59E0B]/20"
                >
                  <Mail size={14} />
                  Send Email Report
                </button>
              </div>
            </div>

            {emailStatus && (
              <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-xs font-semibold text-[var(--text-primary)]">
                {emailStatus}
              </div>
            )}

            {/* Chronological Activity & Audit Trail */}
            <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Chronological Activity & Audit Trail ({activeSession.auditLogs.length})
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Immutable event log of every expense, settlement, and group update
                  </p>
                </div>
              </div>

              {activeSession.auditLogs.length === 0 ? (
                <div className="p-6 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] text-center text-xs text-[var(--text-secondary)]">
                  No activity recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSession.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] flex items-start gap-2.5 text-xs"
                    >
                      <History size={14} className="text-[#6366F1] flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {log.action}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          {new Date(log.timestamp).toLocaleString()} · Logged by {log.memberName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <QRCodeModal
        open={showQRModal}
        onClose={() => setShowQRModal(false)}
        sessionId={activeSession.sessionId}
        sessionName={activeSession.name}
      />

      <AddSplitExpenseModal
        open={showAddExpenseModal}
        onClose={() => {
          setShowAddExpenseModal(false);
          setEditingExpense(null);
        }}
        members={activeSession.members}
        currency={activeSession.currency}
        sessionId={activeSession.sessionId}
        sessionName={activeSession.name}
        currentMember={currentMember}
        existingExpense={editingExpense}
        onSave={async (expData) => {
          await addOrUpdateExpense(activeSession.sessionId, expData);
        }}
      />

      <RecordSettlementModal
        open={showSettlementModal}
        onClose={() => {
          setShowSettlementModal(false);
          setSuggestedSettlement(null);
        }}
        members={activeSession.members}
        currency={activeSession.currency}
        suggestedTransaction={suggestedSettlement}
        onRecord={async (stlData) => {
          await recordSettlement(activeSession.sessionId, stlData);
        }}
      />

      <PaymentSettlementQRModal
        open={showQrPaymentModal}
        onClose={() => {
          setShowQrPaymentModal(false);
          setQrPaymentTransaction(null);
        }}
        transaction={qrPaymentTransaction}
        members={activeSession.members}
        currency={activeSession.currency}
        onMarkSettled={async (notes) => {
          if (!qrPaymentTransaction) return;
          await recordSettlement(activeSession.sessionId, {
            fromMemberId: qrPaymentTransaction.fromMemberId,
            toMemberId: qrPaymentTransaction.toMemberId,
            amount: qrPaymentTransaction.amount,
            notes: notes || undefined,
            date: new Date().toISOString(),
          });
          setShowQrPaymentModal(false);
          setQrPaymentTransaction(null);
        }}
      />

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

      <SendEmailReportModal
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        session={activeSession}
        currentUserEmail={user?.email}
        currentUserName={user?.name}
        onDispatched={(msg) => setEmailStatus(msg)}
        initialFilterMode={exportFilterMode}
        initialStartDate={exportStartDate}
        initialEndDate={exportEndDate}
      />

      <EditSessionModal
        open={showEditSessionModal}
        onClose={() => setShowEditSessionModal(false)}
        session={activeSession}
        onSave={async (updates) => {
          await updateSession(
            activeSession.sessionId,
            updates,
            currentMember?.name || user?.name || "Organizer"
          );
        }}
      />

      <DeleteSessionModal
        open={showDeleteSessionModal}
        onClose={() => setShowDeleteSessionModal(false)}
        session={activeSession}
        onConfirmDelete={handleConfirmDeleteSession}
      />

      {/* Receipt Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setPreviewImage(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full bg-[var(--bg-card)] rounded-3xl overflow-hidden p-2 z-10"
            >
              <img
                src={previewImage}
                alt="Receipt Full Preview"
                className="w-full max-h-[80vh] object-contain rounded-2xl"
              />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black"
              >
                <X size={18} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
