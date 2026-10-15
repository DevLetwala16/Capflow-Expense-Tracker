"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Search, Plus, FileText, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { TransactionRow } from "@/components/transaction/TransactionRow";
import { AddTransactionSheet } from "@/components/transaction/AddTransactionSheet";
import { TransactionDetailSheet } from "@/components/transaction/TransactionDetailSheet";
import { TransactionStatementSheet } from "@/components/transaction/TransactionStatementSheet";
import { ModuleLoader } from "@/components/shared/ModuleLoader";
import { Transaction } from "@/lib/db";

type FilterType = "all" | "expense" | "income";
type PaymentMethod = "cash" | "credit_card" | "bank_transfer" | "upi";

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "credit_card", label: "Card" },
  { key: "bank_transfer", label: "Bank" },
  { key: "upi", label: "UPI" },
];

export default function TransactionsPage() {
  const router = useRouter();
  const { transactions, loading } = useTransactionStore();
  const { defaultCurrency } = useSettingsStore();
  const { categories } = useCategoryStore();

  // Basic filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Advanced filter panel
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPayments, setSelectedPayments] = useState<PaymentMethod[]>([]);

  // Sheets
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showStatementSheet, setShowStatementSheet] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Derived: how many advanced filters are active
  const activeFilterCount =
    selectedCategoryIds.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    selectedPayments.length;

  const handleRowClick = (id: number) => {
    const tx = transactions.find((t) => t.id === id);
    if (tx) setSelectedTxForDetail(tx);
  };

  const clearFilters = () => {
    setSelectedCategoryIds([]);
    setDateFrom("");
    setDateTo("");
    setSelectedPayments([]);
  };

  const toggleCategory = (id: number) =>
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  const togglePayment = (m: PaymentMethod) =>
    setSelectedPayments((prev) =>
      prev.includes(m) ? prev.filter((p) => p !== m) : [...prev, m]
    );

  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Type chip
        if (filterType !== "all" && tx.type !== filterType) return false;

        // Text search
        if (search) {
          const s = search.toLowerCase();
          const cat = categories.find((c) => c.id === tx.categoryId);
          if (
            !tx.title.toLowerCase().includes(s) &&
            !(cat && cat.name.toLowerCase().includes(s))
          )
            return false;
        }

        // Category multi-select
        if (
          selectedCategoryIds.length > 0 &&
          (tx.categoryId === undefined ||
            tx.categoryId === null ||
            !selectedCategoryIds.includes(tx.categoryId))
        )
          return false;

        // Date range
        if (dateFrom) {
          const from = startOfDay(new Date(dateFrom));
          if (isBefore(parseISO(tx.date), from)) return false;
        }
        if (dateTo) {
          const to = startOfDay(new Date(dateTo));
          // include the "to" day — add 1 day worth of milliseconds
          const toEnd = new Date(to.getTime() + 86_399_999);
          if (isAfter(parseISO(tx.date), toEnd)) return false;
        }

        // Payment method
        if (
          selectedPayments.length > 0 &&
          !selectedPayments.includes(tx.paymentMethod as PaymentMethod)
        )
          return false;

        return true;
      })
      .sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [transactions, filterType, search, categories, selectedCategoryIds, dateFrom, dateTo, selectedPayments]);

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
          {/* Advanced filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border ${
              showFilters || activeFilterCount > 0
                ? "bg-[#6366F1] text-white border-[#6366F1]"
                : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[#6366F1]/50"
            }`}
            aria-label="Toggle advanced filters"
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={13} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowStatementSheet(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-xs font-semibold transition-all active:scale-95 shadow-sm"
            title="Export / Email Statement"
          >
            <FileText size={14} />
            <span className="hidden sm:inline">Email Statement</span>
          </button>
        </div>

        {/* Search + type chips */}
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2">
            <Search size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
            <input
              type="search"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
            />
          </div>

          {/* Type chips */}
          <div className="flex gap-2">
            {(["all", "expense", "income"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => { setFilterType(f); setPage(1); }}
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

        {/* ── Advanced Filter Panel ── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              key="filter-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[var(--border-color)] bg-[var(--bg-card)]/60">
                {/* Category multi-select */}
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Category
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => {
                      const active = selectedCategoryIds.includes(cat.id!);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => { toggleCategory(cat.id!); setPage(1); }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border"
                          style={{
                            backgroundColor: active ? cat.color + "30" : "transparent",
                            borderColor: active ? cat.color : "var(--border-color)",
                            color: active ? cat.color : "var(--text-secondary)",
                          }}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date range */}
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Date Range
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">From</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[#6366F1] transition-colors"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-[var(--text-secondary)] mb-1 block">To</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                        min={dateFrom || undefined}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[#6366F1] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Payment Method
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {PAYMENT_METHODS.map(({ key, label }) => {
                      const active = selectedPayments.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => { togglePayment(key); setPage(1); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            active
                              ? "bg-[#6366F1] text-white border-[#6366F1]"
                              : "bg-transparent text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[#6366F1]/50"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Clear all */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-xs text-[#EF4444] font-medium hover:underline"
                  >
                    <X size={12} />
                    Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="px-4 pb-8 space-y-4 md:py-6 max-w-4xl mx-auto">
        {loading ? (
          <ModuleLoader
            title="Loading Transactions..."
            description="Fetching your latest transaction records from offline storage..."
            variant="card"
          />
        ) : grouped.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">No transactions found</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {search || activeFilterCount > 0
                ? "Try adjusting your search or filters"
                : "Add your first transaction with the + button"}
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
                      onEdit={handleRowClick}
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
        onClick={() => {
          setEditingTx(null);
          setShowAddSheet(true);
        }}
        className="fixed bottom-[calc(var(--bottom-nav-h)+12px)] md:bottom-8 right-4 md:right-8 w-14 h-14 rounded-full bg-gradient-to-br from-[#6366F1] to-[#38bdf8] flex items-center justify-center shadow-xl shadow-indigo-500/30 z-50"
        aria-label="Add transaction"
      >
        <Plus size={24} className="text-white" strokeWidth={2.5} />
      </motion.button>

      {/* Transaction Detail Sheet (Read-Only Info View) */}
      <TransactionDetailSheet
        open={!!selectedTxForDetail}
        onClose={() => setSelectedTxForDetail(null)}
        transaction={selectedTxForDetail}
        categories={categories}
        currency={defaultCurrency}
        onEdit={(tx) => {
          setSelectedTxForDetail(null);
          setEditingTx(tx);
          setShowAddSheet(true);
        }}
        onDelete={async (id) => {
          await useTransactionStore.getState().deleteTransaction(id);
          setSelectedTxForDetail(null);
        }}
      />

      {/* Add / Edit Transaction Sheet */}
      <AddTransactionSheet
        open={showAddSheet}
        onClose={() => {
          setShowAddSheet(false);
          setEditingTx(null);
        }}
        categories={categories}
        currency={defaultCurrency}
        editTransaction={
          editingTx && editingTx.id
            ? {
                id: editingTx.id,
                data: {
                  type: editingTx.type,
                  amount: editingTx.amount,
                  categoryId: editingTx.categoryId,
                  title: editingTx.title,
                  date: editingTx.date,
                  paymentMethod: editingTx.paymentMethod,
                  notes: editingTx.notes,
                  currency: editingTx.currency || defaultCurrency,
                  receiptImage: editingTx.receiptImage,
                },
              }
            : null
        }
      />

      {/* Transaction Statement Sheet (Email & PDF) */}
      <TransactionStatementSheet
        open={showStatementSheet}
        onClose={() => setShowStatementSheet(false)}
      />
    </div>
  );
}
