"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronUp, Calendar, CreditCard, FileText, Calculator, Delete } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useAuthStore } from "@/lib/store/authStore";
import { Category } from "@/lib/db";
import { DynamicIcon } from "./DynamicIcon";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

const transactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.number().min(0.01, "Enter an amount greater than 0"),
  categoryId: z.number().min(1, "Select a category"),
  title: z.string().min(1, "Title is required"),
  date: z.string(),
  paymentMethod: z.enum(["cash", "credit_card", "bank_transfer", "upi"]),
  notes: z.string().optional(),
  currency: z.string(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface AddTransactionSheetProps {
  open: boolean;
  onClose: () => void;
  defaultType?: "expense" | "income";
  categories: Category[];
  currency: string;
  prefillDate?: string; // "YYYY-MM-DD"
  editTransaction?: {
    id: number;
    data: TransactionFormValues;
  } | null;
}

export function AddTransactionSheet({
  open,
  onClose,
  defaultType = "expense",
  categories,
  currency,
  prefillDate,
  editTransaction,
}: AddTransactionSheetProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const [showKeypad, setShowKeypad] = useState(false);
  const { addTransaction, updateTransaction } = useTransactionStore();
  const { user } = useAuthStore();
  const today = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: defaultType,
      amount: 0,
      date: today,
      paymentMethod: "cash",
      currency: currency,
    },
  });

  const txType = watch("type");
  const selectedCategoryId = watch("categoryId");
  const amount = watch("amount");

  useEffect(() => {
    if (open) {
      setSaved(false);
      setShowDetails(false);
      setShowKeypad(false);
      if (editTransaction) {
        Object.entries(editTransaction.data).forEach(([k, v]) => {
          setValue(k as keyof TransactionFormValues, v as never);
        });
        setAmountStr(editTransaction.data.amount > 0 ? String(editTransaction.data.amount) : "");
      } else {
        reset({
          type: defaultType,
          amount: 0,
          date: prefillDate ?? today,
          paymentMethod: "cash",
          currency,
        });
        setAmountStr("");
      }
    }
  }, [open, defaultType, currency, prefillDate, editTransaction, reset, setValue, today]);

  const handleAmountChange = (val: string) => {
    // Keep numbers and single decimal point
    let cleaned = val.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }
    // Limit to 2 decimal places
    if (cleaned.includes(".")) {
      const [intPart, decPart] = cleaned.split(".");
      cleaned = intPart + "." + (decPart || "").slice(0, 2);
    }
    setAmountStr(cleaned);
    const num = parseFloat(cleaned);
    setValue("amount", isNaN(num) ? 0 : num, { shouldValidate: true });
  };

  const handleKeypadPress = (key: string) => {
    if (key === "⌫") {
      const next = amountStr.slice(0, -1);
      handleAmountChange(next);
      return;
    }
    if (key === ".") {
      if (amountStr.includes(".")) return;
      handleAmountChange(amountStr === "" ? "0." : amountStr + ".");
      return;
    }
    // Number keys 0-9
    if (amountStr === "0") {
      handleAmountChange(key);
    } else {
      handleAmountChange(amountStr + key);
    }
  };

  const handleQuickAdd = (preset: number) => {
    const current = parseFloat(amountStr) || 0;
    const next = current + preset;
    handleAmountChange(String(next));
  };

  const onSubmit = async (data: TransactionFormValues) => {
    setSaving(true);
    try {
      if (editTransaction) {
        await updateTransaction(editTransaction.id, data);
      } else {
        await addTransaction(data, user?.id ?? "anonymous");
      }
      setSaved(true);
      setTimeout(() => {
        onClose();
        setSaved(false);
      }, 700);
    } catch (e) {
      console.error("Failed to save transaction:", e);
    }
    setSaving(false);
  };

  // Deduplicate and filter categories by type
  const filteredCategories = categories
    .filter((c) => c.type === txType || c.type === "both")
    .filter((c, idx, arr) => idx === arr.findIndex((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase()));

  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "credit_card", label: "Credit Card" },
    { value: "bank_transfer", label: "Bank" },
  ] as const;

  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop overlay (z-[80] sits strictly above bottom nav and FAB) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Device-friendly wrapper: mobile floating bottom sheet, tablet/desktop centered dialog */}
          <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center pointer-events-none p-2 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-full max-w-[400px] bg-[var(--bg-primary)] rounded-[24px] sm:rounded-3xl max-h-[88dvh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-[var(--border-color)] overflow-hidden pointer-events-auto"
            >
              {/* Drag Handle (Mobile only) */}
              <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0 bg-[var(--bg-primary)] sm:hidden">
                <div className="w-10 h-1 bg-[var(--border-color)] rounded-full" />
              </div>

            {/* Header: Title & Close */}
            <div className="flex items-center justify-between px-4 pb-2.5 flex-shrink-0 bg-[var(--bg-primary)]">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {editTransaction ? "Edit Transaction" : "Record Transaction"}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors"
                aria-label="Close"
              >
                <X size={15} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Type Switcher Pill */}
            <div className="px-4 pb-3 flex-shrink-0 bg-[var(--bg-primary)]">
              <div className="flex bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-1">
                {(["expense", "income"] as const).map((t) => {
                  const isActive = txType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setValue("type", t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                        isActive
                          ? t === "expense"
                            ? "bg-[#EF4444] text-white shadow-sm"
                            : "bg-[#10B981] text-white shadow-sm"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form
              id="add-transaction-form"
              onSubmit={handleSubmit(onSubmit)}
              className="flex-1 overflow-y-auto px-3.5 space-y-3 pb-3"
            >
              {/* Amount Box */}
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-secondary)]">
                    {symbol}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={amountStr}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] bg-transparent outline-none w-full text-center max-w-[200px] tracking-tight placeholder:text-[var(--text-secondary)]/40"
                    autoFocus
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-[#EF4444] font-medium mt-1">
                    {errors.amount.message}
                  </p>
                )}

                {/* Quick Add Chips & Numerical Keypad Toggle */}
                <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-[var(--border-color)] flex-wrap">
                  {[100, 500, 1000, 2000].map((addVal) => (
                    <button
                      key={addVal}
                      type="button"
                      onClick={() => handleQuickAdd(addVal)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[#6366F1] hover:border-[#6366F1] active:scale-95 transition-all"
                    >
                      +{symbol}{addVal >= 1000 ? `${addVal / 1000}k` : addVal}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowKeypad((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 active:scale-95 ${
                      showKeypad
                        ? "bg-[#6366F1] text-white border-[#6366F1] shadow-sm"
                        : "bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Calculator size={13} />
                    <span>{showKeypad ? "Hide Pad" : "Keypad"}</span>
                  </button>
                </div>

                {/* On-Screen Numerical Keypad */}
                <AnimatePresence>
                  {showKeypad && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-[var(--border-color)] overflow-hidden"
                    >
                      <div className="grid grid-cols-3 gap-1.5 max-w-[260px] mx-auto">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((btn) => (
                          <button
                            key={btn}
                            type="button"
                            onClick={() => handleKeypadPress(btn)}
                            className="py-2.5 rounded-xl font-bold text-base bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] active:scale-95 active:bg-[#6366F1]/10 hover:border-[#6366F1] transition-all shadow-sm flex items-center justify-center"
                          >
                            {btn === "⌫" ? <Delete size={18} /> : btn}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-center mt-2">
                        <button
                          type="button"
                          onClick={() => handleAmountChange("")}
                          className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[#EF4444] transition-colors"
                        >
                          Clear Amount
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                  <input
                    type="text"
                    placeholder="What was this for? (e.g. Lunch, Groceries)"
                    {...register("title")}
                    className="w-full text-sm text-center bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] font-medium"
                  />
                  {errors.title && (
                    <p className="text-xs text-[#EF4444] font-medium mt-1">
                      {errors.title.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Category Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Select Category
                  </p>
                  {errors.categoryId && (
                    <p className="text-xs text-[#EF4444] font-medium">Please pick one</p>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setValue("categoryId", cat.id!)}
                        className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-[#6366F1]/10 border-[#6366F1] shadow-sm scale-[1.02]"
                            : "bg-[var(--bg-card)] border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]"
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: (cat.color ?? "#94A3B8") + "20" }}
                        >
                          <DynamicIcon
                            name={cat.icon}
                            size={16}
                            color={cat.color ?? "#94A3B8"}
                          />
                        </div>
                        <span
                          className={`text-[10px] font-medium truncate w-full text-center leading-tight ${
                            isSelected ? "text-[#6366F1] font-bold" : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expand Additional Details Accordion */}
              <button
                type="button"
                onClick={() => setShowDetails((s) => !s)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#6366F1] hover:underline"
              >
                <span>{showDetails ? "Hide options" : "+ More details (Date, Method, Notes)"}</span>
                {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3.5 overflow-hidden pt-1"
                  >
                    {/* Date */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        <Calendar size={13} />
                        <span>Date</span>
                      </label>
                      <input
                        type="date"
                        {...register("date")}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                        <CreditCard size={13} />
                        <span>Payment Method</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {paymentMethods.map((m) => {
                          const active = watch("paymentMethod") === m.value;
                          return (
                            <button
                              key={m.value}
                              type="button"
                              onClick={() => setValue("paymentMethod", m.value)}
                              className={`py-2 px-1 rounded-xl text-[11px] font-semibold border text-center transition-all ${
                                active
                                  ? "bg-[#6366F1] text-white border-[#6366F1] shadow-sm"
                                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]"
                              }`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        <FileText size={13} />
                        <span>Notes</span>
                      </label>
                      <textarea
                        {...register("notes")}
                        placeholder="Add a remark or note…"
                        rows={2}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[#6366F1] resize-none"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* ── Sticky Action Footer (ALWAYS VISIBLE & NEVER CUT OFF ON MOBILE) ── */}
            <div className="p-3 sm:p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)] flex-shrink-0 pb-[max(12px,env(safe-area-inset-bottom,12px))]">
              <motion.button
                form="add-transaction-form"
                type="submit"
                disabled={saving || !amount || amount <= 0 || !selectedCategoryId}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-md ${
                  saved
                    ? "bg-[#10B981] text-white"
                    : saving || !amount || amount <= 0 || !selectedCategoryId
                    ? "bg-[var(--border-color)] text-[var(--text-secondary)] cursor-not-allowed opacity-70"
                    : txType === "expense"
                    ? "bg-[#EF4444] text-white hover:bg-[#DC2626]"
                    : "bg-[#10B981] text-white hover:bg-[#059669]"
                }`}
              >
                {saved
                  ? "✓ Saved!"
                  : saving
                  ? "Saving…"
                  : editTransaction
                  ? "Update Transaction"
                  : `Save ${txType === "expense" ? "Expense" : "Income"}`}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);
}
