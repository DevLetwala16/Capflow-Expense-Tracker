"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator as CalcIcon,
  X,
  Maximize2,
  Minimize2,
  Minus,
  Copy,
  Check,
  History,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { safeEvaluate } from "@/lib/splitter/calculatorEngine";

export interface FloatingCalculatorProps {
  open: boolean;
  onClose: () => void;
  onApply?: (amount: number) => void;
  initialValue?: number | string;
  currency?: string;
}

interface CalculationHistoryItem {
  id: string;
  expression: string;
  result: number;
  timestamp: string;
}

export function FloatingCalculator({
  open,
  onClose,
  onApply,
  initialValue,
  currency = "INR",
}: FloatingCalculatorProps) {
  // Mode: "floating" | "fullscreen" | "minimized"
  const [mode, setMode] = useState<"floating" | "fullscreen" | "minimized">("floating");

  // State
  const [expression, setExpression] = useState("");
  const [topEquation, setTopEquation] = useState("");
  const [isCalculated, setIsCalculated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize display when opened with initialValue
  useEffect(() => {
    if (open) {
      const initNum =
        typeof initialValue === "number" ? initialValue : parseFloat(initialValue || "0");
      if (!isNaN(initNum) && initNum > 0) {
        setExpression(initNum.toString());
      } else {
        setExpression("");
      }
      setTopEquation("");
      setIsCalculated(false);
      setCopied(false);
      setApplied(false);
      setMode("floating");
      setShowHistory(false);
    }
  }, [open, initialValue]);

  // Computed display value:
  // Dynamically computes result from expression in real-time
  const display = useMemo(() => {
    if (!expression) return "0";

    const trimmed = expression.trim();
    // If it's a single number without any operators (e.g. "150", "150.", "0.5")
    if (!/[+\-×÷*/%]/.test(trimmed)) {
      return trimmed || "0";
    }

    // Contains operators -> dynamically calculate result
    const evalRes = safeEvaluate(trimmed);
    if (evalRes.success && evalRes.result !== undefined) {
      return evalRes.result.toString();
    }
    return evalRes.error || "Error";
  }, [expression]);

  // Handle digit or decimal
  const handleDigit = useCallback(
    (char: string) => {
      setCopied(false);

      if (isCalculated) {
        setTopEquation("");
        setIsCalculated(false);
        if (char === ".") {
          setExpression("0.");
        } else {
          setExpression(char === "00" ? "0" : char);
        }
        return;
      }

      // Check decimal rules: don't allow two decimals in the current operand
      if (char === ".") {
        const parts = expression.split(/[+\-×÷*/%() ]/);
        const lastPart = parts[parts.length - 1] || "";
        if (lastPart.includes(".")) return; // Prevent double decimals
        if (!lastPart) {
          // If operand is empty, type "0."
          setExpression((prev) => prev + "0.");
          return;
        }
      }

      // Double zero handling
      if (char === "00") {
        const parts = expression.split(/[+\-×÷*/%() ]/);
        const lastPart = parts[parts.length - 1] || "";
        if (!lastPart || lastPart === "0") return;
      }

      // If expression is currently single "0" and user types another digit (not ".")
      if (expression === "0" && char !== ".") {
        setExpression(char);
        return;
      }

      setExpression((prev) => prev + char);
    },
    [expression, isCalculated]
  );

  // Handle Operator (+, -, ×, ÷)
  const handleOperator = useCallback(
    (op: string) => {
      setCopied(false);
      setTopEquation("");

      // If just finished a calculation (= was pressed)
      if (isCalculated) {
        setIsCalculated(false);
        setExpression(`${display} ${op} `);
        return;
      }

      if (!expression) {
        if (op === "-") {
          setExpression("-");
        } else if (display && display !== "0" && display !== "Error") {
          setExpression(`${display} ${op} `);
        }
        return;
      }

      const trimmed = expression.trim();
      // If trailing character is already an operator, replace it
      if (/[+\-×÷*/]$/.test(trimmed)) {
        setExpression(trimmed.slice(0, -1).trim() + " " + op + " ");
        return;
      }

      // If expression already has completed operations (e.g. "150 + 40")
      // Evaluate current total and roll forward into "190 + "
      if (/[+\-×÷*/%]/.test(trimmed)) {
        const evalRes = safeEvaluate(trimmed);
        if (evalRes.success && evalRes.result !== undefined) {
          const valStr = evalRes.result.toString();
          setExpression(`${valStr} ${op} `);
          return;
        }
      }

      setExpression(trimmed + " " + op + " ");
    },
    [expression, display, isCalculated]
  );

  // Handle Percentage
  const handlePercent = useCallback(() => {
    setCopied(false);
    setTopEquation("");
    setIsCalculated(false);
    if (!expression) return;
    const trimmed = expression.trim();
    if (/[+\-×÷*/]$/.test(trimmed)) return;
    setExpression(trimmed + "%");
  }, [expression]);

  // Handle Toggle Sign (+/-)
  const handleToggleSign = useCallback(() => {
    setCopied(false);
    if (!expression) return;

    if (isCalculated) {
      const num = parseFloat(display) || 0;
      const toggled = (-num).toString();
      setExpression(toggled);
      return;
    }

    // Toggle sign on last number token
    const match = expression.match(/(-?\d+(?:\.\d+)?)$/);
    if (match) {
      const lastNum = match[1];
      let toggled: string;
      if (lastNum.startsWith("-")) {
        toggled = lastNum.substring(1);
      } else {
        toggled = "-" + lastNum;
      }
      const newExpr = expression.slice(0, expression.length - lastNum.length) + toggled;
      setExpression(newExpr);
    }
  }, [expression, display, isCalculated]);

  // Handle Parentheses
  const handleParentheses = useCallback(() => {
    setCopied(false);
    setTopEquation("");
    if (isCalculated) {
      setIsCalculated(false);
      setExpression("(");
      return;
    }

    const openParens = (expression.match(/\(/g) || []).length;
    const closeParens = (expression.match(/\)/g) || []).length;

    const lastChar = expression.trim().slice(-1);
    if (openParens > closeParens && /[\d.)%]/.test(lastChar)) {
      setExpression((prev) => prev + ")");
    } else {
      const needsMultiply = /[\d)%]$/.test(lastChar);
      setExpression((prev) => prev + (needsMultiply ? " × (" : "("));
    }
  }, [expression, isCalculated]);

  // Handle Clear / All Clear
  const handleAllClear = useCallback(() => {
    setExpression("");
    setTopEquation("");
    setIsCalculated(false);
    setCopied(false);
  }, []);

  // Backspace
  const handleBackspace = useCallback(() => {
    setCopied(false);
    if (isCalculated) {
      handleAllClear();
      return;
    }
    if (!expression) return;

    let next = expression.trimEnd();
    if (/[+\-×÷*/]$/.test(next)) {
      next = next.slice(0, -1).trimEnd();
    } else {
      next = next.slice(0, -1);
    }

    setExpression(next);
  }, [expression, isCalculated, handleAllClear]);

  // Evaluate (=)
  const handleEvaluate = useCallback(() => {
    if (!expression) return;
    const trimmed = expression.trim();
    if (/[+\-×÷*/]$/.test(trimmed)) return; // Trailing operator, wait for operand

    const evalResult = safeEvaluate(trimmed);
    if (evalResult.success && evalResult.result !== undefined) {
      const finalVal = evalResult.result;
      const formatted = finalVal.toString();

      // Save to history
      setHistory((prev) => [
        {
          id: Math.random().toString(36).substring(2, 9),
          expression: trimmed,
          result: finalVal,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev.slice(0, 19),
      ]);

      setTopEquation(`${trimmed} =`);
      setExpression(formatted);
      setIsCalculated(true);
    }
  }, [expression]);

  // Quick Split shortcuts (e.g. ÷ 2, ÷ 3, ÷ 4, + 5%, + 10%, + 18%)
  const handleQuickPreset = useCallback(
    (action: "div2" | "div3" | "div4" | "plus5" | "plus10" | "plus18") => {
      let currentVal = parseFloat(display) || 0;

      let nextEq = "";
      let nextRes = 0;

      if (action === "div2") {
        nextEq = `${currentVal} ÷ 2 =`;
        nextRes = Math.round((currentVal / 2) * 100) / 100;
      } else if (action === "div3") {
        nextEq = `${currentVal} ÷ 3 =`;
        nextRes = Math.round((currentVal / 3) * 100) / 100;
      } else if (action === "div4") {
        nextEq = `${currentVal} ÷ 4 =`;
        nextRes = Math.round((currentVal / 4) * 100) / 100;
      } else if (action === "plus5") {
        nextEq = `${currentVal} + 5% =`;
        nextRes = Math.round((currentVal * 1.05) * 100) / 100;
      } else if (action === "plus10") {
        nextEq = `${currentVal} + 10% =`;
        nextRes = Math.round((currentVal * 1.1) * 100) / 100;
      } else if (action === "plus18") {
        nextEq = `${currentVal} + 18% =`;
        nextRes = Math.round((currentVal * 1.18) * 100) / 100;
      }

      setTopEquation(nextEq);
      setExpression(nextRes.toString());
      setIsCalculated(true);
    },
    [display]
  );

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (display === "Error" || display === "Divide by zero") return;
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [display]);

  // Apply to expense amount & close
  const handleApply = useCallback(() => {
    const num = parseFloat(display);
    const finalAmount = isNaN(num) || num <= 0 ? 0 : Math.round(num * 100) / 100;

    setApplied(true);
    if (onApply) {
      onApply(finalAmount);
    }
    setTimeout(() => {
      setApplied(false);
      onClose();
    }, 250);
  }, [display, onApply, onClose]);

  // Physical keyboard listener
  useEffect(() => {
    if (!open || mode === "minimized") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an active input elsewhere
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        !containerRef.current?.contains(target)
      ) {
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === ".") {
        e.preventDefault();
        handleDigit(".");
      } else if (e.key === "+" || e.key === "-") {
        e.preventDefault();
        handleOperator(e.key);
      } else if (e.key === "*") {
        e.preventDefault();
        handleOperator("×");
      } else if (e.key === "/") {
        e.preventDefault();
        handleOperator("÷");
      } else if (e.key === "%") {
        e.preventDefault();
        handlePercent();
      } else if (e.key === "(" || e.key === ")") {
        e.preventDefault();
        handleParentheses();
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleAllClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    open,
    mode,
    handleDigit,
    handleOperator,
    handlePercent,
    handleParentheses,
    handleEvaluate,
    handleBackspace,
    handleAllClear,
    onClose,
  ]);

  if (!open) return null;

  // Minimized pill mode
  if (mode === "minimized") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed bottom-6 right-6 z-[160] flex items-center gap-2.5 p-2 pr-3.5 bg-[var(--bg-card)]/95 backdrop-blur-md border border-[#6366F1]/40 rounded-full shadow-2xl shadow-[#6366F1]/20 cursor-pointer select-none"
          onClick={() => setMode("floating")}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white flex items-center justify-center shadow-md">
            <CalcIcon size={16} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Calculator
            </span>
            <span className="text-xs font-extrabold text-[#10B981] truncate max-w-[120px]">
              {currency} {display}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-full text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors ml-1"
          >
            <X size={14} />
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Fullscreen vs Floating container styling
  const isFullScreen = mode === "fullscreen";

  return (
    <AnimatePresence>
      <div
        className={
          isFullScreen
            ? "fixed inset-0 z-[160] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
            : "fixed inset-0 sm:inset-auto sm:right-6 sm:bottom-6 sm:top-auto sm:left-auto z-[150] flex items-end sm:items-start justify-center pointer-events-none p-3 sm:p-0"
        }
      >
        {/* Backdrop for full screen */}
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            onClick={() => setMode("floating")}
          />
        )}

        {/* Main Calculator Window */}
        <motion.div
          ref={containerRef}
          drag={!isFullScreen}
          dragConstraints={{ left: -300, right: 300, top: -400, bottom: 100 }}
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className={`pointer-events-auto flex flex-col bg-[var(--bg-card)]/95 backdrop-blur-xl border border-[var(--border-color)] shadow-2xl rounded-3xl overflow-hidden select-none ${
            isFullScreen
              ? "relative w-full max-w-[480px] h-auto max-h-[92vh] z-10"
              : "w-full max-w-[360px] max-h-[88vh] z-10"
          }`}
          style={{
            boxShadow:
              "0 20px 40px -15px rgba(99, 102, 241, 0.2), 0 0 0 1px var(--border-color)",
          }}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/70 ${
              !isFullScreen ? "cursor-grab active:cursor-grabbing" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white flex items-center justify-center shadow-sm">
                <CalcIcon size={14} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Expense Calculator
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                  {isFullScreen ? "Full Screen Mode" : "Drag to move anywhere"}
                </span>
              </div>
            </div>

            {/* Header Action Icons */}
            <div className="flex items-center gap-1">
              {/* History Toggle */}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                title="Calculation History"
                className={`p-1.5 rounded-lg transition-colors ${
                  showHistory
                    ? "bg-[#6366F1]/15 text-[#6366F1]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
                }`}
              >
                <History size={14} />
              </button>

              {/* Minimize to Pill (only in floating) */}
              {!isFullScreen && (
                <button
                  type="button"
                  onClick={() => setMode("minimized")}
                  title="Minimize to Floating Bubble"
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
                >
                  <Minus size={14} />
                </button>
              )}

              {/* Toggle Full Screen */}
              <button
                type="button"
                onClick={() => setMode(isFullScreen ? "floating" : "fullscreen")}
                title={isFullScreen ? "Exit Fullscreen" : "Full Screen Calculator"}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
              >
                {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                title="Close Calculator"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors ml-1"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* History Drawer */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-4 py-2.5 max-h-48 overflow-y-auto"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-color)]/50 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Recent Calculations
                  </span>
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setHistory([])}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <p className="text-xs text-[var(--text-secondary)] text-center py-3">
                    No history yet
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setTopEquation(`${item.expression} =`);
                          setExpression(item.result.toString());
                          setIsCalculated(true);
                          setShowHistory(false);
                        }}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] cursor-pointer text-xs transition-colors"
                      >
                        <span className="text-[var(--text-secondary)] truncate max-w-[170px] font-mono">
                          {item.expression}
                        </span>
                        <div className="flex items-center gap-1 font-bold text-[#10B981] font-mono">
                          <span>= {item.result}</span>
                          <ArrowUpRight size={12} className="opacity-40" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Display Screen */}
          <div className="p-4 bg-[var(--bg-primary)]/90 border-b border-[var(--border-color)] flex flex-col items-end justify-end min-h-[96px] relative">
            {/* Expression / Formula */}
            <div className="w-full text-right text-xs font-mono text-[var(--text-secondary)] truncate mb-1 min-h-[18px] tracking-wide select-none">
              {topEquation || expression || " "}
            </div>

            {/* Main Result Number */}
            <div className="flex items-baseline gap-1.5 w-full justify-end">
              <span className="text-xs font-bold text-[var(--text-secondary)] select-none">
                {currency}
              </span>
              <span
                className={`font-black font-mono tracking-tight transition-all truncate text-right ${
                  display.length > 12
                    ? "text-xl sm:text-2xl"
                    : display.length > 8
                    ? "text-2xl sm:text-3xl"
                    : isFullScreen
                    ? "text-4xl sm:text-5xl"
                    : "text-3xl"
                } ${display === "Error" || display === "Divide by zero" ? "text-red-500" : "text-[var(--text-primary)]"}`}
              >
                {display}
              </span>
            </div>
          </div>

          {/* Quick Expense Presets (Tip / Split in parts) */}
          <div className="grid grid-cols-6 gap-1 px-3 py-2 bg-[var(--bg-card)] border-b border-[var(--border-color)] text-[10px] font-bold">
            <button
              type="button"
              onClick={() => handleQuickPreset("div2")}
              className="py-1 px-1 rounded-lg bg-[var(--bg-primary)] hover:bg-[#6366F1]/10 hover:text-[#6366F1] text-[var(--text-secondary)] text-center transition-colors border border-[var(--border-color)]/60"
              title="Split evenly between 2 people"
            >
              ÷2
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset("div3")}
              className="py-1 px-1 rounded-lg bg-[var(--bg-primary)] hover:bg-[#6366F1]/10 hover:text-[#6366F1] text-[var(--text-secondary)] text-center transition-colors border border-[var(--border-color)]/60"
              title="Split evenly between 3 people"
            >
              ÷3
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset("div4")}
              className="py-1 px-1 rounded-lg bg-[var(--bg-primary)] hover:bg-[#6366F1]/10 hover:text-[#6366F1] text-[var(--text-secondary)] text-center transition-colors border border-[var(--border-color)]/60"
              title="Split evenly between 4 people"
            >
              ÷4
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset("plus5")}
              className="py-1 px-1 rounded-lg bg-[var(--bg-primary)] hover:bg-[#10B981]/10 hover:text-[#10B981] text-[var(--text-secondary)] text-center transition-colors border border-[var(--border-color)]/60"
              title="Add 5% Tip/Tax"
            >
              +5%
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset("plus10")}
              className="py-1 px-1 rounded-lg bg-[var(--bg-primary)] hover:bg-[#10B981]/10 hover:text-[#10B981] text-[var(--text-secondary)] text-center transition-colors border border-[var(--border-color)]/60"
              title="Add 10% Tip/Tax"
            >
              +10%
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset("plus18")}
              className="py-1 px-1 rounded-lg bg-[var(--bg-primary)] hover:bg-[#10B981]/10 hover:text-[#10B981] text-[var(--text-secondary)] text-center transition-colors border border-[var(--border-color)]/60"
              title="Add 18% GST"
            >
              +18%
            </button>
          </div>

          {/* Keypad Grid */}
          <div
            className={`p-3 grid grid-cols-4 gap-2 bg-[var(--bg-card)] ${
              isFullScreen ? "p-5 gap-3" : ""
            }`}
          >
            {/* Row 1 */}
            <button
              type="button"
              onClick={handleAllClear}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center ${
                isFullScreen ? "h-14 text-base" : "h-11 text-xs"
              }`}
            >
              AC
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-secondary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/40 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-base" : "h-11 text-xs"
              }`}
              title="Backspace"
            >
              ⌫
            </button>
            <button
              type="button"
              onClick={handlePercent}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[#6366F1] bg-[#6366F1]/10 hover:bg-[#6366F1]/20 border border-[#6366F1]/20 flex items-center justify-center ${
                isFullScreen ? "h-14 text-base" : "h-11 text-sm"
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => handleOperator("÷")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-white bg-[#6366F1] hover:bg-[#4F46E5] shadow-sm shadow-[#6366F1]/30 flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-lg"
              }`}
            >
              ÷
            </button>

            {/* Row 2 */}
            <button
              type="button"
              onClick={() => handleDigit("7")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-primary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-sm"
              }`}
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleDigit("8")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-primary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-sm"
              }`}
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleDigit("9")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-primary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-sm"
              }`}
            >
              9
            </button>
            <button
              type="button"
              onClick={() => handleOperator("×")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-white bg-[#6366F1] hover:bg-[#4F46E5] shadow-sm shadow-[#6366F1]/30 flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-lg"
              }`}
            >
              ×
            </button>

            {/* Row 3 */}
            <button
              type="button"
              onClick={() => handleDigit("4")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-primary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-sm"
              }`}
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleDigit("5")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-primary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-sm"
              }`}
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleDigit("6")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-primary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-sm"
              }`}
            >
              6
            </button>
            <button
              type="button"
              onClick={() => handleOperator("-")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-white bg-[#6366F1] hover:bg-[#4F46E5] shadow-sm shadow-[#6366F1]/30 flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-lg"
              }`}
            >
              −
            </button>

            {/* Row 4 */}
            <button
              type="button"
              onClick={() => handleDigit("1")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-primary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-sm"
              }`}
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleDigit("2")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-primary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-sm"
              }`}
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleDigit("3")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-primary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-sm"
              }`}
            >
              3
            </button>
            <button
              type="button"
              onClick={() => handleOperator("+")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-white bg-[#6366F1] hover:bg-[#4F46E5] shadow-sm shadow-[#6366F1]/30 flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-lg"
              }`}
            >
              +
            </button>

            {/* Row 5 */}
            <button
              type="button"
              onClick={handleToggleSign}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-secondary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-base" : "h-11 text-xs"
              }`}
              title="Positive/Negative"
            >
              ±
            </button>
            <button
              type="button"
              onClick={() => handleDigit("0")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-primary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-sm"
              }`}
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleDigit(".")}
              className={`rounded-2xl font-bold transition-all active:scale-95 text-[var(--text-primary)] bg-[var(--bg-primary)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center justify-center ${
                isFullScreen ? "h-14 text-xl" : "h-11 text-base"
              }`}
            >
              .
            </button>
            <button
              type="button"
              onClick={handleEvaluate}
              className={`rounded-2xl font-extrabold transition-all active:scale-95 text-white bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] shadow-md shadow-[#10B981]/30 flex items-center justify-center ${
                isFullScreen ? "h-14 text-2xl" : "h-11 text-xl"
              }`}
            >
              =
            </button>
          </div>

          {/* Action Footer: Copy & Apply Direct Options */}
          <div className="p-3 bg-[var(--bg-primary)]/80 border-t border-[var(--border-color)] flex items-center gap-2">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--border-color)]/30 active:scale-98 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-[#10B981]" />
                  <span className="text-[#10B981]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="text-[var(--text-secondary)]" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Apply Directly to Amount & Close Button */}
            {onApply && (
              <button
                type="button"
                onClick={handleApply}
                disabled={applied || display === "Error" || display === "Divide by zero"}
                className="flex-[2] flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] text-white text-xs font-bold shadow-md shadow-[#6366F1]/30 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {applied ? (
                  <>
                    <Check size={15} className="animate-bounce" />
                    <span>Applied to Amount!</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>
                      Apply {currency} {display}
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Close Button if no apply */}
            {!onApply && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--border-color)]/30 transition-all cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
