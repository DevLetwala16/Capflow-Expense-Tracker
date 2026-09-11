"use client";
import { BarChart2 } from "lucide-react";
export default function AnalyticsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen gap-4 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 flex items-center justify-center">
        <BarChart2 size={28} className="text-[#6366F1]" />
      </div>
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Analytics & Insights</h1>
      <p className="text-sm text-[var(--text-secondary)]">Phase 2 — coming in weeks 4-6</p>
    </div>
  );
}
