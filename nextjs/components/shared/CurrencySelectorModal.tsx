"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CURRENCIES, CURRENCY_SYMBOLS } from "@/lib/currency/exchangeRates";

const POPULAR_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "CAD", "JPY"];

interface CurrencySelectorModalProps {
  open: boolean;
  onClose: () => void;
  currentCode: string;
  onSelect: (code: string) => void;
  title?: string;
  subtitle?: string;
}

export function CurrencySelectorModal({
  open,
  onClose,
  currentCode,
  onSelect,
  title = "Select Currency",
  subtitle = "Choose your currency",
}: CurrencySelectorModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [query]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal / Bottom-Sheet Container */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative z-10 w-full md:max-w-md bg-[var(--bg-card)] border-t md:border border-[var(--border-color)] rounded-t-[28px] md:rounded-3xl shadow-2xl flex flex-col max-h-[85dvh] md:max-h-[640px] overflow-hidden"
        >
          {/* Mobile Drag Pill */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1.5 rounded-full bg-[var(--text-secondary)]/30" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)]">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {title}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--bg-primary)] hover:bg-[var(--bg-card-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border-color)] cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search & Popular Chips */}
          <div className="p-4 border-b border-[var(--border-color)] space-y-3 bg-[var(--bg-card)]">
            <div className="relative flex items-center">
              <Search
                size={16}
                className="absolute left-3.5 text-[var(--text-secondary)] pointer-events-none"
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search by code, name, or symbol…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-9 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 transition-all placeholder:text-[var(--text-secondary)]/60 font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Popular Currencies quick-select chips */}
            {!query && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                <span className="text-[11px] font-medium text-[var(--text-secondary)] flex-shrink-0 pr-1">
                  Popular:
                </span>
                {POPULAR_CURRENCIES.map((code) => {
                  const curr = CURRENCIES.find((c) => c.code === code);
                  if (!curr) return null;
                  const isSelected = currentCode.toUpperCase() === curr.code.toUpperCase();
                  return (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => {
                        onSelect(curr.code);
                        onClose();
                      }}
                      className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#6366F1] text-white shadow-sm shadow-indigo-500/25"
                          : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]"
                      }`}
                    >
                      <span className="font-bold">{curr.symbol}</span>
                      <span>{curr.code}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Currency List */}
          <div className="overflow-y-auto flex-1 divide-y divide-[var(--border-color)] p-2">
            {filtered.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] mb-3">
                  <Search size={20} />
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  No currencies found
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Try searching for &quot;USD&quot;, &quot;Euro&quot;, or &quot;₹&quot;
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-4 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6366F1] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filtered.map((currency) => {
                const isSelected = currentCode.toUpperCase() === currency.code.toUpperCase();
                return (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => {
                      onSelect(currency.code);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all my-0.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#6366F1]/10 border border-[#6366F1]/30 text-[#6366F1]"
                        : "hover:bg-[var(--bg-card-hover)] border border-transparent text-[var(--text-primary)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                          isSelected
                            ? "bg-[#6366F1] text-white shadow-sm shadow-indigo-500/25"
                            : "bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {currency.symbol}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm font-bold ${
                              isSelected
                                ? "text-[#6366F1]"
                                : "text-[var(--text-primary)]"
                            }`}
                          >
                            {currency.code}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)] font-normal">
                            ({currency.symbol})
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {currency.name}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#6366F1] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                        <Check size={14} strokeWidth={2.5} />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
