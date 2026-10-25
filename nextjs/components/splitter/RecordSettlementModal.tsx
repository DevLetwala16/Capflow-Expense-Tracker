"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, CheckCircle, HandCoins, QrCode } from "lucide-react";
import { SplitMember, SettlementTransaction } from "@/types/splitter";
import { formatSplitCurrency } from "@/lib/splitter/debtEngine";
import { notifySplitSettlementLogged } from "@/lib/notifications/notificationEngine";
import { PaymentSettlementQRModal } from "./PaymentSettlementQRModal";

interface RecordSettlementModalProps {
  open: boolean;
  onClose: () => void;
  members: SplitMember[];
  currency?: string;
  suggestedTransaction?: SettlementTransaction | null;
  onRecord: (data: {
    fromMemberId: string;
    toMemberId: string;
    amount: number;
    notes?: string;
    date?: string;
    expenseId?: string;
  }) => Promise<any>;
}

export function RecordSettlementModal({
  open,
  onClose,
  members,
  currency = "INR",
  suggestedTransaction,
  onRecord,
}: RecordSettlementModalProps) {
  const independentMembers = members.filter((m) => !m.isDependent);

  const [fromMemberId, setFromMemberId] = useState(
    suggestedTransaction?.fromMemberId || independentMembers[0]?.id || ""
  );
  const [toMemberId, setToMemberId] = useState(
    suggestedTransaction?.toMemberId || independentMembers[1]?.id || ""
  );
  const [amount, setAmount] = useState(
    suggestedTransaction?.amount ? suggestedTransaction.amount.toString() : ""
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (suggestedTransaction) {
      setFromMemberId(suggestedTransaction.fromMemberId);
      setToMemberId(suggestedTransaction.toMemberId);
      setAmount(suggestedTransaction.amount.toString());
      setNotes(
        `Settlement of dues (${suggestedTransaction.fromMemberName} -> ${suggestedTransaction.toMemberName})`
      );
    } else {
      if (independentMembers.length >= 2) {
        setFromMemberId(independentMembers[0].id);
        setToMemberId(independentMembers[1].id);
      }
      setAmount("");
      setNotes("");
    }
  }, [suggestedTransaction, open, members]);

  const fromMember = members.find((m) => m.id === fromMemberId);
  const toMember = members.find((m) => m.id === toMemberId);

  const parsedAmount = parseFloat(amount) || 0;

  const currentTransaction: SettlementTransaction = {
    fromMemberId,
    fromMemberName: fromMember?.name || "Payer",
    toMemberId,
    toMemberName: toMember?.name || "Receiver",
    amount: parsedAmount > 0 ? parsedAmount : (suggestedTransaction?.amount || 0),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Please specify a valid payment amount");
      return;
    }
    if (fromMemberId === toMemberId) {
      setError("Payer and receiver cannot be the same member");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onRecord({
        fromMemberId,
        toMemberId,
        amount: parsedAmount,
        notes: notes.trim() || undefined,
        date: new Date().toISOString(),
      });

      notifySplitSettlementLogged({
        sessionName: "Splitter",
        fromName: fromMember?.name || "Member",
        toName: toMember?.name || "Member",
        amount: parsedAmount,
        currency,
      }).catch(() => {});

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record settlement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
              className="relative w-full max-w-[400px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl z-10"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center mx-auto mb-3">
                <HandCoins size={24} />
              </div>

              <h3 className="text-base font-bold text-[var(--text-primary)] text-center">
                Record Debt Settlement
              </h3>
              <p className="text-xs text-[var(--text-secondary)] text-center mt-0.5 mb-5">
                Support full settlements or partial paybacks
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-2xl text-xs font-semibold text-[#EF4444]">
                    {error}
                  </div>
                )}

                {/* Payer -> Receiver */}
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                      Who Paid
                    </label>
                    <select
                      value={fromMemberId}
                      onChange={(e) => setFromMemberId(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                    >
                      {independentMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                      Who Received
                    </label>
                    <select
                      value={toMemberId}
                      onChange={(e) => setToMemberId(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-2.5 py-2 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                    >
                      {independentMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Settlement Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-base font-extrabold text-[#10B981] outline-none focus:border-[#6366F1] text-right"
                  />
                </div>

                {/* Payment QR Option for Receiver */}
                {toMember && (
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 hover:bg-[#6366F1]/15 active:scale-[0.99] transition-all text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#6366F1] text-white flex items-center justify-center flex-shrink-0">
                        <QrCode size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          Pay {toMember.name} via QR / UPI Apps
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">
                          {toMember.paymentQrCode
                            ? "View uploaded QR, download, or open GPay / PhonePe"
                            : "Scan QR code or launch installed payment apps"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#6366F1] px-2 py-0.5 rounded-lg bg-[var(--bg-card)] border border-[#6366F1]/20 flex-shrink-0 ml-1.5">
                      Open QR
                    </span>
                  </button>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Payment Note (e.g. UPI Ref / Cash)
                  </label>
                  <input
                    type="text"
                    placeholder="Payment Notes / Mode"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-2xl bg-[var(--bg-primary)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--border-color)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !amount}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#10B981] text-white text-sm font-bold hover:bg-[#059669] transition-colors disabled:opacity-50 shadow-md shadow-[#10B981]/25"
                  >
                    {submitting ? "Recording..." : "Record Payment"}
                    <CheckCircle size={14} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded Payment QR Modal */}
      <PaymentSettlementQRModal
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        transaction={currentTransaction}
        members={members}
        currency={currency}
        onMarkSettled={async (settleNotes) => {
          setShowQrModal(false);
          await onRecord({
            fromMemberId,
            toMemberId,
            amount: parsedAmount || currentTransaction.amount,
            notes: settleNotes || notes.trim() || undefined,
            date: new Date().toISOString(),
          });
          onClose();
        }}
      />
    </>
  );
}
