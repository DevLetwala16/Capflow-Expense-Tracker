"use client";
import { CreditCard } from "lucide-react";
export default function EMIsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen gap-4 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center">
        <CreditCard size={28} className="text-[#EF4444]" />
      </div>
      <h1 className="text-xl font-bold text-[var(--text-primary)]">EMI Management</h1>
      <p className="text-sm text-[var(--text-secondary)]">Phase 3 — coming in weeks 7-8</p>
    </div>
  );
}
