"use client";

import { motion } from "framer-motion";
import { progressRingTransition, colorTransition } from "@/lib/animations";

interface AnimatedProgressRingProps {
  /** Value between 0 and 100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  /** Override auto color thresholding */
  color?: string;
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return "#EF4444"; // danger
  if (percent >= 70) return "#F59E0B"; // warning
  return "#10B981";                     // success
}

/**
 * SVG progress ring with Framer Motion stroke-dashoffset animation on mount.
 * Color automatically transitions green → yellow → red based on threshold.
 * Used by budget cards (D1, D4).
 */
export function AnimatedProgressRing({
  percent,
  size = 64,
  strokeWidth = 6,
  label,
  sublabel,
  color,
}: AnimatedProgressRingProps) {
  const clampedPct = Math.min(100, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clampedPct / 100);
  const resolvedColor = color ?? getProgressColor(clampedPct);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[var(--border-color)] opacity-40"
        />
        {/* Progress arc */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ strokeDasharray: circumference }}
          animate={{
            strokeDashoffset: dashOffset,
            stroke: resolvedColor,
          }}
          initial={{ strokeDashoffset: circumference, stroke: "#10B981" }}
          transition={
            clampedPct !== 0
              ? { ...progressRingTransition }
              : { duration: 0 }
          }
        />
      </svg>

      {/* Center label */}
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {label && (
            <motion.span
              className="font-bold leading-none"
              style={{ fontSize: size * 0.22, color: resolvedColor }}
              animate={{ color: resolvedColor }}
              transition={colorTransition}
            >
              {label}
            </motion.span>
          )}
          {sublabel && (
            <span
              className="text-[var(--text-secondary)] leading-none mt-0.5"
              style={{ fontSize: size * 0.16 }}
            >
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
