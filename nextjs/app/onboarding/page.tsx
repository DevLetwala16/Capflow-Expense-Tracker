"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Download,
  CreditCard,
  ArrowRight,
} from "lucide-react";

// ─── Step 1 Preview: Real Animated Balance Card ──────────────────────────────
function BalanceCardPreview() {
  return (
    <div className="w-full bg-[var(--bg-card)] rounded-2xl p-4 sm:p-5 border border-[var(--border-color)] shadow-xl shadow-indigo-500/5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Total Net Balance
        </span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
          Live Balance
        </span>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight"
      >
        ₹48,250<span className="text-xs sm:text-sm font-normal text-[var(--text-secondary)]">.00</span>
      </motion.div>

      {/* Income & Expense Row */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
        <div className="bg-[var(--bg-primary)] p-2.5 sm:p-3 rounded-xl border border-[var(--border-color)]">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-medium">
            <span className="w-4 h-4 rounded-full bg-[#10B981]/15 flex items-center justify-center text-[#10B981]">
              <ArrowUpRight size={11} strokeWidth={2.5} />
            </span>
            Total Incomes
          </div>
          <p className="text-sm sm:text-base font-bold text-[#10B981] mt-0.5">+₹75,000</p>
        </div>

        <div className="bg-[var(--bg-primary)] p-2.5 sm:p-3 rounded-xl border border-[var(--border-color)]">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-medium">
            <span className="w-4 h-4 rounded-full bg-[#EF4444]/15 flex items-center justify-center text-[#EF4444]">
              <ArrowDownRight size={11} strokeWidth={2.5} />
            </span>
            Total Expenses
          </div>
          <p className="text-sm sm:text-base font-bold text-[#EF4444] mt-0.5">-₹26,750</p>
        </div>
      </div>

      {/* Burn Rate Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[11px] font-medium text-[var(--text-secondary)]">
          <span>Monthly Budget Used</span>
          <span className="text-[#6366F1] font-bold">36%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "36%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-[#6366F1] to-[#38bdf8] rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 2 Preview: Fast Logging & Floating Action Button ───────────────────
function FastLoggingPreview() {
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");

  return (
    <div className="w-full bg-[var(--bg-card)] rounded-2xl p-4 sm:p-5 border border-[var(--border-color)] shadow-xl shadow-indigo-500/5 space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-color)]">
        <span className="text-xs font-bold text-[var(--text-primary)]">Quick Transaction Logger</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6366F1]/10 text-[#6366F1] font-semibold">
          ⚡ 5-Sec Entry
        </span>
      </div>

      {/* Type Selector Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("expense")}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "expense"
              ? "bg-[#EF4444] text-white shadow-md shadow-red-500/20"
              : "bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20"
          }`}
        >
          <ArrowDownRight size={14} />
          Expense
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("income")}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "income"
              ? "bg-[#10B981] text-white shadow-md shadow-emerald-500/20"
              : "bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20"
          }`}
        >
          <ArrowUpRight size={14} />
          Income
        </button>
      </div>

      {/* Category Pills Simulation */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase text-[var(--text-secondary)]">Popular Categories</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Food & Dining", emoji: "🍔", active: true },
            { label: "Groceries", emoji: "🛒", active: false },
            { label: "Transport", emoji: "🚕", active: false },
            { label: "Shopping", emoji: "🛍️", active: false },
          ].map((cat) => (
            <span
              key={cat.label}
              className={`text-xs px-2.5 py-1 rounded-xl font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                cat.active
                  ? "bg-[#6366F1] text-white shadow-sm"
                  : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)]"
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Floating Action Button (FAB) Preview */}
      <div className="pt-2 flex items-center justify-between bg-[var(--bg-primary)] rounded-xl p-2.5 border border-[var(--border-color)]">
        <div className="text-left">
          <p className="text-xs font-bold text-[var(--text-primary)]">Quick FAB Access</p>
          <p className="text-[10px] text-[var(--text-secondary)]">Tap the (+) button on any screen</p>
        </div>
        <motion.div
          animate={{ rotate: [0, 45, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6366F1] to-[#38bdf8] flex items-center justify-center text-white shadow-md shadow-indigo-500/30"
        >
          <Plus size={18} strokeWidth={2.5} />
        </motion.div>
      </div>
    </div>
  );
}

// ─── Step 3 Preview: Analytics & Visual Charts ────────────────────────────────
function AnalyticsPreview() {
  const bars = [
    { day: "Mon", height: "40%", amount: "₹450" },
    { day: "Tue", height: "65%", amount: "₹820" },
    { day: "Wed", height: "30%", amount: "₹310" },
    { day: "Thu", height: "80%", amount: "₹1,240" },
    { day: "Fri", height: "55%", amount: "₹690" },
    { day: "Sat", height: "95%", amount: "₹1,850", peak: true },
    { day: "Sun", height: "50%", amount: "₹600" },
  ];

  return (
    <div className="w-full bg-[var(--bg-card)] rounded-2xl p-4 sm:p-5 border border-[var(--border-color)] shadow-xl shadow-indigo-500/5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-[var(--text-primary)]">Weekly Spending Trends</h4>
          <p className="text-[10px] text-[var(--text-secondary)]">Last 7 days breakdown</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6366F1]/15 text-[#6366F1]">
          Peak: Sat (₹1,850)
        </span>
      </div>

      {/* Simulated Bar Chart */}
      <div className="h-28 flex items-end justify-between gap-1.5 sm:gap-2 pt-4 px-1 pb-1 border-b border-[var(--border-color)]">
        {bars.map((bar, i) => (
          <div key={bar.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: bar.height }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
              className={`w-full rounded-t-lg transition-colors ${
                bar.peak
                  ? "bg-gradient-to-t from-[#6366F1] to-[#38bdf8] shadow-sm shadow-indigo-500/30"
                  : "bg-[#6366F1]/30 hover:bg-[#6366F1]/50"
              }`}
            />
            <span className={`text-[10px] font-medium ${bar.peak ? "text-[#6366F1] font-bold" : "text-[var(--text-secondary)]"}`}>
              {bar.day}
            </span>
          </div>
        ))}
      </div>

      {/* Category Distribution Pills */}
      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
          <span>Food & Dining: <strong className="text-[var(--text-primary)]">42%</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
          <span>Bills & Utility: <strong className="text-[var(--text-primary)]">28%</strong></span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4 Preview: Budgets, Goals & EMI Tracking ───────────────────────────
function BudgetsPreview() {
  return (
    <div className="w-full bg-[var(--bg-card)] rounded-2xl p-4 sm:p-5 border border-[var(--border-color)] shadow-xl shadow-indigo-500/5 space-y-3">
      {/* Category Budget Card */}
      <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🛒</span>
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">Groceries Budget</p>
              <p className="text-[10px] text-[var(--text-secondary)]">₹8,400 of ₹12,000 spent</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#10B981]">70%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "70%" }}
            transition={{ duration: 0.8 }}
            className="h-full bg-[#10B981] rounded-full"
          />
        </div>
      </div>

      {/* Savings Goal Card */}
      <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">💻</span>
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">MacBook Pro Goal</p>
              <p className="text-[10px] text-[var(--text-secondary)]">Target: ₹1,20,000</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#6366F1]">₹85,000</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "71%" }}
            transition={{ duration: 0.9 }}
            className="h-full bg-gradient-to-r from-[#6366F1] to-[#38bdf8] rounded-full"
          />
        </div>
      </div>

      {/* EMI Badge Reminder */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[11px]">
        <div className="flex items-center gap-1.5 text-[#F59E0B] font-semibold">
          <CreditCard size={14} />
          <span>Car Loan EMI: ₹14,500</span>
        </div>
        <span className="text-[10px] font-bold text-[var(--text-secondary)]">Due on 5th</span>
      </div>
    </div>
  );
}

// ─── Step 5 Preview: 100% Offline-First & Private ────────────────────────────
function PrivacyPreview() {
  return (
    <div className="w-full bg-[var(--bg-card)] rounded-2xl p-4 sm:p-5 border border-[var(--border-color)] shadow-xl shadow-indigo-500/5 space-y-4 text-center">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#10B981]/20 to-[#6366F1]/20 border border-[#10B981]/30 flex items-center justify-center mx-auto text-[#10B981]"
      >
        <ShieldCheck size={36} strokeWidth={2.2} />
      </motion.div>

      <div className="space-y-1">
        <h4 className="text-sm font-bold text-[var(--text-primary)]">
          100% Local & Encrypted on Your Device
        </h4>
        <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
          Your bank statements, income, and transactions never touch our servers. Stored safely in your browser database.
        </p>
      </div>

      {/* Export / Backup Badges */}
      <div className="grid grid-cols-2 gap-2 text-left">
        <div className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
            <Download size={14} className="text-[#6366F1]" />
            JSON Backup
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">One-click full encrypted backup</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
            <Download size={14} className="text-[#10B981]" />
            CSV Export
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Open in Excel or Google Sheets</p>
        </div>
      </div>
    </div>
  );
}

// ─── Step Content Configurations ─────────────────────────────────────────────
const STEPS = [
  {
    tag: "Core Foundation",
    title: "Real-Time Balance & Cash Flow",
    desc: "Stay in control with a clear financial overview. Monitor your net worth, income inflows, expense outflows, and monthly budget burn rate at a single glance.",
    tips: [
      "Dynamic Balance automatically recalculates with every transaction.",
      "Color-coded burn rate indicator warns you before you exceed limits.",
      "Switch previous or upcoming months with top arrow controls.",
    ],
    component: BalanceCardPreview,
  },
  {
    tag: "Lightning Speed",
    title: "One-Tap Logging & Smart FAB",
    desc: "Log any transaction in under 5 seconds. Use the floating action button (+) anytime, choose category icons, and assign payment methods like UPI, Cash, or Cards.",
    tips: [
      "Tap the floating (+) button anywhere to record expenses instantly.",
      "Pre-loaded with popular categories or create your own custom tags.",
      "Works 100% offline even without internet connectivity.",
    ],
    component: FastLoggingPreview,
  },
  {
    tag: "Smart Insights",
    title: "Weekly Trends & Visual Analytics",
    desc: "Turn raw numbers into actionable financial intelligence. Identify weekend spending peaks, drill into category breakdowns, and track where your money flows.",
    tips: [
      "Interactive 7-day bar chart shows exact spending spikes.",
      "Category drill-down modal reveals granular transaction histories.",
      "Filter analytics by weekly, monthly, or yearly periods.",
    ],
    component: AnalyticsPreview,
  },
  {
    tag: "Financial Goals",
    title: "Budgets, Savings & EMI Tracking",
    desc: "Build lasting financial health. Set monthly category limits, save for milestones with target goal rings, and never miss an upcoming loan or card EMI installment.",
    tips: [
      "Get alerted when you hit 80% and 100% of a category budget.",
      "Track multiple savings goals with visual progress bars.",
      "Manage EMI schedules and payment due dates easily.",
    ],
    component: BudgetsPreview,
  },
  {
    tag: "Privacy First",
    title: "100% Private, Secure & Offline",
    desc: "Your money, your privacy. All your financial data is stored locally in your browser's encrypted IndexedDB storage. No third-party data tracking or selling.",
    tips: [
      "Zero telemetry: we cannot read or see your financial records.",
      "Export full JSON backups anytime to migrate to any device.",
      "Download clean CSV spreadsheets for taxes or accounting.",
    ],
    component: PrivacyPreview,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const totalSteps = STEPS.length;
  const current = STEPS[currentStep] || STEPS[0];
  const isLastStep = currentStep === totalSteps - 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFinish = () => {
    try {
      router.replace("/dashboard");
    } catch {}
    // Guarantee navigation across all environments
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  };

  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      handleFinish();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  // Keyboard navigation: Left/Right arrows, Escape
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape") {
        handleFinish();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted, currentStep, isLastStep]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
      </div>
    );
  }

  const StepPreview = current.component;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-between select-none">
      {/* ── Top Header ── */}
      <header className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl overflow-hidden bg-white/5 border border-[var(--border-color)] flex items-center justify-center p-0.5 shadow-sm">
              <Image
                src="/capflow-logo.png"
                alt="CapFlow"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[var(--text-primary)]">
                  CapFlow
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] font-medium">
                Welcome Walkthrough
              </p>
            </div>
          </div>

          {/* Skip Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFinish();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all cursor-pointer pointer-events-auto"
            title="Skip to Dashboard (Esc)"
          >
            <span>Skip</span>
            <X size={15} />
          </button>
        </div>
      </header>

      {/* ── Main Walkthrough Showcase ── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl p-5 sm:p-7 md:p-8 space-y-6">
          {/* Top Tag & Step Count */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6366F1] bg-[#6366F1]/10 px-3 py-1 rounded-full">
              <Sparkles size={13} />
              {current.tag}
            </span>
            <span className="text-xs font-bold text-[var(--text-secondary)]">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {current.title}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {current.desc}
            </p>
          </div>

          {/* Real Animated UI Preview Component */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
              >
                <StepPreview />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pro Tips Checklist */}
          <div className="bg-[var(--bg-primary)] rounded-2xl p-4 border border-[var(--border-color)] space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-[#10B981]" />
              How It Works in CapFlow
            </p>
            <ul className="space-y-1.5">
              {current.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] mt-1.5 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      {/* ── Footer Navigation Bar ── */}
      <footer className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)]/80 backdrop-blur-md sticky bottom-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          {/* Back Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlePrev();
            }}
            disabled={currentStep === 0}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer pointer-events-auto"
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>

          {/* Step Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentStep(i);
                }}
                className={`h-2 rounded-full transition-all cursor-pointer pointer-events-auto ${
                  i === currentStep
                    ? "w-6 bg-[#6366F1]"
                    : "w-2 bg-[var(--border-color)] hover:bg-[var(--text-secondary)]"
                }`}
                aria-label={`Jump to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Next / Start with Dashboard Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNext();
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#6366F1] hover:bg-[#5558E6] text-white shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer pointer-events-auto"
          >
            <span>{isLastStep ? "Start with Dashboard" : "Next"}</span>
            {isLastStep ? <ArrowRight size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </footer>
    </div>
  );
}
