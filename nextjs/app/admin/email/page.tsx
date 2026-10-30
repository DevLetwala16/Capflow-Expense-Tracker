"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Edit3,
  Phone,
  User,
  X,
} from "lucide-react";

interface RecipientOption {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
}

const EMAIL_TEMPLATES = [
  {
    name: "System Security & Update",
    subject: "Important Account Notice from CapFlow Administration",
    body: `Hello,

We are writing to inform you that your CapFlow account features and shared financial tools have been updated.

All your financial data remains secure on your device under strict privacy protocols.

If you have any questions or require assistance with your split sessions or payment settings, please reply directly to this email.

Best regards,
**CapFlow Administration Team**`,
  },
  {
    name: "Support Follow-up",
    subject: "Update on your CapFlow Support Inquiry",
    body: `Hello,

Thank you for contacting CapFlow Support.

Our team has reviewed your inquiry and applied the necessary updates. Please refresh your CapFlow application or open your dashboard to verify that everything looks correct.

If you need any further help, feel free to reply directly to this message.

Best regards,
**Customer Support Team**`,
  },
  {
    name: "Payment & UPI Setup Reminder",
    subject: "Reminder: Set up your UPI & Payment QR code in CapFlow",
    body: `Hello,

We noticed that you are participating in shared Splitter groups.

To ensure your friends and group members can settle payments with you easily via UPI, please remember to add your **UPI ID** or upload your **Payment QR code** under Settings > Profile in your CapFlow app.

Thank you for using CapFlow!

Best regards,
**Team CapFlow**`,
  },
];

export default function AdminEmailDispatcherPage() {
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientList, setRecipientList] = useState<RecipientOption[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientOption | null>(null);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Search recipients on input
  useEffect(() => {
    const fetchRecipients = async () => {
      try {
        const res = await fetch(`/api/admin/email/recipients?query=${encodeURIComponent(recipientQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setRecipientList(data.recipients || []);
        }
      } catch (err) {
        console.error("Failed to search recipients:", err);
      }
    };

    const debounce = setTimeout(fetchRecipients, 250);
    return () => clearTimeout(debounce);
  }, [recipientQuery]);

  const applyTemplate = (template: typeof EMAIL_TEMPLATES[0]) => {
    setSubject(template.subject);
    setBody(template.body);
    setFeedback(null);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = selectedRecipient ? selectedRecipient.email : recipientQuery.trim();

    if (!targetEmail || !targetEmail.includes("@")) {
      setFeedback({ type: "error", message: "Please enter a valid recipient email address." });
      return;
    }

    if (!subject.trim()) {
      setFeedback({ type: "error", message: "Please provide a subject line." });
      return;
    }

    if (!body.trim()) {
      setFeedback({ type: "error", message: "Email message body cannot be empty." });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: targetEmail,
          recipientName: selectedRecipient?.name || "",
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: `Official email was successfully sent to ${targetEmail}.`,
        });
        setSubject("");
        setBody("");
        setSelectedRecipient(null);
        setRecipientQuery("");
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to dispatch email. Please verify SMTP settings.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Connection error when attempting to send email." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12 max-w-4xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Send Custom Email to User
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-bold">
            SMTP Connected
          </span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Compose and send official company emails to any user. Emails are sent with professional CapFlow formatting.
        </p>
      </div>

      {/* ── Notification Banner ───────────────────────────────────────── */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
              : "bg-red-500/10 border-red-500/30 text-red-500"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-80">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Quick Templates ───────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] mb-2.5">
          <Sparkles size={14} className="text-[#6366F1]" />
          <span>Quick Preset Message Templates:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EMAIL_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyTemplate(tmpl)}
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-card-hover)] hover:bg-[#6366F1]/10 border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer"
            >
              {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Email Composer Card ───────────────────────────────────────── */}
      <form onSubmit={handleSendEmail} className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm flex flex-col gap-4">
        {/* Recipient Selection */}
        <div className="relative">
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
            Recipient User
          </label>
          <input
            type="email"
            value={recipientQuery}
            onChange={(e) => {
              setRecipientQuery(e.target.value);
              setSelectedRecipient(null);
              setShowRecipientDropdown(true);
            }}
            onFocus={() => setShowRecipientDropdown(true)}
            placeholder="Type user's email address or search by name..."
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#6366F1] transition-colors"
          />

          {/* Autocomplete Dropdown */}
          {showRecipientDropdown && recipientList.length > 0 && !selectedRecipient && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-56 overflow-y-auto rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl divide-y divide-[var(--border-color)]">
              {recipientList.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    setSelectedRecipient(user);
                    setRecipientQuery(user.email);
                    setShowRecipientDropdown(false);
                  }}
                  className="p-3 hover:bg-[var(--bg-card-hover)] cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#6366F1]/15 text-[#6366F1] flex items-center justify-center font-bold text-[10px]">
                      {user.name ? user.name[0].toUpperCase() : "U"}
                    </div>
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">{user.name}</div>
                      <div className="text-[11px] text-[var(--text-secondary)] font-mono">{user.email}</div>
                    </div>
                  </div>
                  {user.phone && (
                    <div className="text-[11px] text-[var(--text-secondary)] font-mono flex items-center gap-1">
                      <Phone size={10} />
                      {user.phone}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Selected Recipient Pill */}
          {selectedRecipient && (
            <div className="mt-2.5 p-3 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text-primary)]">{selectedRecipient.name}</span>
                <span className="text-[var(--text-secondary)] font-mono">({selectedRecipient.email})</span>
                {selectedRecipient.phone && (
                  <span className="text-[#6366F1] font-mono text-[11px] ml-1">&bull; {selectedRecipient.phone}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRecipient(null);
                  setRecipientQuery("");
                }}
                className="text-[11px] font-bold text-red-500 hover:underline"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
            Subject Line
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Important Update regarding your CapFlow Account"
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#6366F1] transition-colors"
          />
        </div>

        {/* Body Editor with Write & Preview Tab */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">
              Message Content (Markdown Supported)
            </label>
            <div className="flex items-center gap-1 bg-[var(--bg-card-hover)] p-1 rounded-xl border border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setActiveTab("write")}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === "write" ? "bg-[#6366F1] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Edit3 size={12} />
                <span>Compose</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === "preview" ? "bg-[#6366F1] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Eye size={12} />
                <span>Live Preview</span>
              </button>
            </div>
          </div>

          {activeTab === "write" ? (
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your official message here... Use **bold** for emphasis, or write multiple paragraphs."
              className="w-full p-4 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#6366F1] transition-colors leading-relaxed"
            />
          ) : (
            <div className="p-5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] min-h-[180px] text-xs text-[var(--text-primary)] space-y-3 leading-relaxed">
              <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-bold mb-2">
                Customer Email Preview:
              </div>
              {body ? (
                body.split("\n\n").map((para, idx) => (
                  <p key={idx} className="text-[var(--text-primary)]">
                    {para}
                  </p>
                ))
              ) : (
                <div className="text-[var(--text-secondary)] italic">No message written yet. Switch to Compose to type.</div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
          <div className="text-[11px] text-[var(--text-secondary)]">
            Sender: <strong className="text-[var(--text-primary)]">capflow@softcapphyjas.com</strong>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="px-6 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-95 cursor-pointer"
          >
            {sending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Sending Email...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Send Official Email</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
