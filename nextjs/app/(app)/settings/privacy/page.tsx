"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Zap,
  HardDrive,
  Plus,
  X,
  Tag,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Database,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsStore, AutoLockTimeout, AutoCategorizeRule } from "@/lib/store/settingsStore";
import { db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StorageDiagnostics {
  usedMB: string;
  quotaGB: string;
  txCount: number;
  catCount: number;
  budgetCount: number;
  goalCount: number;
  emiCount: number;
  lastCleared: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LAST_CLEARED_KEY = "capflow-cache-last-cleared";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatGigabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatLastCleared(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── iOS Toggle ───────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? "bg-[#6366F1]" : "bg-[var(--border-color)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg {
  id: number;
  message: string;
  type: "success" | "error";
}

function Toast({ toast, onDone }: { toast: ToastMsg; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.94 }}
      transition={{ duration: 0.25 }}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium border ${
        toast.type === "success"
          ? "bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981]"
          : "bg-[#EF4444]/10 border-[#EF4444]/25 text-[#EF4444]"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle2 size={16} className="flex-shrink-0" />
      ) : (
        <AlertCircle size={16} className="flex-shrink-0" />
      )}
      {toast.message}
    </motion.div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label, delay = 0 }: { label: string; delay?: number }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
    >
      {label}
    </motion.p>
  );
}

// ─── Auto-lock options ────────────────────────────────────────────────────────

