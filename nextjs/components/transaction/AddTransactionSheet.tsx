"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { Category } from "@/lib/db";
import { DynamicIcon } from "./DynamicIcon";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥",
};

const transactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  categoryId: z.number(),
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
  editTransaction?: {
    id: number;
    data: TransactionFormValues;
  } | null;
}

export function AddTransactionSheet({
  open, onClose, defaultType = "expense", categories, currency, editTransaction
}: AddTransactionSheetProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { addTransaction, updateTransaction } = useTransactionStore();

  const today = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TransactionFormValues>({
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
      if (editTransaction) {
        Object.entries(editTransaction.data).forEach(([k, v]) => {
          setValue(k as keyof TransactionFormValues, v as never);
        });
      } else {
        reset({
          type: defaultType,
          amount: 0,
          date: today,
          paymentMethod: "cash",
          currency,
        });
      }
    }
  }, [open, defaultType, currency, editTransaction, reset, setValue, today]);

  const onSubmit = async (data: TransactionFormValues) => {
    setSaving(true);
    try {
      if (editTransaction) {
        await updateTransaction(editTransaction.id, data);
      } else {
        await addTransaction(data);
      }
      setSaved(true);
      setTimeout(() => {
        onClose();
        setSaved(false);
      }, 800);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const filteredCategories = categories.filter(
    (c) => c.type === txType || c.type === "both"
  );

  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "credit_card", label: "Credit Card" },
    { value: "bank_transfer", label: "Bank" },
  ] as const;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[var(--bg-primary)] rounded-t-3xl z-50 max-h-[92dvh] flex flex-col"
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-[var(--border-color)] rounded-full" />
            </div>

            <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editTransaction ? "Edit Transaction" : "Add Transaction"}
              </h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex items-center justify-center" aria-label="Close">
                <X size={16} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
              {/* Type Toggle */}
              <div className="flex bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-1">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setValue("type", t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize ${
                      txType === t
                        ? t === "expense"
                          ? "bg-[#EF4444] text-white shadow-sm"
                          : "bg-[#10B981] text-white shadow-sm"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-light text-[var(--text-secondary)]">
                    {CURRENCY_SYMBOLS[currency] || currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register("amount", { valueAsNumber: true })}
                    className="text-4xl font-bold text-[var(--text-primary)] bg-transparent outline-none w-full text-center"
                  />
                </div>
                {errors.amount && <p className="text-xs text-[#EF4444] mt-1">{errors.amount.message}</p>}
                <input
                  type="text"
                  placeholder="What was this for? (e.g. Lunch)"
                  {...register("title")}
                  className="w-full mt-3 text-sm text-center bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
                {errors.title && <p className="text-xs text-[#EF4444] mt-1">{errors.title.message}</p>}
              </div>

              {/* Category Grid */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Category</p>
                <div className="grid grid-cols-4 gap-2">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setValue("categoryId", cat.id!)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                        selectedCategoryId === cat.id
                          ? "scale-105"
                          : "border-transparent bg-[var(--bg-card)]"
                      }`}
                      style={selectedCategoryId === cat.id ? { borderColor: cat.color } : {}}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: cat.color + "20" }}
                      >
                        <DynamicIcon name={cat.icon} size={16} color={cat.color} />
                      </div>
                      <span className="text-[9px] font-medium text-[var(--text-secondary)] text-center leading-tight">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expand details */}
              <button
                type="button"
                onClick={() => setShowDetails((s) => !s)}
                className="flex items-center gap-2 text-sm font-medium text-[#6366F1]"
              >
                {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showDetails ? "Less details" : "More details"}
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Date</label>
                      <input
                        type="date"
                        {...register("date")}
                        className="mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Payment Method</p>
                      <div className="flex flex-wrap gap-2">
                        {paymentMethods.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => setValue("paymentMethod", m.value)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                              watch("paymentMethod") === m.value
                                ? "bg-[#6366F1] text-white border-[#6366F1]"
                                : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Notes</label>
                      <textarea
                        {...register("notes")}
                        placeholder="Add a note…"
                        rows={2}
                        className="mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#6366F1] resize-none"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Save Button */}
              <motion.button
                type="submit"
                disabled={saving || !amount || !selectedCategoryId}
                whileTap={{ scale: 0.97 }}
                className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all ${
                  saved
                    ? "bg-[#10B981]"
                    : saving || !amount || !selectedCategoryId
                    ? "bg-[var(--border-color)] text-[var(--text-secondary)] cursor-not-allowed"
                    : txType === "expense"
                    ? "bg-[#EF4444]"
                    : "bg-[#10B981]"
                }`}
              >
                {saved ? "✓ Saved!" : saving ? "Saving…" : editTransaction ? "Update Transaction" : "Save Transaction"}
              </motion.button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
