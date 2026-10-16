"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Database,
  Camera,
  Share2,
  Trash2,
  Mail,
  MessageCircle,
  EyeOff,
  Server,
  FileCheck,
} from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  const sections = [
    {
      icon: Database,
      iconColor: "text-[#10B981]",
      iconBg: "bg-[#10B981]/10",
      title: "1. 100% Local-First Storage Architecture",
      content: (
        <>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            At CapFlow, your privacy is not an afterthought—it is the core foundation of our architecture.
            All your financial data, including transaction amounts, expense categories, income streams,
            bank account names, credit card details, budget limits, and EMI debt schedules, is stored{" "}
            <strong className="text-[var(--text-primary)]">exclusively on your local device</strong> via
            browser-level IndexedDB (managed by Dexie.js).
          </p>
          <div className="mt-2.5 p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
            <p className="text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1.5">
              <EyeOff size={13} className="text-[#10B981]" />
              Zero Financial Uploads
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-normal">
              Softcapphyjas Pvt. Ltd. never maintains a remote database of your personal ledger. We cannot
              view, index, inspect, monetize, or sell your financial history under any circumstance.
            </p>
          </div>
        </>
      ),
    },
    {
      icon: Share2,
      iconColor: "text-[#6366F1]",
      iconBg: "bg-[#6366F1]/10",
      title: "2. Device-to-Device Migration & Encryption",
      content: (
        <>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            When you initiate a device migration under <strong className="text-[var(--text-primary)]">Settings → Device Transfer</strong>,
            your data payload is protected with end-to-end industry-standard encryption:
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-secondary)] list-disc pl-4">
            <li>
              <strong className="text-[var(--text-primary)]">AES-256-GCM Encryption:</strong> Your financial data is securely encrypted before being transmitted for cross-device synchronization.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">30-Minute Automatic Expiration:</strong> Transfer tokens and encrypted transit payloads are governed by an automated TTL (Time-To-Live) index that permanently purges the record after 30 minutes.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Single-Use Self Destruction:</strong> As soon as the receiving device successfully scans and pulls the data, the record is immediately deleted from transit storage.
            </li>
          </ul>
        </>
      ),
    },
    {
      icon: Camera,
      iconColor: "text-[#F59E0B]",
      iconBg: "bg-[#F59E0B]/10",
      title: "3. Device Permissions & Camera Usage",
      content: (
        <>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            CapFlow requests device camera access solely when you explicitly use the in-app QR scanner to restore or link a second device:
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-secondary)] list-disc pl-4">
            <li>
              <strong className="text-[var(--text-primary)]">In-Memory Analysis:</strong> Camera image frames are evaluated purely in device RAM using standard HTML5 Canvas decoding and are never saved to disk, recorded, or transmitted to any server.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Biometric Authentication:</strong> When App Lock with Biometrics is enabled, validation is handled natively by your device&apos;s OS (Apple Face ID / Touch ID / Android BiometricPrompt). CapFlow never accesses or stores your raw biometric data.
            </li>
          </ul>
        </>
      ),
    },
    {
      icon: Server,
      iconColor: "text-[#EC4899]",
      iconBg: "bg-[#EC4899]/10",
      title: "4. Feedback, Support & Communications",
      content: (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          When you submit an inquiry through our in-app feedback tool or WhatsApp link, Softcapphyjas Pvt. Ltd.
          collects only the details you voluntarily provide (feedback category, message content, and optional contact email/name).
          This data is used solely to troubleshoot reported issues, provide customer support, and improve CapFlow releases.
          We never share support correspondence with third-party marketers.
        </p>
      ),
    },
    {
      icon: Trash2,
      iconColor: "text-[#EF4444]",
      iconBg: "bg-[#EF4444]/10",
      title: "5. Data Ownership, Export & Total Wipeout",
      content: (
        <>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            You retain 100% unencumbered ownership of your financial records. CapFlow gives you full autonomous control over your data:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5">
            <div className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
              <p className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <FileCheck size={13} className="text-[#6366F1]" />
                Portable Exports
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Export all your records at any time in Excel (.xlsx SpreadsheetML), PDF reports, or CSV format.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
              <p className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Trash2 size={13} className="text-[#EF4444]" />
                Permanent Data Wipe
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Wipe all IndexedDB stores with a single click in Settings. Once deleted locally, no copies exist anywhere.
              </p>
            </div>
          </div>
        </>
      ),
    },
    {
      icon: Lock,
      iconColor: "text-[#8B5CF6]",
      iconBg: "bg-[#8B5CF6]/10",
      title: "6. Zero Third-Party Trackers & Ads",
      content: (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          CapFlow does not embed third-party advertising SDKs, behavioral telemetry trackers, Facebook pixels,
          or analytics monitors that harvest your browsing habits or financial transactions. Your financial lifestyle
          remains strictly between you and your device.
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-full bg-[var(--bg-primary)] pb-12">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)] px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={18} className="text-[var(--text-primary)]" />
        </button>
        <div>
          <h1 className="text-base font-bold text-[var(--text-primary)]">Privacy Policy</h1>
          <p className="text-[11px] text-[var(--text-secondary)]">Softcapphyjas Pvt. Ltd.</p>
        </div>
      </header>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
        {/* ── Brand Banner Card ── */}
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
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">CapFlow Privacy Shield</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Governed by Softcapphyjas Pvt. Ltd. · Effective October 2026
            </p>
          </div>
        </motion.div>

        {/* ── Summary Callout ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-3.5 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/25 flex items-start gap-3"
        >
          <ShieldCheck size={20} className="text-[#10B981] flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-[#10B981]">Privacy by Architecture, Not Just by Policy</p>
            <p className="text-[var(--text-secondary)] mt-0.5 leading-relaxed">
              We cannot sell, share, or lose your financial data because we do not collect it. Everything you track in CapFlow stays on your device.
            </p>
          </div>
        </motion.div>

        {/* ── Policy Sections ── */}
        <div className="space-y-3">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + idx * 0.04 }}
                className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 space-y-2.5 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl ${section.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className={section.iconColor} />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{section.title}</h3>
                </div>
                {section.content}
              </motion.div>
            );
          })}
        </div>

        {/* ── Contact & Legal Entity Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 space-y-3"
        >
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Data Protection & Contact Inquiries
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            If you have questions regarding this Privacy Policy or CapFlow&apos;s cryptographic security design, please reach out to our team at Softcapphyjas Pvt. Ltd.:
          </p>
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
              <div className="w-6 h-6 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
                <Mail size={13} className="text-[#6366F1]" />
              </div>
              <span>
                Support Email: <a href="mailto:dev.lethwala@gmail.com" className="font-semibold text-[#6366F1] underline">dev.lethwala@gmail.com</a>
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-[var(--text-primary)]">
              <div className="w-6 h-6 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0">
                <MessageCircle size={13} className="text-[#10B981]" />
              </div>
              <span>
                WhatsApp Support: <a href="https://wa.me/919104212177" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#10B981] underline">+91 9104212177</a>
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <p className="text-center text-[11px] text-[var(--text-secondary)] pt-3">
          CapFlow v1.0.0 · Softcapphyjas Pvt. Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
