"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEMIStore } from "@/lib/store/emiStore";
import { useAuthStore } from "@/lib/store/authStore";
import { EMI } from "@/lib/db";

// ─── Schema ───────────────────────────────────────────────────────────────────

const emiSchema = z.object({
  name: z.string().min(1, "EMI name is required"),
  totalCost: z
    .number({ error: "Enter total cost" })
    .min(1, "Must be greater than 0"),
  monthlyCost: z
    .number({ error: "Enter monthly cost" })
    .min(1, "Must be greater than 0"),
  totalInstallments: z
    .number({ error: "Enter installments" })
    .int()
    .min(1, "Min 1")
    .max(600, "Max 600"),
  startDate: z.string().min(1, "Select a start date"),
  dueDay: z
    .number({ error: "Enter due day" })
    .int()
    .min(1, "Min 1")
    .max(31, "Max 31"),
  reminderLeadDays: z
    .number({ error: "Enter lead days" })
    .int()
    .min(1, "Min 1")
    .max(30, "Max 30"),
  emailSyncEnabled: z.boolean(),
});

type EMIFormValues = z.infer<typeof emiSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddEditEMISheetProps {
  open: boolean;
  onClose: () => void;
  editEMI?: EMI | null;
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {label}
        </label>
        {hint && (
          <span className="text-[10px] text-[var(--text-secondary)] italic">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <p className="text-xs text-[#EF4444] mt-1">{error}</p>
      )}
    </div>
  );
}

const inputCls =
  "mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-3 text-base font-semibold text-[var(--text-primary)] outline-none focus:border-[#6366F1] transition-colors";

// ─── Component ────────────────────────────────────────────────────────────────

