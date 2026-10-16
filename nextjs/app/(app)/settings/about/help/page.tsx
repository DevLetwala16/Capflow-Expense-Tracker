"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  Search,
  MessageCircle,
  ExternalLink,
  Shield,
  Smartphone,
  Wallet,
  FileSpreadsheet,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string;
  category: "General" | "Security" | "Transfer" | "Features";
}

const FAQS: FAQItem[] = [
  {
    category: "General",
    question: "What is CapFlow and who operates it?",
    answer:
      "CapFlow is a privacy-first personal finance application developed, engineered, and maintained by Softcapphyjas Pvt. Ltd. It is designed to help you track expenses, manage category budgets, monitor upcoming EMIs, and understand your financial health without compromising your personal privacy.",
  },
  {
    category: "Security",
    question: "Where is my financial data stored?",
    answer:
      "All your transactions, accounts, category definitions, budget thresholds, and EMI schedules are stored 100% locally on your device using client-side IndexedDB. Softcapphyjas Pvt. Ltd. never uploads your financial ledger to remote servers.",
  },
  {
    category: "Transfer",
    question: "How does the Device-to-Device Transfer work?",
    answer:
      "Under Settings → Device Transfer, you can generate an end-to-end encrypted backup (AES-256-GCM). This creates a temporary 30-minute transfer token. On your second device, simply open CapFlow, navigate to Device Transfer, and point your camera to scan the QR code. Your data will merge locally, and the temporary payload is automatically deleted from MongoDB.",
  },
  {
    category: "Security",
    question: "How does App Lock and Biometric security work?",
    answer:
      "You can configure a 4-digit PIN or enable device Biometrics (Face ID / Fingerprint) from Settings. When enabled, CapFlow locks the screen upon application startup and after your selected idle timeout (Immediate, 1 min, or 5 mins) to prevent unauthorized viewing.",
  },
  {
    category: "Features",
    question: "How do I export my data for tax reporting or spreadsheets?",
    answer:
      "Navigate to Settings → Export & Data Wipe. You can export all your itemized records into formatted Excel (.xlsx XML SpreadsheetML), printable PDF reports, or raw CSV files with date range filters.",
  },
  {
    category: "Features",
    question: "What is Smart Auto-Categorization?",
    answer:
      "You can define merchant keywords (e.g. 'Uber', 'Starbucks', 'Netflix') under Settings → Privacy, Rules & Diagnostics. When you record a new expense, typing any matching keyword in the description will automatically select your chosen category.",
  },
  {
    category: "General",
    question: "How can I contact Softcapphyjas Pvt. Ltd. for support?",
    answer:
      "You can submit feedback directly using our in-app feedback form, email us at dev.lethwala@gmail.com, or chat with our team on WhatsApp at +91 9104212177.",
  },
];

export default function HelpFAQPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const categories = ["All", "General", "Security", "Transfer", "Features"];

  const filteredFAQs = FAQS.filter((faq) => {
    const matchesCategory = activeCategory === "All" || faq.category === activeCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-full bg-[var(--bg-primary)] pb-12">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)] px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={18} className="text-[var(--text-primary)]" />
        </button>
        <div>
          <h1 className="text-base font-bold text-[var(--text-primary)]">Help & FAQ</h1>
          <p className="text-[11px] text-[var(--text-secondary)]">Softcapphyjas Pvt. Ltd.</p>
        </div>
      </header>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
        {/* Brand Banner Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 flex items-center gap-3 shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-1 border border-[var(--border-color)] shadow-sm flex-shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/capflow-logo.png" alt="CapFlow Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">CapFlow Knowledge Base</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Official guides and assistance by Softcapphyjas Pvt. Ltd.
            </p>
          </div>
        </motion.div>

        {/* Search Input */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions or keywords…"
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[#6366F1] transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? "bg-[#6366F1] text-white shadow-sm"
                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-2.5">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-8 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6">
              <HelpCircle size={28} className="mx-auto text-[var(--text-secondary)] opacity-40 mb-2" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">No matching questions found</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Try searching with different terms or check all categories.
              </p>
            </div>
          ) : (
            filteredFAQs.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3"
                  >
                    <span className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                      {faq.question}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-[var(--text-secondary)] flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#6366F1]" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 pb-4 pt-1 text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-color)]">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Quick Contact Card */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 space-y-3 mt-6">
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Still need assistance?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                window.open("https://wa.me/919104212177?text=Hello%20Softcapphyjas%20Support", "_blank");
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 text-xs font-semibold hover:bg-[#10B981]/20 transition-colors"
            >
              <MessageCircle size={14} />
              WhatsApp Help
            </button>
            <button
              onClick={() => router.push("/settings/about")}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/25 text-xs font-semibold hover:bg-[#6366F1]/20 transition-colors"
            >
              <HelpCircle size={14} />
              Feedback Form
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[var(--text-secondary)] pt-4">
          CapFlow v1.0.0 · Softcapphyjas Pvt. Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
