"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export interface ModuleLoaderProps {
  /** Main heading text, e.g. "Loading Module..." or "Loading Dashboard" */
  title?: string;
  /** Subtitle message, e.g. "Preparing your transactions and charts..." */
  description?: string;
  /** Display style: "module" (fills page area), "fullscreen" (fixed overlay), "card" (inside card), or "inline" */
  variant?: "module" | "fullscreen" | "card" | "inline";
  /** Size scale: "sm" | "md" | "lg" */
  size?: "sm" | "md" | "lg";
  /** Whether to show the CapFlow logo in the center */
  showLogo?: boolean;
  /** Optional badge/pill text above title, e.g. "CapFlow" */
  badge?: string;
  /** Custom extra className */
  className?: string;
}

export function ModuleLoader({
  title = "Loading Module...",
  description = "Preparing your data...",
  variant = "module",
  size = "md",
  showLogo = true,
  badge = "CapFlow",
  className = "",
}: ModuleLoaderProps) {
  // Dimensions based on size scale
  const sizeMap = {
    sm: {
      ring: 48,
      stroke: 2.5,
      logo: 22,
      titleClass: "text-xs font-medium",
      descClass: "text-[11px]",
      barWidth: "w-24",
    },
    md: {
      ring: 68,
      stroke: 3,
      logo: 30,
      titleClass: "text-sm font-semibold",
      descClass: "text-xs",
      barWidth: "w-36",
    },
    lg: {
      ring: 88,
      stroke: 3.5,
      logo: 40,
      titleClass: "text-base font-bold",
      descClass: "text-xs",
      barWidth: "w-48",
    },
  };

  const config = sizeMap[size];

  // Inline variant (mini spinner for buttons or compact rows)
  if (variant === "inline") {
    return (
      <div className={`inline-flex items-center gap-2.5 text-[var(--text-secondary)] ${className}`}>
        <div className="relative w-4 h-4 flex items-center justify-center">
          <motion.div
            className="w-full h-full border-2 border-[#6366F1]/30 border-t-[#6366F1] rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          />
        </div>
        {title && <span className="text-xs font-medium text-[var(--text-primary)]">{title}</span>}
      </div>
    );
  }

  // Animation core (ring + logo + pulse)
  const loaderGraphic = (
    <div className="relative flex items-center justify-center">
      {/* Ambient glowing background aura */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: config.ring + 24,
          height: config.ring + 24,
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(16, 185, 129, 0.08) 50%, transparent 75%)",
          filter: "blur(10px)",
        }}
        animate={{
          scale: [0.92, 1.15, 0.92],
          opacity: [0.5, 0.85, 0.5],
        }}
        transition={{
          repeat: Infinity,
          duration: 2.4,
          ease: "easeInOut",
        }}
      />

      {/* Outer primary rotating SVG gradient ring */}
      <svg
        width={config.ring}
        height={config.ring}
        viewBox="0 0 100 100"
        className="relative z-10 -rotate-90"
      >
        <defs>
          <linearGradient id="capflowLoaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="1" />
            <stop offset="60%" stopColor="#818CF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Faint static background track */}
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-[var(--border-color)] opacity-40"
        />

        {/* Animated active gradient spinner arc */}
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="url(#capflowLoaderGrad)"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeDasharray="264"
          initial={{ strokeDashoffset: 190 }}
          animate={{
            strokeDashoffset: [200, 60, 200],
            rotate: [0, 360],
          }}
          transition={{
            strokeDashoffset: {
              repeat: Infinity,
              duration: 1.8,
              ease: "easeInOut",
            },
            rotate: {
              repeat: Infinity,
              duration: 1.4,
              ease: "linear",
            },
          }}
          style={{ transformOrigin: "50% 50%" }}
        />
      </svg>

      {/* Inner counter-orbiting decorative micro arc */}
      <motion.div
        className="absolute z-10 pointer-events-none rounded-full border border-dashed border-[#6366F1]/30"
        style={{
          width: config.ring - 14,
          height: config.ring - 14,
        }}
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
      />

      {/* Center Brand Emblem / Breathing Logo Icon */}
      <motion.div
        className="absolute z-20 flex items-center justify-center rounded-2xl bg-[var(--bg-card)] shadow-sm border border-[var(--border-color)] overflow-hidden"
        style={{
          width: config.logo + 10,
          height: config.logo + 10,
        }}
        animate={{
          scale: [0.94, 1.05, 0.94],
        }}
        transition={{
          repeat: Infinity,
          duration: 2,
          ease: "easeInOut",
        }}
      >
        {showLogo ? (
          <Image
            src="/capflow-logo.png"
            alt="CapFlow"
            width={config.logo}
            height={config.logo}
            className="w-full h-full object-contain p-1"
            priority
          />
        ) : (
          <div className="w-2.5 h-2.5 rounded-full bg-[#6366F1] shadow-[0_0_8px_#6366F1]" />
        )}
      </motion.div>
    </div>
  );

  // Content block (Badge, Title with animated dots, Subtitle, Progress bar)
  const loaderText = (
    <div className="flex flex-col items-center text-center max-w-sm px-4">
      {badge && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          {badge}
        </span>
      )}

      {/* Main Title with synchronized typing/bouncing dots */}
      <div className="flex items-center gap-1">
        <h3 className={`${config.titleClass} text-[var(--text-primary)] tracking-tight`}>
          {title}
        </h3>
        <span className="inline-flex items-center gap-0.5 ml-0.5">
          {[0, 1, 2].map((dotIndex) => (
            <motion.span
              key={dotIndex}
              className="w-1 h-1 rounded-full bg-[#6366F1]"
              animate={{
                opacity: [0.2, 1, 0.2],
                y: [0, -2, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                delay: dotIndex * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </span>
      </div>

      {/* Description / reassurance */}
      {description && (
        <p className={`${config.descClass} text-[var(--text-secondary)] mt-1 max-w-[280px] leading-relaxed`}>
          {description}
        </p>
      )}

      {/* Sleek indeterminate progression line */}
      <div className={`${config.barWidth} h-1 bg-[var(--border-color)] rounded-full overflow-hidden mt-3.5 relative`}>
        <motion.div
          className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#6366F1] to-[#10B981] rounded-full"
          animate={{
            x: ["-100%", "250%"],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.6,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  );

  // Fullscreen variant
  if (variant === "fullscreen") {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)]/80 backdrop-blur-md ${className}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-5"
        >
          {loaderGraphic}
          {loaderText}
        </motion.div>
      </div>
    );
  }

  // Card variant (for inside widgets or charts)
  if (variant === "card") {
    return (
      <div className={`w-full min-h-[220px] bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6 flex flex-col items-center justify-center gap-4 ${className}`}>
        {loaderGraphic}
        {loaderText}
      </div>
    );
  }

  // Default "module" variant (occupies module view while loading)
  return (
    <div
      className={`w-full min-h-[60vh] md:min-h-[70vh] flex flex-col items-center justify-center py-16 px-4 gap-4 select-none ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`${title} ${description}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        {loaderGraphic}
        {loaderText}
      </motion.div>
    </div>
  );
}

export default ModuleLoader;
