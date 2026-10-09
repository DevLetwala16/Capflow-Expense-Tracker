/**
 * CapFlow — Framer Motion Animation Variants (Step 4.4)
 *
 * Centralised animation definitions for consistent motion across the app.
 * Import these in any component instead of writing inline variants.
 */

import type { Variants, Transition } from "framer-motion";

// ─── Spring presets ────────────────────────────────────────────────────────────

export const spring: Transition = { type: "spring", stiffness: 380, damping: 28 };
export const springBouncy: Transition = { type: "spring", stiffness: 500, damping: 22 };
export const springGentle: Transition = { type: "spring", stiffness: 200, damping: 24 };
export const tween200: Transition = { type: "tween", duration: 0.2, ease: "easeOut" };
export const tween300: Transition = { type: "tween", duration: 0.3, ease: "easeOut" };

// ─── Page / route transition ───────────────────────────────────────────────────

/** Wrap a Next.js page with this for shared-layout slide transitions. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: tween300 },
  exit:    { opacity: 0, y: -8, transition: tween200 },
};

// ─── Bottom-sheet (slide up / slide down with drag gesture) ───────────────────

export const sheetVariants: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { ...springGentle },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: tween200,
  },
};

/** Backdrop for bottom sheets / modals */
export const backdropVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: tween200 },
  exit:    { opacity: 0, transition: tween200 },
};

// ─── Modal / dialog (scale + fade with AnimatePresence) ──────────────────────

export const modalVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springBouncy },
  exit:    { opacity: 0, scale: 0.96, y: 8, transition: tween200 },
};

// ─── FAB expand (spring physics morph into Add Transaction sheet) ─────────────

export const fabVariants: Variants = {
  rest:    { scale: 1 },
  pressed: { scale: 0.90, transition: springBouncy },
};

/** Options panel that expands from FAB */
export const fabMenuVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.85, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...springBouncy,
      staggerChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: 12,
    transition: tween200,
  },
};

export const fabMenuItemVariants: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springBouncy },
};

// ─── Category tile select (scale-up + colored ring bounce) ────────────────────

export const categoryTileVariants: Variants = {
  unselected: { scale: 1 },
  selected: {
    scale: 1.08,
    transition: springBouncy,
  },
};

// ─── Balance card number count-up tween ──────────────────────────────────────
// Use with `animate={{ opacity: 1 }}` + a JS counter effect (see BalanceCard.tsx)

export const countUpVariants: Variants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: tween300 },
};

// ─── Budget progress ring (SVG stroke-dashoffset animate on mount) ────────────

/** Applied to <motion.circle> — interpolate strokeDashoffset from circumference → 0 */
export const progressRingTransition: Transition = {
  type: "tween",
  duration: 0.9,
  ease: [0.34, 1.56, 0.64, 1], // custom cubic with slight overshoot
};

// ─── Budget card color transition (green → yellow → red) ─────────────────────
// Use `animate={{ color: ..., borderColor: ... }}` with this transition

export const colorTransition: Transition = {
  type: "tween",
  duration: 0.4,
  ease: "easeInOut",
};

// ─── OTP wrong entry shake ────────────────────────────────────────────────────

export const otpShakeVariants: Variants = {
  shake: {
    x: [0, -10, 10, -8, 8, -4, 4, 0],
    transition: { duration: 0.45, ease: "easeInOut" },
  },
  idle: { x: 0 },
};

// ─── OTP success checkmark morph ─────────────────────────────────────────────

export const otpSuccessVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { ...springBouncy, delay: 0.05 },
  },
};

// ─── Toast / delete undo (slide in from bottom, 5s auto-dismiss) ─────────────

export const toastVariants: Variants = {
  hidden:  { opacity: 0, y: 60, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springBouncy,
  },
  exit: {
    opacity: 0,
    y: 60,
    scale: 0.96,
    transition: tween200,
  },
};

// ─── Chart entrance (staggered) ───────────────────────────────────────────────

export const chartContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const chartItemVariants: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: tween300 },
};

// ─── List item stagger (transaction rows, etc.) ───────────────────────────────

export const listContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

export const listItemVariants: Variants = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: tween200 },
};

// ─── Section entrance (settings groups, card sections) ───────────────────────

/** Apply as initial/animate/transition on motion.div section wrappers. */
export function sectionEntrance(delaySeconds: number): { initial: object; animate: object; transition: Transition } {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "tween", duration: 0.32, ease: "easeOut", delay: delaySeconds },
  };
}

// ─── PWA Install Banner (slide up from bottom) ────────────────────────────────

export const installBannerVariants: Variants = {
  hidden:  { opacity: 0, y: 80 },
  visible: { opacity: 1, y: 0, transition: springGentle },
  exit:    { opacity: 0, y: 80, transition: tween200 },
};
