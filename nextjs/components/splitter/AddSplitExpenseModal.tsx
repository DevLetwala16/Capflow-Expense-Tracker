"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  Receipt,
  Check,
  AlertCircle,
  Users,
  User,
  RotateCcw,
  CreditCard,
  Calendar,
  Tag,
  Image as ImageIcon,
} from "lucide-react";
import {
  SplitMember,
  SplitExpenseItem,
  SplitMode,
  SplitPayerEntry,
  SplitShareEntry,
} from "@/types/splitter";
import {
  roundTo2Decimals,
  calculateEqualSplits,
  autoBalanceExactShares,
  formatSplitCurrency,
  toCents,
  fromCents,
} from "@/lib/splitter/debtEngine";
import { notifySplitExpenseLogged } from "@/lib/notifications/notificationEngine";

const DEFAULT_CATEGORIES = [
  "Food & Dining",
  "Transport & Fuel",
  "Accommodation",
  "Activities & Tickets",
  "Groceries & Supplies",
  "Shopping",
  "Entertainment",
  "Other",
];

interface AddSplitExpenseModalProps {
  open: boolean;
  onClose: () => void;
  members: SplitMember[];
  currency?: string;
  sessionId: string;
  sessionName?: string;
  currentMember?: SplitMember;
  existingExpense?: SplitExpenseItem | null;
  onSave: (expenseData: Partial<SplitExpenseItem>) => Promise<any>;
}