const LOCK_OPTIONS: { value: AutoLockTimeout; label: string }[] = [
  { value: "immediate", label: "Immediate" },
  { value: "1min", label: "1 min" },
  { value: "5min", label: "5 mins" },
  { value: "never", label: "Never" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacySettingsPage() {
  const router = useRouter();

  const {
    balanceMasked,
    setBalanceMasked,
    autoLockTimeout,
    setAutoLockTimeout,
    autoCategorizeRules,
    setAutoCategorizeRules,
  } = useSettingsStore();

  // Rule form state
  const [ruleKeyword, setRuleKeyword] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");
  const [ruleError, setRuleError] = useState("");
  const keywordRef = useRef<HTMLInputElement>(null);

  // Storage diagnostics
  const [diag, setDiag] = useState<StorageDiagnostics | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Load diagnostics on mount ────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoadingDiag(true);
      try {
        const [estimate, txCount, catCount, budgetCount, goalCount, emiCount] = await Promise.all([
          navigator.storage?.estimate?.() ?? Promise.resolve({ usage: 0, quota: 0 }),
          db.transactions.count(),
          db.categories.count(),
          db.budgets.count(),
          db.goals.count(),
          db.emis.count(),
        ]);

        const lastCleared = localStorage.getItem(LAST_CLEARED_KEY);

        setDiag({
          usedMB: formatBytes(estimate.usage ?? 0),
          quotaGB: formatGigabytes(estimate.quota ?? 0),
          txCount,
          catCount,
          budgetCount,
          goalCount,
          emiCount,
          lastCleared,
        });
      } catch {
        setDiag({
          usedMB: "—",
          quotaGB: "—",
          txCount: 0,
          catCount: 0,
          budgetCount: 0,
          goalCount: 0,
          emiCount: 0,
          lastCleared: null,
        });
      } finally {
        setLoadingDiag(false);
      }
    }
    load();
  }, []);

  // ── Add rule ─────────────────────────────────────────────────────────────

  function handleAddRule() {
    const kw = ruleKeyword.trim();
    const cat = ruleCategory.trim();
    if (!kw || !cat) {
      setRuleError("Both keyword and category are required.");
      return;
    }
    setRuleError("");
    const next: AutoCategorizeRule[] = [
      ...autoCategorizeRules,
      { keyword: kw, category: cat },
    ];
    setAutoCategorizeRules(next);
    setRuleKeyword("");
    setRuleCategory("");
    showToast(`Rule added: "${kw}" → ${cat}`);
    keywordRef.current?.focus();
  }

  function handleDeleteRule(index: number) {
    const next = autoCategorizeRules.filter((_, i) => i !== index);
    setAutoCategorizeRules(next);
    showToast("Rule removed.");
  }

  // ── Clear cache ──────────────────────────────────────────────────────────

  function handleClearCache() {
    setClearingCache(true);
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("capflow-") && k !== "capflow-auth") {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      const now = new Date().toISOString();
      localStorage.setItem(LAST_CLEARED_KEY, now);

      setDiag((prev) =>
        prev ? { ...prev, lastCleared: now } : prev
      );
      showToast(`Cache cleared — ${keysToRemove.length} entr${keysToRemove.length === 1 ? "y" : "ies"} removed.`);
    } catch {
      showToast("Failed to clear cache.", "error");
    } finally {
      setClearingCache(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="px-4 py-5 border-b border-[var(--border-color)] flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={18} className="text-[var(--text-primary)]" />
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          Privacy, Automation &amp; Performance
        </h1>
      </header>

      <div className="px-4 py-5 space-y-5 max-w-lg mx-auto pb-28">

        {/* ── 1. Stealth & Privacy ───────────────────────────────────────── */}
        <div className="space-y-1.5">
          <SectionLabel label="Stealth & Privacy" delay={0.04} />
          <Card delay={0.08}>
            {/* Balance Masking */}
            <div className="flex items-start justify-between px-4 py-4 gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 flex items-center justify-center flex-shrink-0">
                  {balanceMasked ? (
                    <EyeOff size={16} className="text-[#6366F1]" />
                  ) : (
                    <Eye size={16} className="text-[#6366F1]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Balance Masking
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Replace all amounts with{" "}
                    <span className="font-mono tracking-widest">••••••</span>{" "}
                    across the app until tapped.
                  </p>
                </div>
              </div>
              <div className="pt-0.5 flex-shrink-0">
                <ToggleSwitch
                  checked={balanceMasked}
                  onChange={setBalanceMasked}
                />
              </div>
            </div>

            {/* Auto-Lock Timeout */}
            <div className="border-t border-[var(--border-color)] px-4 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
                  <Lock size={16} className="text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Auto-Lock Timeout
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Lock the app after this period of inactivity.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {LOCK_OPTIONS.map((opt) => {
                  const active = autoLockTimeout === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAutoLockTimeout(opt.value)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                        active
                          ? "bg-[#6366F1] text-white border-[#6366F1] shadow-sm"
                          : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[#6366F1]/50 hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* ── 2. Smart Auto-Categorization ───────────────────────────────── */}
        <div className="space-y-1.5">
          <SectionLabel label="Smart Auto-Categorization" delay={0.12} />
          <Card delay={0.16}>
            {/* Header row */}
            <div className="px-4 py-4 flex items-center gap-3 border-b border-[var(--border-color)]">
              <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-[#10B981]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Keyword Rules
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Auto-assign a category when a transaction title matches a keyword.
                </p>
              </div>
            </div>

            {/* Rule list */}
            <div className="divide-y divide-[var(--border-color)]">
              <AnimatePresence initial={false}>
                {autoCategorizeRules.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-4 py-6 flex flex-col items-center gap-2 text-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] flex items-center justify-center">
                      <Tag size={18} className="text-[var(--text-secondary)]" />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      No rules yet.
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]/70">
                      Add a keyword below to get started.
                    </p>
                  </motion.div>
                ) : (
                  autoCategorizeRules.map((rule, idx) => (
                    <motion.div
                      key={`${rule.keyword}-${idx}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="flex-1 min-w-0 text-sm text-[var(--text-primary)] truncate">
                          <span className="font-mono text-[#6366F1] font-semibold">
                            {rule.keyword}
                          </span>
                          <span className="mx-2 text-[var(--text-secondary)]">→</span>
                          <span className="text-[var(--text-secondary)]">
                            {rule.category}
                          </span>
                        </span>
                        <button
                          onClick={() => handleDeleteRule(idx)}
                          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[#EF4444]/10 hover:text-[#EF4444] transition-colors"
                          aria-label={`Delete rule for "${rule.keyword}"`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Add rule form */}
            <div className="border-t border-[var(--border-color)] px-4 py-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Add Rule
              </p>
              <div className="flex gap-2">
                <input
                  ref={keywordRef}
                  type="text"
                  value={ruleKeyword}
                  onChange={(e) => {
                    setRuleKeyword(e.target.value);
                    if (ruleError) setRuleError("");
                  }}
                  placeholder="Keyword…"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[#6366F1] transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddRule();
                  }}
                />
                <input
                  type="text"
                  value={ruleCategory}
                  onChange={(e) => {
                    setRuleCategory(e.target.value);
                    if (ruleError) setRuleError("");
                  }}
                  placeholder="Category…"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[#6366F1] transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddRule();
                  }}
                />
                <button
                  onClick={handleAddRule}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#6366F1] text-white flex items-center justify-center hover:bg-[#5558E6] transition-colors shadow-sm"
                  aria-label="Add rule"
                >
                  <Plus size={16} />
                </button>
              </div>
              <AnimatePresence>
                {ruleError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="text-xs text-[#EF4444] flex items-center gap-1.5"
                  >
                    <AlertCircle size={12} />
                    {ruleError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>

        {/* ── 3. Storage Diagnostics ─────────────────────────────────────── */}
        <div className="space-y-1.5">
          <SectionLabel label="Storage Diagnostics" delay={0.2} />
          <Card delay={0.24}>
            {/* Storage icon + title */}
            <div className="px-4 py-4 flex items-center gap-3 border-b border-[var(--border-color)]">
              <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 flex items-center justify-center flex-shrink-0">
                <HardDrive size={16} className="text-[#6366F1]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Storage Usage
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  IndexedDB + localStorage estimate from the browser.
                </p>
              </div>
            </div>

            {loadingDiag ? (
              <div className="px-4 py-6 flex items-center justify-center">
                <span className="text-sm text-[var(--text-secondary)] animate-pulse">
                  Estimating storage…
                </span>
              </div>
            ) : (
              <>
                {/* Storage bar */}
                <div className="px-4 py-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
                      {diag?.usedMB}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      of {diag?.quotaGB} available
                    </span>
                  </div>

                  {/* Record counts grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      { label: "Transactions", count: diag?.txCount ?? 0, color: "#6366F1" },
                      { label: "Categories", count: diag?.catCount ?? 0, color: "#10B981" },
                      { label: "Budgets", count: diag?.budgetCount ?? 0, color: "#F59E0B" },
                      { label: "Goals", count: diag?.goalCount ?? 0, color: "#0EA5E9" },
                      { label: "EMIs", count: diag?.emiCount ?? 0, color: "#EF4444" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]"
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            {item.label}
                          </p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {item.count.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {/* Total */}
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#6366F1]/8 border border-[#6366F1]/20">
                      <Database size={13} className="text-[#6366F1] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          Total Records
                        </p>
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          {(
                            (diag?.txCount ?? 0) +
                            (diag?.catCount ?? 0) +
                            (diag?.budgetCount ?? 0) +
                            (diag?.goalCount ?? 0) +
                            (diag?.emiCount ?? 0)
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clear cache */}
                <div className="border-t border-[var(--border-color)] px-4 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      Clear App Cache
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Removes cached keys (
                      <span className="font-mono text-[10px]">capflow-*</span>
                      ) from localStorage. Auth is preserved.
                    </p>
                    {diag?.lastCleared && (
                      <p className="text-[11px] text-[var(--text-secondary)]/60 mt-1">
                        Last cleared:{" "}
                        <span className="font-medium">
                          {formatLastCleared(diag.lastCleared)}
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleClearCache}
                    disabled={clearingCache}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EF4444]/10 text-[#EF4444] text-xs font-semibold border border-[#EF4444]/20 hover:bg-[#EF4444]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={13} />
                    {clearingCache ? "Clearing…" : "Clear Cache"}
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* ── Toast stack ─────────────────────────────────────────────────── */}
      <div
        aria-live="polite"
        className="fixed bottom-24 inset-x-0 flex flex-col items-center gap-2 px-4 z-50 pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onDone={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
