"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBudgetStore } from "@/lib/store/budgetStore";
import { useAuthStore } from "@/lib/store/authStore";
import { Category } from "@/lib/db";
import { DynamicIcon } from "@/components/transaction/DynamicIcon";

const budgetSchema = z.object({
  categoryId: z.number({ error: "Pick a category" }),
  limit: z.number().min(1, "Limit must be > 0"),
  alertThreshold: z.number().min(50).max(100),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface AddBudgetSheetProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  month: string; // "YYYY-MM"
}

export function AddBudgetSheet({
  open,
  onClose,
  categories,
  month,
}: AddBudgetSheetProps) {
  const { addBudget } = useBudgetStore();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<BudgetFormValues>({
      resolver: zodResolver(budgetSchema),
      defaultValues: { alertThreshold: 90 },
    });

  const selectedCategoryId = watch("categoryId");
  const alertThreshold = watch("alertThreshold");

  useEffect(() => {
    if (open) {
      setSaved(false);
      reset({ alertThreshold: 90 });
    }
  }, [open, reset]);

  const onSubmit = async (data: BudgetFormValues) => {
    setSaving(true);
    await addBudget({ ...data, month }, user?.id ?? "anonymous");
    setSaved(true);
    setTimeout(() => { onClose(); setSaved(false); }, 700);
    setSaving(false);
  };

  const expenseCategories = categories.filter(
    (c) => c.type === "expense" || c.type === "both"
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center pointer-events-none p-2 sm:p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-[400px] bg-[var(--bg-primary)] rounded-[24px] sm:rounded-3xl max-h-[88dvh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-[var(--border-color)] overflow-hidden pointer-events-auto"
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
                <div className="w-10 h-1 bg-[var(--border-color)] rounded-full" />
              </div>

            <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Add Budget</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex items-center justify-center" aria-label="Close">
                <X size={16} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
              {/* Category picker */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Category
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {expenseCategories.map((cat) => (
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
                {errors.categoryId && (
                  <p className="text-xs text-[#EF4444] mt-1">{errors.categoryId.message}</p>
                )}
              </div>

              {/* Monthly limit */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Monthly Limit
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="1"
                  placeholder="e.g. 5000"
                  {...register("limit", { valueAsNumber: true })}
                  onFocus={(e) => e.target.select()}
                  className="mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-3 text-base font-bold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                />
                {errors.limit && (
                  <p className="text-xs text-[#EF4444] mt-1">{errors.limit.message}</p>
                )}
              </div>

              {/* Alert threshold */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Alert Threshold
                  </label>
                  <span className="text-sm font-bold text-[#F59E0B]">{alertThreshold ?? 90}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  {...register("alertThreshold", { valueAsNumber: true })}
                  className="w-full accent-[#F59E0B]"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1">
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Save */}
              <motion.button
                type="submit"
                disabled={saving || !selectedCategoryId}
                whileTap={{ scale: 0.97 }}
                className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                  saved
                    ? "bg-[#10B981] text-white"
                    : saving || !selectedCategoryId
                    ? "bg-[var(--border-color)] text-[var(--text-secondary)] cursor-not-allowed opacity-70"
                    : "bg-[#6366F1] text-white"
                }`}
              >
                {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Budget"}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);
}