export function AddSplitExpenseModal({
  open,
  onClose,
  members,
  currency = "INR",
  sessionId,
  sessionName = "Splitter",
  currentMember,
  existingExpense,
  onSave,
}: AddSplitExpenseModalProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food & Dining");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);

  // Payer Mode: 'single' | 'multi'
  const [isMultiPayer, setIsMultiPayer] = useState(false);
  const [singlePayerId, setSinglePayerId] = useState(
    currentMember?.id || members[0]?.id || ""
  );
  const [multiPayers, setMultiPayers] = useState<Record<string, string>>({});

  // Split Mode: 'equal' | 'exact'
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    members.map((m) => m.id)
  );
  const [exactShares, setExactShares] = useState<Record<string, string>>({});
  const [customizedMemberIds, setCustomizedMemberIds] = useState<Set<string>>(new Set());

  // Family Headcount Consideration & per-expense headcount adjustment
  const hasFamilyHeadcounts = useMemo(
    () => members.some((m) => (m.familyCount || 1) > 1),
    [members]
  );
  const [considerFamilyMembers, setConsiderFamilyMembers] = useState(true);
  const [expenseWeights, setExpenseWeights] = useState<Record<string, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Active weights for splitting: returns undefined (1 share each) if considerFamilyMembers is false
  const activeWeights = useMemo(() => {
    if (!considerFamilyMembers) return undefined;
    const weights: Record<string, number> = {};
    members.forEach((m) => {
      weights[m.id] = Math.max(1, expenseWeights[m.id] ?? (m.familyCount || 1));
    });
    return weights;
  }, [considerFamilyMembers, members, expenseWeights]);

  // Total headcount of selected participants
  const totalActiveHeadcount = useMemo(() => {
    if (!considerFamilyMembers) return selectedParticipants.length;
    return selectedParticipants.reduce((sum, id) => {
      return sum + (activeWeights?.[id] || 1);
    }, 0);
  }, [considerFamilyMembers, selectedParticipants, activeWeights]);

  // Helper: compute equal/weighted shares map
  const computeEqualSharesMap = (
    total: number,
    participants: string[],
    weights = activeWeights
  ) => {
    if (total <= 0 || participants.length === 0) return {};
    const splits = calculateEqualSplits(total, participants, weights);
    const map: Record<string, string> = {};
    splits.forEach((s) => {
      map[s.memberId] = s.amount.toFixed(2);
    });
    return map;
  };

  // Load existing expense if editing
  useEffect(() => {
    if (existingExpense) {
      setTitle(existingExpense.title);
      setAmount(existingExpense.amount.toString());
      setCategory(existingExpense.category);
      setDate(
        existingExpense.date
          ? existingExpense.date.slice(0, 16)
          : new Date().toISOString().slice(0, 16)
      );
      setNotes(existingExpense.notes || "");
      setReceiptImage(existingExpense.receiptImage);
      setSplitMode(existingExpense.splitMode);
      setConsiderFamilyMembers(existingExpense.considerFamilyMembers !== false);

      const initialWeights: Record<string, number> = {};
      members.forEach((m) => {
        initialWeights[m.id] =
          existingExpense.memberWeights?.[m.id] ??
          (m.familyCount && m.familyCount > 1 ? m.familyCount : 1);
      });
      setExpenseWeights(initialWeights);

      if (existingExpense.paidBy.length > 1) {
        setIsMultiPayer(true);
        const map: Record<string, string> = {};
        existingExpense.paidBy.forEach((p) => {
          map[p.memberId] = p.amount.toString();
        });
        setMultiPayers(map);
      } else if (existingExpense.paidBy.length === 1) {
        setIsMultiPayer(false);
        setSinglePayerId(existingExpense.paidBy[0].memberId);
      }

      const participantIds = existingExpense.splits.map((s) => s.memberId);
      setSelectedParticipants(participantIds);

      if (existingExpense.splitMode === "exact") {
        const shareMap: Record<string, string> = {};
        const customized = new Set<string>();
        existingExpense.splits.forEach((s) => {
          shareMap[s.memberId] = s.amount.toString();
          customized.add(s.memberId);
        });
        setExactShares(shareMap);
        setCustomizedMemberIds(customized);
      } else {
        setExactShares({});
        setCustomizedMemberIds(new Set());
      }
    } else {
      // Reset
      setTitle("");
      setAmount("");
      setCategory("Food & Dining");
      setDate(new Date().toISOString().slice(0, 16));
      setNotes("");
      setReceiptImage(undefined);
      setIsMultiPayer(false);
      setSinglePayerId(currentMember?.id || members[0]?.id || "");
      setMultiPayers({});
      setSplitMode("equal");
      setConsiderFamilyMembers(true);

      const initialWeights: Record<string, number> = {};
      members.forEach((m) => {
        initialWeights[m.id] = m.familyCount && m.familyCount > 1 ? m.familyCount : 1;
      });
      setExpenseWeights(initialWeights);

      setSelectedParticipants(members.map((m) => m.id));
      setExactShares({});
      setCustomizedMemberIds(new Set());
      setError("");
    }
  }, [existingExpense, open, members, currentMember]);

  const parsedTotal = parseFloat(amount) || 0;

  // Compute equal splits preview
  const equalSplitsPreview = useMemo(() => {
    if (parsedTotal <= 0 || selectedParticipants.length === 0) return [];
    return calculateEqualSplits(parsedTotal, selectedParticipants, activeWeights);
  }, [parsedTotal, selectedParticipants, activeWeights]);

  // Compute multi-payer sum & remaining
  const multiPayerSum = useMemo(() => {
    let sumCents = 0;
    for (const [_, val] of Object.entries(multiPayers)) {
      const num = parseFloat(val) || 0;
      sumCents += toCents(num);
    }
    return fromCents(sumCents);
  }, [multiPayers]);

  const multiPayerDiff = roundTo2Decimals(parsedTotal - multiPayerSum);

  // Compute exact split sum & remaining
  const exactSplitSum = useMemo(() => {
    let sumCents = 0;
    for (const [_, val] of Object.entries(exactShares)) {
      const num = parseFloat(val) || 0;
      sumCents += toCents(num);
    }
    return fromCents(sumCents);
  }, [exactShares]);

  const exactSplitDiff = roundTo2Decimals(parsedTotal - exactSplitSum);

  // Handle total amount change
  const handleAmountChange = (newValStr: string) => {
    setAmount(newValStr);
    const newTotal = parseFloat(newValStr) || 0;
    if (splitMode === "exact" && newTotal > 0) {
      if (customizedMemberIds.size === 0) {
        setExactShares(computeEqualSharesMap(newTotal, selectedParticipants, activeWeights));
      } else {
        const uncustomized = selectedParticipants.filter((id) => !customizedMemberIds.has(id));
        if (uncustomized.length > 0) {
          let lockedCents = 0;
          for (const id of Array.from(customizedMemberIds)) {
            lockedCents += toCents(parseFloat(exactShares[id] || "0") || 0);
          }
          const remCents = toCents(newTotal) - lockedCents;
          if (remCents > 0) {
            const splits = calculateEqualSplits(fromCents(remCents), uncustomized, activeWeights);
            const next = { ...exactShares };
            splits.forEach((s) => {
              next[s.memberId] = s.amount.toFixed(2);
            });
            setExactShares(next);
          }
        }
      }
    }
  };

  // Switch split mode
  const handleSetSplitMode = (mode: SplitMode) => {
    setSplitMode(mode);
    if (mode === "exact" && parsedTotal > 0) {
      const currentSum = Object.values(exactShares).reduce(
        (acc, v) => acc + (parseFloat(v) || 0),
        0
      );
      if (currentSum === 0 || Math.abs(currentSum - parsedTotal) > 0.009) {
        setExactShares(computeEqualSharesMap(parsedTotal, selectedParticipants, activeWeights));
        setCustomizedMemberIds(new Set());
      }
    }
  };

  // Reset exact shares to equal/headcount split
  const handleResetToEqual = () => {
    if (parsedTotal > 0) {
      setExactShares(computeEqualSharesMap(parsedTotal, selectedParticipants, activeWeights));
      setCustomizedMemberIds(new Set());
    }
  };

  // Toggle consider family members on/off
  const handleToggleConsiderFamily = (enabled: boolean) => {
    setConsiderFamilyMembers(enabled);
    const targetWeights = enabled
      ? members.reduce((acc, m) => {
          acc[m.id] = Math.max(1, expenseWeights[m.id] ?? (m.familyCount || 1));
          return acc;
        }, {} as Record<string, number>)
      : undefined;

    if (splitMode === "exact" && parsedTotal > 0) {
      setExactShares(computeEqualSharesMap(parsedTotal, selectedParticipants, targetWeights));
      setCustomizedMemberIds(new Set());
    }
  };

  // Quick preset: by family size vs 1 share each (exclude kids)
  const handleApplyPreset = (type: "family" | "equal") => {
    if (type === "family") {
      setConsiderFamilyMembers(true);
      const targetWeights = members.reduce((acc, m) => {
        acc[m.id] = Math.max(1, expenseWeights[m.id] ?? (m.familyCount || 1));
        return acc;
      }, {} as Record<string, number>);
      if (parsedTotal > 0) {
        setExactShares(computeEqualSharesMap(parsedTotal, selectedParticipants, targetWeights));
        setCustomizedMemberIds(new Set());
      }
    } else {
      setConsiderFamilyMembers(false);
      if (parsedTotal > 0) {
        setExactShares(computeEqualSharesMap(parsedTotal, selectedParticipants, undefined));
        setCustomizedMemberIds(new Set());
      }
    }
  };

  // Adjust headcount weight for a specific member for this expense
  const handleUpdateMemberWeight = (memberId: string, delta: number) => {
    const current = expenseWeights[memberId] ?? (members.find((m) => m.id === memberId)?.familyCount || 1);
    const nextWeight = Math.max(1, Math.min(20, current + delta));
    const nextWeights = { ...expenseWeights, [memberId]: nextWeight };
    setExpenseWeights(nextWeights);

    if (considerFamilyMembers && parsedTotal > 0) {
      if (splitMode === "exact") {
        if (customizedMemberIds.size === 0) {
          setExactShares(computeEqualSharesMap(parsedTotal, selectedParticipants, nextWeights));
        } else {
          const uncustomized = selectedParticipants.filter((id) => !customizedMemberIds.has(id));
          if (uncustomized.length > 0) {
            let lockedCents = 0;
            for (const id of Array.from(customizedMemberIds)) {
              lockedCents += toCents(parseFloat(exactShares[id] || "0") || 0);
            }
            const remCents = toCents(parsedTotal) - lockedCents;
            if (remCents > 0) {
              const splits = calculateEqualSplits(fromCents(remCents), uncustomized, nextWeights);
              const next = { ...exactShares };
              splits.forEach((s) => {
                next[s.memberId] = s.amount.toFixed(2);
              });
              setExactShares(next);
            }
          }
        }
      }
    }
  };

  // Handle single exact share input change with auto-balance across other participants
  const handleExactShareChange = (memberId: string, valStr: string) => {
    if (parsedTotal <= 0) {
      setExactShares({ ...exactShares, [memberId]: valStr });
      return;
    }
    const { updatedShares, updatedCustomizedIds } = autoBalanceExactShares(
      parsedTotal,
      selectedParticipants,
      exactShares,
      memberId,
      valStr,
      customizedMemberIds,
      activeWeights
    );
    setExactShares(updatedShares);
    setCustomizedMemberIds(updatedCustomizedIds);
  };

  // Image compression helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scale = Math.min(MAX_WIDTH / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL("image/webp", 0.75);
          setReceiptImage(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleParticipant = (memberId: string) => {
    let nextParticipants: string[];
    if (selectedParticipants.includes(memberId)) {
      if (selectedParticipants.length <= 1) return; // Keep at least one
      nextParticipants = selectedParticipants.filter((id) => id !== memberId);
    } else {
      nextParticipants = [...selectedParticipants, memberId];
    }
    setSelectedParticipants(nextParticipants);

    if (splitMode === "exact" && parsedTotal > 0) {
      setExactShares(computeEqualSharesMap(parsedTotal, nextParticipants, activeWeights));
      setCustomizedMemberIds(new Set());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter an expense title");
      return;
    }
    if (parsedTotal <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    if (selectedParticipants.length === 0) {
      setError("Please select at least one participant");
      return;
    }

    // Build paidBy array
    let finalPaidBy: SplitPayerEntry[] = [];
    if (!isMultiPayer) {
      finalPaidBy = [{ memberId: singlePayerId, amount: parsedTotal }];
    } else {
      if (Math.abs(multiPayerDiff) > 0.009) {
        setError(
          `Sum of contributed payments (${formatSplitCurrency(
            multiPayerSum,
            currency
          )}) must equal total expense amount (${formatSplitCurrency(
            parsedTotal,
            currency
          )})`
        );
        return;
      }
      finalPaidBy = Object.entries(multiPayers)
        .map(([mId, val]) => ({ memberId: mId, amount: parseFloat(val) || 0 }))
        .filter((p) => p.amount > 0);
    }

    // Build splits array
    let finalSplits: SplitShareEntry[] = [];
    if (splitMode === "equal") {
      finalSplits = calculateEqualSplits(parsedTotal, selectedParticipants, activeWeights);
    } else {
      if (Math.abs(exactSplitDiff) > 0.009) {
        setError(
          `Sum of participant shares (${formatSplitCurrency(
            exactSplitSum,
            currency
          )}) must equal total expense amount (${formatSplitCurrency(
            parsedTotal,
            currency
          )})`
        );
        return;
      }
      finalSplits = selectedParticipants.map((mId) => ({
        memberId: mId,
        amount: roundTo2Decimals(parseFloat(exactShares[mId] || "0") || 0),
      }));
    }

    setSubmitting(true);
    setError("");

    try {
      await onSave({
        id: existingExpense?.id,
        sessionId,
        title: title.trim(),
        amount: parsedTotal,
        currency,
        category,
        date: new Date(date).toISOString(),
        createdBy: existingExpense?.createdBy || {
          memberId: currentMember?.id || singlePayerId,
          name: currentMember?.name || "Member",
        },
        paidBy: finalPaidBy,
        splitMode,
        splits: finalSplits,
        considerFamilyMembers,
        memberWeights: considerFamilyMembers ? expenseWeights : undefined,
        receiptImage,
        notes: notes.trim() || undefined,
      });

      // Fire notification for split expense logged
      notifySplitExpenseLogged({
        sessionName: sessionName || "Splitter",
        title: title.trim(),
        amount: parsedTotal,
        currency,
        payerName: currentMember?.name || "You",
      }).catch(() => {});

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-[540px] max-h-[92vh] flex flex-col bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {existingExpense ? "Edit Split Expense" : "Log Split Expense"}
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Audit trail recorded under:{" "}
                  <span className="font-semibold text-[#6366F1]">
                    {currentMember?.name || "You"}
                  </span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-2xl text-xs font-semibold text-[#EF4444]">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Title & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Expense Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dinner at Fisherman's Wharf, Uber to Airport"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Total Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm font-extrabold text-[#10B981] outline-none focus:border-[#6366F1] text-right"
                  />
                </div>
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  />
                </div>
              </div>

              {/* ── Payer Section ── */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)]/70 border border-[var(--border-color)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                    <CreditCard size={13} className="text-[#6366F1]" />
                    Who Paid for This?
                  </label>
                  <div className="flex items-center gap-1 bg-[var(--bg-card)] p-0.5 rounded-xl border border-[var(--border-color)] text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setIsMultiPayer(false)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        !isMultiPayer
                          ? "bg-[#6366F1] text-white"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      Single Payer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMultiPayer(true)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        isMultiPayer
                          ? "bg-[#6366F1] text-white"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      Multi-Payer
                    </button>
                  </div>
                </div>

                {!isMultiPayer ? (
                  <select
                    value={singlePayerId}
                    onChange={(e) => setSinglePayerId(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.handle}) {m.isDependent ? "· Dependent" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] text-[var(--text-secondary)] flex justify-between">
                      <span>Specify amounts contributed by each member:</span>
                      <span
                        className={`font-bold ${
                          Math.abs(multiPayerDiff) < 0.009
                            ? "text-[#10B981]"
                            : "text-[#EF4444]"
                        }`}
                      >
                        {Math.abs(multiPayerDiff) < 0.009
                          ? "Balanced"
                          : multiPayerDiff > 0
                          ? `${formatSplitCurrency(multiPayerDiff, currency)} remaining`
                          : `${formatSplitCurrency(Math.abs(multiPayerDiff), currency)} over`}
                      </span>
                    </div>
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="font-semibold text-[var(--text-primary)] truncate">
                          {m.name}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={multiPayers[m.id] || ""}
                          onChange={(e) =>
                            setMultiPayers({
                              ...multiPayers,
                              [m.id]: e.target.value,
                            })
                          }
                          className="w-28 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-right text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Splitting Modality Section ── */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)]/70 border border-[var(--border-color)] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Users size={13} className="text-[#6366F1]" />
                    Split Mode & Participants
                  </label>
                  <div className="flex items-center gap-1 bg-[var(--bg-card)] p-0.5 rounded-xl border border-[var(--border-color)] text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleSetSplitMode("equal")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        splitMode === "equal"
                          ? "bg-[#6366F1] text-white"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      Equal Split
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetSplitMode("exact")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        splitMode === "exact"
                          ? "bg-[#6366F1] text-white"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      Exact Split
                    </button>
                  </div>
                </div>

                {/* Consider Family Members Option (when members have family headcount > 1) */}
                {hasFamilyHeadcounts && (
                  <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between gap-2">
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <label
                          className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer select-none"
                          onClick={() => handleToggleConsiderFamily(!considerFamilyMembers)}
                        >
                          <Users size={12} className="text-[#6366F1]" />
                          <span>Consider Family Members</span>
                        </label>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 ${
                            considerFamilyMembers
                              ? "bg-[#10B981]/15 text-[#10B981]"
                              : "bg-[var(--border-color)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {considerFamilyMembers ? (
                            <>
                              <Users size={11} className="text-[#10B981]" />
                              <span>{totalActiveHeadcount} Total Persons</span>
                            </>
                          ) : (
                            <>
                              <User size={11} className="text-[var(--text-secondary)]" />
                              <span>1 Each ({selectedParticipants.length} persons)</span>
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                        {considerFamilyMembers
                          ? "Splitting proportionally by family headcount (kids/family included)."
                          : "Exclude kids/family headcount — split equally 1 share per member."}
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={considerFamilyMembers}
                        onChange={(e) => handleToggleConsiderFamily(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#6366F1]"></div>
                    </label>
                  </div>
                )}

                {/* Validation Status & Auto-balance Controls for Exact Split */}
                {splitMode === "exact" && (
                  <div className="space-y-1.5">
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold ${
                        Math.abs(exactSplitDiff) < 0.009
                          ? "bg-[#10B981]/10 text-[#10B981]"
                          : "bg-[#EF4444]/10 text-[#EF4444]"
                      }`}
                    >
                      <span>
                        Allocated: {formatSplitCurrency(exactSplitSum, currency)} of{" "}
                        {formatSplitCurrency(parsedTotal, currency)}
                      </span>
                      <span>
                        {Math.abs(exactSplitDiff) < 0.009
                          ? "Exact Match ✓"
                          : exactSplitDiff > 0
                          ? `${formatSplitCurrency(exactSplitDiff, currency)} left`
                          : `${formatSplitCurrency(Math.abs(exactSplitDiff), currency)} over`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] px-1 text-[var(--text-secondary)] flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {hasFamilyHeadcounts && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApplyPreset("family")}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                                considerFamilyMembers
                                  ? "bg-[#6366F1]/15 text-[#6366F1] border-[#6366F1]/30"
                                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]"
                              }`}
                              title="Split by each member's family headcount"
                            >
                              <Users size={12} className={considerFamilyMembers ? "text-[#6366F1]" : "text-[var(--text-secondary)]"} />
                              <span>By Family Size</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyPreset("equal")}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                                !considerFamilyMembers
                                  ? "bg-[#6366F1]/15 text-[#6366F1] border-[#6366F1]/30"
                                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]"
                              }`}
                              title="Ignore kids / split 1 share per member"
                            >
                              <User size={12} className={!considerFamilyMembers ? "text-[#6366F1]" : "text-[var(--text-secondary)]"} />
                              <span>1 Share Each (Exclude Kids)</span>
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleResetToEqual}
                        className="text-[#6366F1] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer ml-auto text-[11px]"
                      >
                        <RotateCcw size={12} />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Member Checkboxes / Exact Amounts */}
                <div className="space-y-2">
                  {members.map((m) => {
                    const isSelected = selectedParticipants.includes(m.id);
                    const equalPreview = equalSplitsPreview.find(
                      (p) => p.memberId === m.id
                    );
                    const memberWeight = expenseWeights[m.id] ?? (m.familyCount || 1);

                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-[var(--bg-card)] border-[#6366F1]/30"
                            : "bg-[var(--bg-card)]/40 border-transparent opacity-60"
                        }`}
                      >
                        <div
                          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                          onClick={() => toggleParticipant(m.id)}
                        >
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              isSelected
                                ? "bg-[#6366F1] border-[#6366F1] text-white"
                                : "border-[var(--text-secondary)]"
                            }`}
                          >
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-[var(--text-primary)] truncate block">
                                {m.name}
                              </span>
                              {considerFamilyMembers ? (
                                (m.familyCount || 1) > 1 && (
                                  <div
                                    className="flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md px-1.5 py-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Adjust kids/family members counted for this expense"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMemberWeight(m.id, -1)}
                                      className="text-[10px] text-[var(--text-secondary)] hover:text-[#6366F1] font-bold px-0.5"
                                    >
                                      -
                                    </button>
                                    <span className="text-[9px] font-bold text-[#10B981] min-w-[12px] inline-flex items-center gap-1">
                                      <Users size={10} className="text-[#10B981]" />
                                      <span>{memberWeight}</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateMemberWeight(m.id, 1)}
                                      className="text-[10px] text-[var(--text-secondary)] hover:text-[#6366F1] font-bold px-0.5"
                                    >
                                      +
                                    </button>
                                  </div>
                                )
                              ) : (
                                (m.familyCount || 1) > 1 && (
                                  <span
                                    className="text-[9px] font-medium text-[var(--text-secondary)] px-1.5 py-0.2 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] line-through opacity-70"
                                    title="Kids/family excluded for this expense"
                                  >
                                    {m.familyCount} pers.
                                  </span>
                                )
                              )}
                            </div>
                            {m.isDependent && (
                              <span className="text-[9px] text-[#EC4899] font-medium block">
                                Dependent · Debt routed to parent
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div>
                            {splitMode === "equal" ? (
                              <span className="text-xs font-bold text-[var(--text-primary)]">
                                {equalPreview
                                  ? formatSplitCurrency(equalPreview.amount, currency)
                                  : "₹0.00"}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {customizedMemberIds.has(m.id) && (
                                  <span
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/20"
                                    title="Manually edited value"
                                  >
                                    Custom
                                  </span>
                                )}
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={exactShares[m.id] || ""}
                                  onChange={(e) =>
                                    handleExactShareChange(m.id, e.target.value)
                                  }
                                  className="w-24 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-right text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Receipt Image Attachment */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Receipt Image (Optional)
                </label>
                {receiptImage ? (
                  <div className="relative inline-block border border-[var(--border-color)] rounded-2xl overflow-hidden p-1 bg-[var(--bg-primary)]">
                    <img
                      src={receiptImage}
                      alt="Receipt Attachment"
                      className="w-32 h-24 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setReceiptImage(undefined)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)]/50 cursor-pointer hover:bg-[var(--bg-primary)] transition-colors text-xs text-[var(--text-secondary)] font-medium">
                    <Upload size={14} className="text-[#6366F1]" />
                    <span>Upload or Capture Receipt (Compressed WebP)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Additional context or bill details"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl bg-[var(--bg-primary)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--border-color)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || parsedTotal <= 0 || !title.trim()}
                  className="flex-1 py-3 rounded-2xl bg-[#6366F1] text-white text-sm font-bold hover:bg-[#4F46E5] transition-colors disabled:opacity-50 shadow-md shadow-[#6366F1]/25"
                >
                  {submitting
                    ? "Saving..."
                    : existingExpense
                    ? "Update Expense"
                    : "Save & Split Expense"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
