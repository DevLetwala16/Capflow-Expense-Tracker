"use client";

import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Search, SlidersHorizontal, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { db, Category } from "@/lib/db";
import { TransactionRow } from "@/components/transaction/TransactionRow";
import { AddTransactionSheet } from "@/components/transaction/AddTransactionSheet";

type FilterType = "all" | "expense" | "income";

export default function TransactionsPage() {
  const router = useRouter();
  const { transactions, loading } = useTransactionStore();
  const { defaultCurrency, selectedMonth } = useSettingsStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    db.categories.orderBy("order").toArray().then(setCategories);
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType !== "all" && tx.type !== filterType) return false;
      if (search) {
        const s = search.toLowerCase();
        const cat = categories.find((c) => c.id === tx.categoryId);
        return (
          tx.title.toLowerCase().includes(s) ||
          (cat && cat.name.toLowerCase().includes(s))
        );
      }
      return true;
    }).sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [transactions, filterType, search, categories]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof paginated> = {};
    for (const tx of paginated) {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    }
    return Object.entries(groups).sort(([a], [b]) => (b > a ? 1 : -1));
  }, [paginated]);

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} aria-label="Back">
            <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
          </button>
          <h1 className="text-lg font-bold text-[var(--text-primary)] flex-1">Transactions</h1>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2">
            <Search size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
            <input
              type="search"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-2">
            {(["all", "expense", "income"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                  filterType === f
                    ? f === "expense"
                      ? "bg-[#EF4444] text-white"
                      : f === "income"
                      ? "bg-[#10B981] text-white"
                      : "bg-[#6366F1] text-white"
                    : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)]"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
            <span className="ml-auto text-xs text-[var(--text-secondary)] self-center">
              {filtered.length} transactions
            </span>
          </div>
        </div>
      </header>

      <div className="px-4 pb-4 space-y-4">
        {loading ? (
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 skeleton rounded-xl" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">No transactions found</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {search ? "Try a different search term" : "Add your first transaction with the + button"}
            </p>
          </div>
        ) : (
          <>
            {grouped.map(([date, txs]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 pt-3">
                  {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                </p>
                <div className="space-y-2">
                  {txs.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      transaction={tx}
                      categories={categories}
                      currency={defaultCurrency}
                      onEdit={() => {}}
                      onDelete={async (id) => {
                        await useTransactionStore.getState().deleteTransaction(id);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="w-full py-3 text-sm text-[#6366F1] font-medium"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowAddSheet(true)}
        className="fixed bottom-[calc(var(--bottom-nav-h)+12px)] right-4 w-14 h-14 rounded-full bg-gradient-to-br from-[#6366F1] to-[#38bdf8] flex items-center justify-center shadow-xl shadow-indigo-500/30 z-50"
        aria-label="Add transaction"
      >
        <Plus size={24} className="text-white" strokeWidth={2.5} />
      </motion.button>

      <AddTransactionSheet
        open={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        categories={categories}
        currency={defaultCurrency}
      />
    </div>
  );
}
