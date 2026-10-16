"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Zap,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Send,
  Loader2,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/store/authStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_VERSION = "v1.0.0";
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "+919104212177";

const CHANGELOG: { title: string; items: string[] }[] = [
  {
    title: `What's New in ${APP_VERSION}`,
    items: [
      "🎉 Initial release of CapFlow",
      "🎨 Appearance — dark / light theme with CSS-var theming",
      "💱 Currency — real-time exchange rates & bulk transaction sync",
      "🏷️ Categories — custom income & expense categories",
      "📤 Export — PDF, CSV, and Excel multi-format export",
      "💾 Data — device-to-device migration via encrypted backup/restore",
      "🔔 Notifications — EMI reminder emails & monthly summary",
      "🤖 Smart auto-categorisation of transactions",
      "🧩 7 settings modules (Appearance, Currency, Categories, Export, Notifications, Data, About)",
      "🔒 100 % on-device storage — zero financial data ever leaves your device",
    ],
  },
];

type FeedbackCategory = "Bug Report" | "Feature Request" | "General Feedback";
const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  "Bug Report",
  "Feature Request",
  "General Feedback",
];

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg {
  id: number;
  type: "success" | "error";
  message: string;
}

function Toast({ toast, onDismiss }: { toast: ToastMsg; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm font-medium max-w-sm pointer-events-auto ${
        toast.type === "success"
          ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
          : "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]"
      }`}
    >
      {toast.type === "success" ? (
        <Check size={16} className="mt-0.5 flex-shrink-0" />
      ) : (
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
      )}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ─── Reusable primitives (match settings/page.tsx patterns) ───────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
      {label}
    </p>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

function LinkRow({
  label,
  sub,
  href,
  onClick,
  noBorder = false,
}: {
  label: string;
  sub?: string;
  href?: string;
  onClick?: () => void;
  noBorder?: boolean;
}) {
  const content = (
    <>
      <div className="text-left">
        <p className="text-sm text-[var(--text-primary)]">{label}</p>
        {sub && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{sub}</p>}
      </div>
      {onClick ? (
        <ChevronRight size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
      ) : (
        <ExternalLink size={14} className="text-[var(--text-secondary)] flex-shrink-0" />
      )}
    </>
  );

  const className = `w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-card-hover)] transition-colors ${
    noBorder ? "" : "border-t border-[var(--border-color)]"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Hydration guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Changelog modal
  const [showChangelog, setShowChangelog] = useState(false);

  // Feedback form
  const [category, setCategory] = useState<FeedbackCategory>("General Feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactConsent, setContactConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ subject?: string; message?: string }>({});

  // Toasts
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastCounter = useRef(0);

  const addToast = (type: "success" | "error", message: string) => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Validate ────────────────────────────────────────────────────────────────
  const validate = () => {
    const errs: typeof formErrors = {};
    if (!subject.trim()) errs.subject = "Subject is required.";
    if (message.trim().length < 20) errs.message = "Message must be at least 20 characters.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: message.trim(),
          userEmail: mounted && user?.email ? user.email : undefined,
          userName: mounted && user?.name ? user.name : undefined,
          contactConsent,
        }),
      });

      if (res.ok) {
        addToast("success", "Feedback sent! Thank you for helping us improve CapFlow. 🙏");
        setSubject("");
        setMessage("");
        setContactConsent(false);
        setCategory("General Feedback");
        setFormErrors({});
      } else {
        const data = await res.json().catch(() => ({}));
        addToast("error", data?.message || data?.error || "Failed to send feedback. Please try again.");
      }
    } catch {
      addToast("error", "Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── WhatsApp ────────────────────────────────────────────────────────────────
  const handleWhatsApp = () => {
    const text = message.trim()
      ? `CapFlow Feedback [${category}]: ${subject.trim()} — ${message.trim()}`
      : `CapFlow Feedback — Hello! I'd like to get in touch with Softcapphyjas support.`;
    const cleanNumber = (WHATSAPP_NUMBER || "+919104212177").replace(/\D/g, "");
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-full bg-[var(--bg-primary)] pb-12">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={18} className="text-[var(--text-primary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">About & Support</h1>
      </header>

      <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">

        {/* ══════════════════════════════════════════════════════════════════════
            1. APP INFO CARD
        ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
          className="space-y-1.5"
        >
          <SectionLabel label="App Info" />
          <Card>
            {/* Logo + name */}
            <div className="flex items-center gap-4 px-4 py-5 border-b border-[var(--border-color)]">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden border border-[var(--border-color)] p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/capflow-logo.png"
                  alt="CapFlow Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">CapFlow</h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20">
                    {APP_VERSION}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
                  <Zap size={11} className="text-[#F59E0B]" />
                  Your finances, your device
                </p>
              </div>
            </div>

            {/* What's New button */}
            <button
              onClick={() => setShowChangelog(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <div className="text-left">
                <p className="text-sm text-[var(--text-primary)]">What&apos;s New in {APP_VERSION}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Initial release highlights
                </p>
              </div>
              <ChevronRight size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
            </button>
          </Card>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            2. SUPPORT CARD
        ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.06 }}
          className="space-y-1.5"
        >
          <SectionLabel label="Support" />
          <Card>
            <LinkRow
              label="Help & FAQ"
              sub="Browse guides, tips, and answers"
              onClick={() => router.push("/settings/about/help")}
              noBorder
            />
            <LinkRow
              label="Privacy Policy"
              sub="How we handle your data"
              onClick={() => router.push("/settings/about/privacy")}
            />
            <LinkRow
              label="Terms of Service"
              sub="Usage terms and conditions"
              onClick={() => router.push("/settings/about/terms")}
            />
          </Card>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            3. IN-APP FEEDBACK FORM
        ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className="space-y-1.5"
        >
          <SectionLabel label="Send Feedback" />
          <Card>
            <form onSubmit={handleSubmit} noValidate>
              {/* Category pills */}
              <div className="px-4 pt-4 pb-3">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2.5">Category</p>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        category === cat
                          ? "bg-[#6366F1] text-white border-[#6366F1] shadow-sm"
                          : "bg-transparent text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[#6366F1]/50 hover:text-[#6366F1]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[var(--border-color)]" />

              {/* Subject */}
              <div className="px-4 py-3 space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="feedback-subject">
                  Subject <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  id="feedback-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (formErrors.subject) setFormErrors((p) => ({ ...p, subject: undefined }));
                  }}
                  placeholder="Brief summary of your feedback"
                  className={`w-full px-3 py-2.5 text-sm rounded-xl bg-[var(--bg-primary)] border text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/40 transition-all ${
                    formErrors.subject ? "border-[#EF4444]" : "border-[var(--border-color)]"
                  }`}
                />
                <AnimatePresence>
                  {formErrors.subject && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-[#EF4444] flex items-center gap-1"
                    >
                      <AlertCircle size={11} />
                      {formErrors.subject}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Message */}
              <div className="px-4 pb-3 space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="feedback-message">
                  Message <span className="text-[#EF4444]">*</span>
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (formErrors.message) setFormErrors((p) => ({ ...p, message: undefined }));
                  }}
                  placeholder="Describe your issue or idea in detail (min 20 characters)…"
                  rows={4}
                  className={`w-full px-3 py-2.5 text-sm rounded-xl bg-[var(--bg-primary)] border text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/40 transition-all resize-none leading-relaxed ${
                    formErrors.message ? "border-[#EF4444]" : "border-[var(--border-color)]"
                  }`}
                />
                <div className="flex items-start justify-between gap-2">
                  <AnimatePresence>
                    {formErrors.message ? (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-xs text-[#EF4444] flex items-center gap-1"
                      >
                        <AlertCircle size={11} />
                        {formErrors.message}
                      </motion.p>
                    ) : (
                      <span />
                    )}
                  </AnimatePresence>
                  <p className="text-[11px] text-[var(--text-secondary)] flex-shrink-0 tabular-nums">
                    {message.length} / 20 min
                  </p>
                </div>
              </div>

              {/* Contact consent toggle */}
              <div className="border-t border-[var(--border-color)] px-4 py-3.5 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)]">Allow team to contact me</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    We may reach out for follow-up on your feedback
                  </p>
                </div>
                <div className="flex-shrink-0 pt-0.5">
                  <ToggleSwitch checked={contactConsent} onChange={setContactConsent} />
                </div>
              </div>

              {/* Submit */}
              <div className="border-t border-[var(--border-color)] px-4 py-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#6366F1] text-white text-sm font-semibold hover:bg-[#5558E6] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Send Feedback
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            4. WHATSAPP CONTACT BUTTON
        ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
        >
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981] font-semibold text-sm hover:bg-[#10B981]/20 active:scale-[0.98] transition-all"
          >
            {/* WhatsApp icon (SVG inline for accuracy) */}
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contact us on WhatsApp
          </button>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════════
            5. DATA PRIVACY NOTE
        ══════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.24 }}
        >
          <Card className="px-4 py-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="text-[#10B981] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Your data stays on your device
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  All financial data is stored locally on your device only. CapFlow never uploads
                  your transactions, balances, or spending history to any server.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Version footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center text-xs text-[var(--text-secondary)] pb-2"
        >
          CapFlow {APP_VERSION} · Powered by Softcapphyjas Pvt. Ltd.
        </motion.p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CHANGELOG MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showChangelog} onOpenChange={setShowChangelog}>
        <DialogContent
          showCloseButton={false}
          className="bg-[var(--bg-card)] border-[var(--border-color)] max-h-[80vh] overflow-y-auto"
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#38bdf8] flex items-center justify-center">
                  <Zap size={14} className="text-white" />
                </span>
                What&apos;s New
              </DialogTitle>
              <DialogClose
                render={
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors" />
                }
              >
                <X size={15} />
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-1">
            {CHANGELOG.map((section) => (
              <div key={section.title}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20">
                    {APP_VERSION}
                  </span>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{section.title}</p>
                </div>
                <ul className="space-y-2.5">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-[#6366F1]/10 flex items-center justify-center flex-shrink-0">
                        <Check size={10} className="text-[#6366F1]" />
                      </span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[var(--border-color)]">
            <p className="text-xs text-center text-[var(--text-secondary)]">
              Thank you for using CapFlow {APP_VERSION} 🎉
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Toast stack ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none w-full px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
