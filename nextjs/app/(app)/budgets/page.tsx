"use client";
import { Target } from "lucide-react";
export default function BudgetsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen gap-4 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
        <Target size={28} className="text-[#10B981]" />
      </div>
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Budgets & Goals</h1>
      <p className="text-sm text-[var(--text-secondary)]">Phase 2 — coming in weeks 4-6</p>
    </div>
  );
}
