"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { db } from "@/lib/db";

export default function ExportPage() {
  const router = useRouter();

  const exportJSON = async () => {
    const transactions = await db.transactions.toArray();
    const categories = await db.categories.toArray();
    const budgets = await db.budgets.toArray();
    const goals = await db.goals.toArray();
    const emis = await db.emis.toArray();

    const data = { transactions, categories, budgets, goals, emis, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-color)]">
        <button onClick={() => router.back()}><ArrowLeft size={20} className="text-[var(--text-secondary)]" /></button>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Export & Backup</h1>
      </header>
      <div className="px-4 py-4 space-y-3">
        <button
          onClick={exportJSON}
          className="w-full flex items-center gap-3 p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center">
            <Download size={18} className="text-[#6366F1]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Export as JSON</p>
            <p className="text-xs text-[var(--text-secondary)]">Full backup of all your data</p>
          </div>
        </button>
        <p className="text-xs text-[var(--text-secondary)] text-center">CSV and PDF export coming in Phase 4</p>
      </div>
    </div>
  );
}