export function AddEditEMISheet({ open, onClose, editEMI }: AddEditEMISheetProps) {
  const { addEMI, updateEMI, deleteEMI } = useEMIStore();
  const { user } = useAuthStore();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isEdit = !!editEMI;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EMIFormValues>({
    resolver: zodResolver(emiSchema),
    defaultValues: {
      reminderLeadDays: 3,
      emailSyncEnabled: false,
      dueDay: 1,
      totalInstallments: 12,
    },
  });

  const totalCost = watch("totalCost");
  const totalInstallments = watch("totalInstallments");
  const autoMonthly =
    totalCost && totalInstallments && totalInstallments > 0
      ? (totalCost / totalInstallments).toFixed(0)
      : null;

  // Populate form when editing
  useEffect(() => {
    if (open) {
      setSaved(false);
      setSaving(false);
      if (editEMI) {
        reset({
          name: editEMI.name,
          totalCost: editEMI.totalCost,
          monthlyCost: editEMI.monthlyCost,
          totalInstallments: editEMI.totalInstallments,
          startDate: editEMI.startDate,
          dueDay: editEMI.dueDay,
          reminderLeadDays: editEMI.reminderLeadDays,
          emailSyncEnabled: editEMI.emailSyncEnabled,
        });
      } else {
        reset({
          reminderLeadDays: 3,
          emailSyncEnabled: false,
          dueDay: 1,
          totalInstallments: 12,
          startDate: new Date().toISOString().split("T")[0],
        });
      }
    }
  }, [open, editEMI, reset]);

  const onSubmit = async (data: EMIFormValues) => {
    if (!user?.id) return;
    setSaving(true);

    // Derive endDate from startDate + totalInstallments months
    const start = new Date(data.startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + data.totalInstallments - 1);
    const endDate = end.toISOString().split("T")[0];

    try {
      let savedId = editEMI?.id;

      if (isEdit && editEMI?.id != null) {
        await updateEMI(editEMI.id, { ...data, endDate });
      } else {
        savedId = await addEMI(
          {
            ...data,
            endDate,
            paidInstallments: 0,
          },
          user.id
        );
      }

      // Sync to server for automated daily email cron reminders if enabled
      if (savedId != null) {
        fetch("/api/emis/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emiId: savedId,
            name: data.name,
            monthlyCost: data.monthlyCost,
            dueDay: data.dueDay,
            reminderLeadDays: data.reminderLeadDays,
            action: data.emailSyncEnabled ? "upsert" : "delete",
          }),
        }).catch((err) => console.warn("[EMI sync error]", err));
      }

      setSaved(true);
      setTimeout(() => {
        onClose();
        setSaved(false);
      }, 600);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editEMI?.id) return;
    const confirmed = window.confirm(
      `Delete "${editEMI.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    // Remove from server sync
    fetch("/api/emis/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emiId: editEMI.id,
        action: "delete",
      }),
    }).catch(() => {});

    await deleteEMI(editEMI.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="emi-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center pointer-events-none p-2 sm:p-4">
            <motion.div
              key="emi-sheet-panel"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-[480px] bg-[var(--bg-primary)] rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl border border-[var(--border-color)] overflow-hidden pointer-events-auto"
            >
              {/* Drag handle — mobile only */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
                <div className="w-10 h-1 bg-[var(--border-color)] rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-[var(--border-color)]">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {isEdit ? "Edit EMI" : "Add EMI"}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex items-center justify-center hover:bg-[var(--border-color)] transition-colors"
                  aria-label="Close"
                >
                  <X size={16} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Scrollable body */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex-1 overflow-y-auto px-5 py-5 space-y-5"
              >
                {/* EMI Name */}
                <Field label="EMI Name" error={errors.name?.message}>
                  <input
                    type="text"
                    placeholder="e.g. Home Loan, Car EMI"
                    {...register("name")}
                    className={inputCls}
                  />
                </Field>

                {/* Total Cost + Monthly Cost — side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Total Cost (₹)"
                    error={errors.totalCost?.message}
                  >
                    <input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="1"
                      placeholder="e.g. 600000"
                      {...register("totalCost", { valueAsNumber: true })}
                      onFocus={(e) => e.target.select()}
                      className={inputCls}
                    />
                  </Field>

                  <Field
                    label="Monthly Cost (₹)"
                    hint={autoMonthly ? `≈ ${autoMonthly}` : "= Total / Installments"}
                    error={errors.monthlyCost?.message}
                  >
                    <input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="1"
                      placeholder="e.g. 25000"
                      {...register("monthlyCost", { valueAsNumber: true })}
                      onFocus={(e) => e.target.select()}
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Total Installments + Due Day */}
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Total Installments"
                    error={errors.totalInstallments?.message}
                  >
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="600"
                      placeholder="e.g. 24"
                      {...register("totalInstallments", { valueAsNumber: true })}
                      onFocus={(e) => e.target.select()}
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Due Day (1–31)" error={errors.dueDay?.message}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="31"
                      placeholder="e.g. 5"
                      {...register("dueDay", { valueAsNumber: true })}
                      onFocus={(e) => e.target.select()}
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Start Date */}
                <Field label="Start Date" error={errors.startDate?.message}>
                  <input
                    type="date"
                    {...register("startDate")}
                    className={inputCls}
                  />
                </Field>

                {/* Reminder Lead Days */}
                <Field
                  label="Remind me N days before"
                  error={errors.reminderLeadDays?.message}
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="30"
                    placeholder="3"
                    {...register("reminderLeadDays", { valueAsNumber: true })}
                    onFocus={(e) => e.target.select()}
                    className={inputCls}
                  />
                </Field>

                {/* Email Sync Toggle */}
                <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl px-4 py-3 border border-[var(--border-color)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Get email reminders
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Receive an email before each EMI due date
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                    <input
                      type="checkbox"
                      {...register("emailSyncEnabled")}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6366F1]" />
                  </label>
                </div>

                {/* ── Sticky save area ─────────────────────────────────────── */}
                <div className="pt-2 pb-1 space-y-3">
                  {/* Save button */}
                  <motion.button
                    type="submit"
                    disabled={saving}
                    whileTap={{ scale: 0.97 }}
                    className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                      saved
                        ? "bg-[#10B981] text-white"
                        : saving
                        ? "bg-[var(--border-color)] text-[var(--text-secondary)] cursor-not-allowed opacity-70"
                        : "bg-[#6366F1] text-white hover:bg-[#5558E3]"
                    }`}
                  >
                    {saved ? (
                      <>
                        <CheckCircle2 size={18} />
                        Saved!
                      </>
                    ) : saving ? (
                      "Saving…"
                    ) : isEdit ? (
                      "Update EMI"
                    ) : (
                      "Add EMI"
                    )}
                  </motion.button>

                  {/* Delete button — edit mode only */}
                  {isEdit && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full py-3 rounded-2xl font-semibold text-sm text-[#EF4444] flex items-center justify-center gap-2 hover:bg-[#EF4444]/10 transition-colors"
                    >
                      <Trash2 size={15} />
                      Delete EMI
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
