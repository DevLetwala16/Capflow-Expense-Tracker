"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users2, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { SplitSession } from "@/types/splitter";
import { formatSplitCurrency } from "@/lib/splitter/debtEngine";

interface SplitterCardProps {
  sessions: SplitSession[];
  currencySymbol?: string;
}

export function SplitterCard({ sessions }: SplitterCardProps) {
  const activeSessions = sessions.filter((s) => s.status === "active");
  const settledSessions = sessions.filter((s) => s.status === "settled");

  const totalActiveSpend = activeSessions.reduce(
    (sum, s) => sum + s.expenses.reduce((es, e) => es + e.amount, 0),
    0
  );

  return (
    <motion.div
      layout
      className="relative overflow-hidden bg-gradient-to-br from-[#6366F1]/10 via-[var(--bg-card)] to-[#10B981]/5 rounded-3xl border border-[#6366F1]/20 p-5 shadow-sm hover:shadow-md transition-all group"
    >
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-[#6366F1]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white shadow-md shadow-[#6366F1]/20">
            <Users2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Splitter & Group Expenses
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6366F1]/15 text-[#6366F1]">
                <Sparkles size={10} />
                Multi-User
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Multi-day trips, household splitting & debt simplification
            </p>
          </div>
        </div>

        <Link
          href="/budgets/splitter"
          className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] group-hover:bg-[#6366F1] group-hover:text-white transition-all shadow-sm"
          aria-label="Open Splitter Hub"
        >
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-[var(--bg-primary)]/80 backdrop-blur-sm rounded-2xl border border-[var(--border-color)]">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
            Active Trips
          </span>
          <p className="text-base font-extrabold text-[#6366F1] mt-0.5">
            {activeSessions.length}
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
            Group Spend
          </span>
          <p className="text-base font-extrabold text-[var(--text-primary)] mt-0.5 truncate">
            {formatSplitCurrency(totalActiveSpend, "INR")}
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
            Settled
          </span>
          <p className="text-base font-extrabold text-[#10B981] mt-0.5 flex items-center gap-1">
            <CheckCircle2 size={13} />
            {settledSessions.length}
          </p>
        </div>
      </div>

      {/* Quick Launch CTA */}
      <div className="flex items-center justify-between mt-4 pt-1">
        <span className="text-xs text-[var(--text-secondary)]">
          {activeSessions.length > 0
            ? `${activeSessions[0].name} · ${activeSessions[0].members.length} members`
            : "No active trips right now"}
        </span>
        <Link
          href="/budgets/splitter"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6366F1] hover:underline"
        >
          Open Splitter Hub
          <ArrowRight size={13} />
        </Link>
      </div>
    </motion.div>
  );
}
