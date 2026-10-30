"use client";

import { useState, useEffect } from "react";
import {
  LifeBuoy,
  Search,
  Filter,
  Phone,
  Mail,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
  Shield,
  Tag,
  ArrowRight,
  MessageCircle,
  Inbox,
  Sparkles,
} from "lucide-react";

interface TicketItem {
  id: string;
  ticketId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  subject: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved";
  messageCount: number;
  latestMessage: any;
  lastRepliedBy: "user" | "admin";
  createdAt: string;
  updatedAt: string;
}

export default function AdminSupportCRMPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Ticket Detail / Reply Drawer
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [statusAfterReply, setStatusAfterReply] = useState<"open" | "in_progress" | "resolved">("resolved");
  const [replying, setReplying] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        status: statusFilter,
        priority: priorityFilter,
        search: search.trim(),
      });

      const res = await fetch(`/api/admin/support/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter, priorityFilter]);

  const openTicketDetail = async (ticketId: string) => {
    setActiveTicketId(ticketId);
    setDetailLoading(true);
    setReplyText("");
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveTicket(data.ticket);
        setStatusAfterReply(data.ticket.status === "open" ? "in_progress" : data.ticket.status);
      }
    } catch (err) {
      console.error("Error opening ticket:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchTickets();
        if (activeTicket && activeTicket.id === ticketId) {
          setActiveTicket({ ...activeTicket, status: newStatus });
        }
        setToast({ type: "success", message: `Ticket status updated to ${newStatus.replace("_", " ")}.` });
      }
    } catch {
      setToast({ type: "error", message: "Failed to update ticket status." });
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId) return;

    setReplying(true);
    setToast(null);

    try {
      const res = await fetch(`/api/admin/support/tickets/${activeTicketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: replyText.trim(),
          updateStatusTo: statusAfterReply,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setToast({ type: "success", message: "Official response sent to user's email and recorded in history." });
        setReplyText("");
        setActiveTicket(data.ticket);
        fetchTickets();
      } else {
        setToast({ type: "error", message: data.error || "Failed to send reply." });
      }
    } catch {
      setToast({ type: "error", message: "Network error sending response." });
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Customer Support Inquiries
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-bold">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Real customer support inquiries. Contact users via verified email or WhatsApp and manage case workflow.
          </p>
        </div>

        <button
          onClick={fetchTickets}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-[#6366F1]" : ""} />
          <span>Refresh Inbox</span>
        </button>
      </div>

      {/* ── Toast Notification ────────────────────────────────────────── */}
      {toast && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            toast.type === "success"
              ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
              : "bg-red-500/10 border-red-500/30 text-red-500"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:opacity-80">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Filters & Search Toolbar ──────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search tickets by subject, user, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchTickets()}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#6366F1] transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
          <span className="text-xs text-[var(--text-secondary)] font-medium mr-1">Status:</span>
          {(["all", "open", "in_progress", "resolved"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                statusFilter === s
                  ? "bg-[#6366F1] text-white"
                  : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {s === "all" ? "All Inquiries" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content View ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] py-16 text-center text-[var(--text-secondary)] shadow-sm">
          <Loader2 size={26} className="animate-spin text-[#6366F1] mx-auto mb-2.5" />
          <span className="text-xs font-medium">Checking customer support inbox...</span>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl p-8 bg-[var(--bg-card)] border border-[var(--border-color)] text-center shadow-sm flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center mb-3">
            <Inbox size={26} />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            No Support Inquiries Found
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-1 leading-relaxed">
            There are currently no support requests matching this filter. When users submit an inquiry from the CapFlow app or contact form, it will appear here in real time.
          </p>
        </div>
      ) : (
        <>
          {/* ── Mobile Phone View (Responsive Cards — Visible only on phones < 768px) ── */}
          <div className="flex md:hidden flex-col gap-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm flex flex-col gap-3"
              >
                {/* Header: ID, Category & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#6366F1]">
                      #{ticket.ticketId}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[var(--bg-card-hover)] text-[10px] font-semibold text-[var(--text-secondary)]">
                      {ticket.category}
                    </span>
                  </div>
                  <select
                    value={ticket.status}
                    onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                    className={`text-[10px] font-bold uppercase rounded-lg px-2 py-1 bg-[var(--bg-card-hover)] border border-[var(--border-color)] cursor-pointer focus:outline-none ${
                      ticket.status === "open"
                        ? "text-[#F59E0B]"
                        : ticket.status === "in_progress"
                        ? "text-blue-500"
                        : "text-[#10B981]"
                    }`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                {/* Subject & Preview */}
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                    {ticket.subject}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                    {ticket.latestMessage?.message || "No message body"}
                  </p>
                </div>

                {/* Customer Contact Card */}
                <div className="p-2.5 rounded-xl bg-[var(--bg-card-hover)] text-xs flex flex-col gap-1">
                  <div className="font-bold text-[var(--text-primary)]">{ticket.userName}</div>
                  <div className="text-[11px] text-[var(--text-secondary)] font-mono flex items-center gap-1.5">
                    <Mail size={11} className="shrink-0" />
                    <span className="truncate">{ticket.userEmail}</span>
                  </div>
                  {ticket.userPhone ? (
                    <div className="text-[11px] text-[#10B981] font-mono flex items-center gap-1.5 font-bold">
                      <Phone size={11} className="shrink-0" />
                      <span>{ticket.userPhone}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-[var(--text-secondary)] italic">No phone provided</div>
                  )}
                </div>

                {/* Mobile Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-color)]">
                  {ticket.userPhone && (
                    <a
                      href={`https://wa.me/${ticket.userPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 rounded-xl bg-[#10B981]/15 text-[#10B981] text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  <button
                    onClick={() => openTicketDetail(ticket.id)}
                    className="flex-1 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send size={13} />
                    <span>Reply via Email</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop Table View (Visible on screens >= 768px) ────────── */}
          <div className="hidden md:block rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-card-hover)] border-b border-[var(--border-color)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3.5 px-5">Ticket & Subject</th>
                    <th className="py-3.5 px-4">Customer Contact</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-[var(--bg-card-hover)]/50 transition-colors">
                      {/* Ticket ID & Subject */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-[#6366F1]/15 text-[#6366F1] shrink-0 mt-0.5">
                            <MessageSquare size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-mono text-[11px] text-[#6366F1] font-bold">
                              #{ticket.ticketId}
                            </div>
                            <div className="font-bold text-[var(--text-primary)] truncate max-w-xs mt-0.5">
                              {ticket.subject}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate max-w-xs">
                              {ticket.latestMessage?.message || "No message body"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Customer Contact */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <div className="font-bold text-[var(--text-primary)] truncate">{ticket.userName}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] font-mono flex items-center gap-1.5 mt-0.5">
                            <Mail size={11} className="shrink-0" />
                            <span className="truncate">{ticket.userEmail}</span>
                          </div>
                          {ticket.userPhone ? (
                            <div className="text-[11px] text-[#10B981] font-mono flex items-center gap-1.5 mt-0.5 font-bold">
                              <Phone size={11} className="shrink-0" />
                              <span>{ticket.userPhone}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-[var(--text-secondary)] italic mt-0.5">No phone recorded</div>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[11px] text-[var(--text-primary)] font-medium whitespace-nowrap">
                          {ticket.category}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ticket.priority === "urgent"
                            ? "bg-red-500/15 text-red-500"
                            : ticket.priority === "high"
                            ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                            : "bg-blue-500/15 text-blue-500"
                        }`}>
                          {ticket.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <select
                          value={ticket.status}
                          onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                          className={`text-[11px] font-bold uppercase rounded-lg px-2.5 py-1 bg-[var(--bg-card-hover)] border border-[var(--border-color)] cursor-pointer focus:outline-none ${
                            ticket.status === "open"
                              ? "text-[#F59E0B]"
                              : ticket.status === "in_progress"
                              ? "text-blue-500"
                              : "text-[#10B981]"
                          }`}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ticket.userPhone && (
                            <a
                              href={`https://wa.me/${ticket.userPhone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/25 transition-colors"
                              title="Chat with user on WhatsApp"
                            >
                              <MessageCircle size={15} />
                            </a>
                          )}

                          <button
                            onClick={() => openTicketDetail(ticket.id)}
                            className="px-3 py-1.5 rounded-xl bg-[#6366F1]/10 hover:bg-[#6366F1] text-[#6366F1] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Send size={12} />
                            <span>Reply via Email</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Reply / Case Management Drawer Modal ──────────────────────── */}
      {activeTicketId && activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-start justify-between pb-3.5 border-b border-[var(--border-color)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#6366F1]">
                    #{activeTicket.ticketId}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    activeTicket.status === "open"
                      ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                      : activeTicket.status === "in_progress"
                      ? "bg-blue-500/15 text-blue-500"
                      : "bg-[#10B981]/15 text-[#10B981]"
                  }`}>
                    {activeTicket.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] mt-1">{activeTicket.subject}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                  <span>Customer: <strong className="text-[var(--text-primary)]">{activeTicket.userName}</strong></span>
                  <span>&bull;</span>
                  <span className="font-mono text-[var(--text-primary)] truncate max-w-[180px]">{activeTicket.userEmail}</span>
                  {activeTicket.userPhone && (
                    <>
                      <span>&bull;</span>
                      <span className="font-mono text-[#10B981] font-bold">{activeTicket.userPhone}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveTicketId(null);
                  setActiveTicket(null);
                }}
                className="p-1.5 rounded-xl bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Conversation History */}
            <div className="my-3 flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
              {activeTicket.messages?.map((msg: any, idx: number) => {
                const isAdmin = msg.sender === "admin";
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl text-xs max-w-[90%] sm:max-w-[85%] ${
                      isAdmin
                        ? "ml-auto bg-[#6366F1]/10 border border-[#6366F1]/20 text-[var(--text-primary)]"
                        : "mr-auto bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-primary)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[11px] font-bold">
                      <span className={isAdmin ? "text-[#6366F1]" : "text-[var(--text-secondary)]"}>
                        {isAdmin ? "CapFlow Company Support (You)" : msg.senderName || "User"}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--text-secondary)] font-normal">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                  </div>
                );
              })}
            </div>

            {/* Quick Email Reply Composer */}
            <form onSubmit={handleSendReply} className="pt-3 border-t border-[var(--border-color)] flex flex-col gap-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Mail size={13} className="text-[#6366F1]" />
                  <span>Send Reply via Email to {activeTicket.userEmail}</span>
                </label>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[var(--text-secondary)] text-[11px]">Mark as:</span>
                  <select
                    value={statusAfterReply}
                    onChange={(e: any) => setStatusAfterReply(e.target.value)}
                    className="px-2 py-0.5 rounded-lg bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="resolved">Resolved</option>
                    <option value="in_progress">In Progress</option>
                    <option value="open">Keep Open</option>
                  </select>
                </div>
              </div>

              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response to the customer... It will be emailed directly to them."
                required
                className="w-full p-3 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#6366F1] transition-colors"
              />

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={replying || !replyText.trim()}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
                >
                  {replying ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Sending Reply...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Send Official Response</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
