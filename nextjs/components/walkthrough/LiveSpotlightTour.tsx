"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import {
  useWalkthroughStore,
  TOTAL_SPOTLIGHT_STEPS,
} from "@/lib/store/walkthroughStore";

interface SpotlightStepConfig {
  targetId: string;
  title: string;
  description: string;
  actionHint: string;
  placement?: "top" | "bottom" | "auto";
}

const SPOTLIGHT_STEPS: SpotlightStepConfig[] = [
  {
    targetId: "tour-header",
    title: "Header & Month Selector",
    description: "Switch between months using the left and right arrows. Your transactions and analytics update immediately to match the selected month.",
    actionHint: "Tip: Tap the quick 'Add' button in the header anytime.",
    placement: "bottom",
  },
  {
    targetId: "tour-balance-card",
    title: "Live Balance Card",
    description: "Your financial dashboard at a glance. See your real-time net balance, monthly income, total expenses, and the budget burn rate bar.",
    actionHint: "Tip: The burn rate bar alerts you if your expenses approach 80% or 100% of income.",
    placement: "bottom",
  },
  {
    targetId: "tour-quick-actions",
    title: "Instant Action Shortcuts",
    description: "Need to record something right now? Click 'Add Expense' or 'Add Income' to open the bottom sheet logger immediately.",
    actionHint: "Tip: Assign custom icons, categories, and payment types.",
    placement: "bottom",
  },
  {
    targetId: "tour-weekly-chart",
    title: "Weekly Spending Chart",
    description: "Displays your daily spending over the last 7 days. Helps you spot high-expense days and weekend patterns with ease.",
    actionHint: "Tip: Hover or tap each bar to view exact daily totals.",
    placement: "top",
  },
  {
    targetId: "tour-transactions",
    title: "Recent Transactions",
    description: "Review your latest financial activities in chronological order. Easily edit or delete any logged entry.",
    actionHint: "Tip: Click 'View Calendar →' to browse by calendar dates.",
    placement: "top",
  },
  {
    targetId: "tour-fab",
    title: "Floating Action Button (FAB)",
    description: "The (+) button is always accessible on your screen. Tap it anytime to pop open quick expense and income entry actions.",
    actionHint: "Tip: Smooth spring animation reveals options instantly.",
    placement: "top",
  },
];

export function LiveSpotlightTour() {
  const [mounted, setMounted] = useState(false);
  const {
    isOpen,
    mode,
    spotlightStep,
    nextStep,
    prevStep,
    closeWalkthrough,
    openWalkthrough,
  } = useWalkthroughStore();

  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: "top" | "bottom" }>({
    top: 100,
    left: 20,
    placement: "bottom",
  });

  const stepConfig = SPOTLIGHT_STEPS[spotlightStep] || SPOTLIGHT_STEPS[0];
  const isLastStep = spotlightStep === TOTAL_SPOTLIGHT_STEPS - 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate target position and scroll into view
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || mode !== "spotlight" || typeof window === "undefined") return;

    const el = document.getElementById(stepConfig.targetId);
    if (el) {
      const clientRect = el.getBoundingClientRect();
      setRect(clientRect);

      // Scroll smoothly into view if offscreen
      const viewportHeight = window.innerHeight;
      if (clientRect.top < 60 || clientRect.bottom > viewportHeight - 80) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Compute tooltip placement
      const spaceBelow = viewportHeight - clientRect.bottom;
      const spaceAbove = clientRect.top;
      const placement = spaceBelow >= 240 ? "bottom" : spaceAbove >= 240 ? "top" : "bottom";

      let top = placement === "bottom" ? clientRect.bottom + 12 : Math.max(16, clientRect.top - 240);
      let left = Math.max(16, Math.min(clientRect.left, window.innerWidth - 380));

      setTooltipPos({ top, left, placement });
    } else {
      setRect(null);
      setTooltipPos({
        top: Math.max(80, (window.innerHeight || 600) / 2 - 120),
        left: Math.max(16, (window.innerWidth || 800) / 2 - 180),
        placement: "bottom",
      });
    }
  }, [isOpen, mode, stepConfig.targetId]);

  useEffect(() => {
    if (!mounted) return;
    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition, { passive: true });
    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
    };
  }, [mounted, updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!mounted || !isOpen || mode !== "spotlight") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      } else if (e.key === "Escape") {
        closeWalkthrough();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted, isOpen, mode, nextStep, prevStep, closeWalkthrough]);

  if (!mounted || !isOpen || mode !== "spotlight") return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] pointer-events-auto">
        {/* Spotlight Overlay */}
        <div className="fixed inset-0 pointer-events-none">
          {rect ? (
            <svg className="w-full h-full">
              <defs>
                <mask id="spotlight-mask">
                  {/* White background covers everything */}
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {/* Black cutout reveals target */}
                  <rect
                    x={rect.left - 6}
                    y={rect.top - 6}
                    width={rect.width + 12}
                    height={rect.height + 12}
                    rx="16"
                    ry="16"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.65)"
                mask="url(#spotlight-mask)"
              />
            </svg>
          ) : (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          )}
        </div>

        {/* Highlight Ring around element */}
        {rect && (
          <motion.div
            layoutId="spotlight-ring"
            initial={false}
            animate={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
            }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed rounded-2xl border-2 border-[#6366F1] shadow-[0_0_25px_rgba(99,102,241,0.6)] pointer-events-none z-[125]"
          >
            {/* Pulsing indicator bead */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38bdf8] opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#6366F1]" />
            </span>
          </motion.div>
        )}

        {/* Floating Tooltip Bubble */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.2 }}
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
          className="fixed z-[130] w-[calc(100vw-32px)] max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-4 sm:p-5 space-y-3"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#6366F1] bg-[#6366F1]/10 px-2.5 py-0.5 rounded-full">
              <Sparkles size={12} />
              Spotlight {spotlightStep + 1} of {TOTAL_SPOTLIGHT_STEPS}
            </span>

            <div className="flex items-center gap-1">
              {/* Switch back to Showcase Modal */}
              <button
                onClick={() => openWalkthrough("showcase")}
                className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[#6366F1] px-2 py-0.5 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors flex items-center gap-1"
                title="Switch to detailed animated feature cards"
              >
                <LayoutGrid size={12} />
                <span>Showcase View</span>
              </button>

              <button
                onClick={closeWalkthrough}
                className="w-6 h-6 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] flex items-center justify-center transition-colors"
                title="Exit tour (Esc)"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-[var(--text-primary)]">
              {stepConfig.title}
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {stepConfig.description}
            </p>
          </div>

          {/* Action Hint */}
          <div className="p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[11px] text-[var(--text-primary)] font-medium">
            {stepConfig.actionHint}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-1">
            {/* Step Dots */}
            <div className="flex items-center gap-1">
              {SPOTLIGHT_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === spotlightStep ? "w-4 bg-[#6366F1]" : "w-1.5 bg-[var(--border-color)]"
                  }`}
                />
              ))}
            </div>

            {/* Back / Next Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevStep}
                disabled={spotlightStep === 0}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>

              <button
                onClick={nextStep}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#6366F1] hover:bg-[#5558E6] text-white shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1 active:scale-95"
              >
                <span>{isLastStep ? "Finish Tour 🎉" : "Next"}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
