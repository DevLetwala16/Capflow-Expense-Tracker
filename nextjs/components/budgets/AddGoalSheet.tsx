"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Home, Car, Plane, GraduationCap, Heart, PiggyBank, Briefcase, Gift, Star, Smartphone, Coffee, Bike, Baby, Music, BookOpen, Dumbbell, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBudgetStore } from "@/lib/store/budgetStore";
import { type LucideIcon } from "lucide-react";

// ─── Goal icon map ─────────────────────────────────────────────────────────────

interface GoalIconOption {
  name: string;
  Icon: LucideIcon;
  label: string;
}

const GOAL_ICONS: GoalIconOption[] = [
  { name: "target",          Icon: Target,       label: "Goal" },
  { name: "home",            Icon: Home,         label: "Home" },
  { name: "car",             Icon: Car,          label: "Car" },
  { name: "plane",           Icon: Plane,        label: "Travel" },
  { name: "graduation-cap",  Icon: GraduationCap,label: "Education" },
  { name: "heart",           Icon: Heart,        label: "Health" },
  { name: "piggy-bank",      Icon: PiggyBank,    label: "Savings" },
  { name: "briefcase",       Icon: Briefcase,    label: "Work" },
  { name: "gift",            Icon: Gift,         label: "Gift" },
  { name: "star",            Icon: Star,         label: "Dream" },
  { name: "smartphone",      Icon: Smartphone,   label: "Gadget" },
  { name: "coffee",          Icon: Coffee,       label: "Coffee" },
  { name: "bike",            Icon: Bike,         label: "Fitness" },
  { name: "baby",            Icon: Baby,         label: "Baby" },
  { name: "music",           Icon: Music,        label: "Music" },
  { name: "book-open",       Icon: BookOpen,     label: "Learning" },
  { name: "dumbbell",        Icon: Dumbbell,     label: "Gym" },
  { name: "camera",          Icon: Camera,       label: "Photo" },
];

const GOAL_COLORS = [
  "#6366F1", "#10B981", "#F59E0B", "#EF4444",
  "#0EA5E9", "#8B5CF6", "#EC4899", "#F97316",
  "#14B8A6", "#84CC16",
];

// ─── Zod schema ────────────────────────────────────────────────────────────────

const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.number().min(1, "Target must be > 0"),
  targetDate: z.string().min(1, "Pick a target date"),
  icon: z.string(),
  color: z.string(),
  autoContributionRule: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

// ─── Component ─────────────────────────────────────────────────────────────────

interface AddGoalSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddGoalSheet({ open, onClose }: AddGoalSheetProps) {
  const { addGoal } = useBudgetStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<GoalFormValues>({
      resolver: zodResolver(goalSchema),
      defaultValues: { icon: "target", color: "#6366F1" },
    });

  const selectedIcon = watch("icon");
  const selectedColor = watch("color");

  useEffect(() => {
    if (open) {
      setSaved(false);
      reset({ icon: "target", color: "#6366F1" });
    }
  }, [open, reset]);

  const onSubmit = async (data: GoalFormValues) => {
    setSaving(true);
    await addGoal({ ...data, savedAmount: 0 });
    setSaved(true);
    setTimeout(() => { onClose(); setSaved(false); }, 700);
    setSaving(false);
  };

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
              className="w-full max-w-[400px] bg-[var(--bg-primary)] rounded-[24px] sm:rounded-3xl z-[90] max-h-[88dvh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-[var(--border-color)] overflow-hidden pointer-events-auto"
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
                <div className="w-10 h-1 bg-[var(--border-color)] rounded-full" />
              </div>

            <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Add Savings Goal</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex items-center justify-center" aria-label="Close">
                <X size={16} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">

              {/* Goal name */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund"
                  {...register("name")}
                  className="mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                />
                {errors.name && <p className="text-xs text-[#EF4444] mt-1">{errors.name.message}</p>}
              </div>

              {/* Target amount */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Target Amount</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="1"
                  placeholder="e.g. 100000"
                  {...register("targetAmount", { valueAsNumber: true })}
                  onFocus={(e) => e.target.select()}
                  className="mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-3 text-base font-bold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                />
                {errors.targetAmount && <p className="text-xs text-[#EF4444] mt-1">{errors.targetAmount.message}</p>}
              </div>

              {/* Target date */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Target Date</label>
                <input
                  type="date"
                  {...register("targetDate")}
                  className="mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                />
                {errors.targetDate && <p className="text-xs text-[#EF4444] mt-1">{errors.targetDate.message}</p>}
              </div>

              {/* Icon picker — Lucide icons grid */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Icon</p>
                <div className="grid grid-cols-6 gap-2">
                  {GOAL_ICONS.map(({ name, Icon, label }) => {
                    const isActive = selectedIcon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setValue("icon", name)}
                        title={label}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                          isActive
                            ? "border-[#6366F1] bg-[#6366F1]/10 scale-105"
                            : "border-transparent bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={isActive ? "text-[#6366F1]" : "text-[var(--text-secondary)]"}
                          strokeWidth={isActive ? 2.5 : 1.8}
                        />
                        <span className="text-[8px] text-[var(--text-secondary)] truncate w-full text-center leading-none">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {GOAL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setValue("color", color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        selectedColor === color ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-primary)]" : ""
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={color}
                    />
                  ))}
                </div>
              </div>

              {/* Auto contribution (optional) */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Auto-Contribution <span className="normal-case font-normal text-[var(--text-secondary)]">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder='e.g. "10% of monthly income"'
                  {...register("autoContributionRule")}
                  className="mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                />
              </div>

              {/* Save */}
              <motion.button
                type="submit"
                disabled={saving}
                whileTap={{ scale: 0.97 }}
                className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all ${
                  saved ? "bg-[#10B981]" : saving ? "bg-[var(--border-color)] text-[var(--text-secondary)] cursor-not-allowed" : "bg-[#6366F1]"
                }`}
              >
                {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Goal"}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);
}
