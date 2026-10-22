"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users2, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { SplitSession } from "@/types/splitter";
import { formatSplitCurrency } from "@/lib/splitter/debtEngine";

interface SplitterCardProps {
  sessions: SplitSession[];
  currencySymbol?: string;
  loading?: boolean;
}

export function SplitterCard({ sessions, currencySymbol = "₹", loading = false }: SplitterCardProps) {
  if (loading && sessions.length === 0) {
    return (
      <div className="relative overflow-hidden bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-3.5 sm:p-4 animate-pulse">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--border-color)]/60" />
            <div className="space-y-1.5">
              <div className="w-36 h-4 bg-[var(--border-color)]/60 rounded" />
              <div className="w-24 h-3 bg-[var(--border-color)]/40 rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
          <div className="h-8 bg-[var(--border-color)]/40 rounded" />
          <div className="h-8 bg-[var(--border-color)]/40 rounded" />
          <div className="h-8 bg-[var(--border-color)]/40 rounded" />
        </div>
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.status === "active");
  const settledSessions = sessions.filter((s) => s.status === "settled");

  const totalActiveSpend = activeSessions.reduce(
    (sum, s) => sum + s.expenses.reduce((es, e) => es + e.amount, 0),
    0
  );

  return (
    <motion.div
      layout
      className="relative overflow-hidden bg-gradient-to-br from-[#6366F1]/10 via-[var(--bg-card)] to-[#10B981]/5 rounded-2xl border border-[#6366F1]/20 p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all group"
    >
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-[#6366F1]/10 rounded-full blur-xl pointer-events-none" />

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white shadow-sm shadow-[#6366F1]/30 shrink-0">
            <Users2 size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                Splitter & Group Expenses
              </h3>
              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#6366F1]/15 text-[#6366F1]">
                <Sparkles size={9} />
                Multi-User
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
              Multi-day trips, shared flats & debt simplification
            </p>
          </div>
        </div>

        <Link
          href="/budgets/splitter"
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] group-hover:bg-[#6366F1] group-hover:text-white transition-all shadow-sm"
          aria-label="Open Splitter Hub"
        >
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[var(--bg-primary)]/80 backdrop-blur-sm rounded-xl border border-[var(--border-color)]">
        <div>
          <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)] block">
            Active Trips
          </span>
          <p className="text-sm font-extrabold text-[#6366F1] mt-0.5">
            {activeSessions.length}
          </p>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)] block">
            Group Spend
          </span>
          <p className="text-sm font-extrabold text-[var(--text-primary)] mt-0.5 truncate">
            {formatSplitCurrency(totalActiveSpend, "INR")}
          </p>
        </div>
        <div>
          <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)] block">
            Settled
          </span>
          <p className="text-sm font-extrabold text-[#10B981] mt-0.5 flex items-center gap-1">
            <CheckCircle2 size={12} />
            {settledSessions.length}
          </p>
        </div>
      </div>

      {/* Quick Launch CTA */}
      <div className="flex items-center justify-between mt-2.5 pt-0.5">
        <span className="text-[11px] text-[var(--text-secondary)] truncate max-w-[65%]">
          {activeSessions.length > 0
            ? `${activeSessions[0].name} · ${activeSessions[0].members.length} members`
            : "No active trips right now"}
        </span>
        <Link
          href="/budgets/splitter"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6366F1] hover:underline shrink-0"
        >
          Open Splitter Hub
          <ArrowRight size={12} />
        </Link>
      </div>
    </motion.div>
  );
}
