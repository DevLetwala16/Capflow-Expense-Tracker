"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Download,
  Filter,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  Terminal,
  Eye,
  X,
  CheckCircle2,
  AlertTriangle,
  User,
  Mail,
  LifeBuoy,
} from "lucide-react";

interface AuditItem {
  id: string;
  action: string;
  adminEmail: string;
  targetType: string;
  targetId: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export default function AdminAuditTrailPage() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Inspector modal
  const [inspectedLog, setInspectedLog] = useState<AuditItem | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        action: actionFilter,
        search: search.trim(),
      });

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const handleExportCSV = () => {
    window.location.href = "/api/admin/audit-logs/export";
  };

  const getHumanActionInfo = (action: string) => {
    switch (action) {
      case "USER_DELETED":
        return {
          title: "Deleted User Account",
          badgeColor: "bg-red-500/15 text-red-500 border-red-500/20",
          description: "An administrator permanently purged a user account from the system.",
        };
      case "EMAIL_DISPATCHED":
        return {
          title: "Sent Custom Email",
          badgeColor: "bg-[#6366F1]/15 text-[#6366F1] border-[#6366F1]/20",
          description: "An official custom outreach email was dispatched to a customer.",
        };
      case "TICKET_STATUS_UPDATED":
        return {
          title: "Updated Ticket Status",
          badgeColor: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/20",
          description: "The status or priority of a customer support inquiry was modified.",
        };
      case "TICKET_REPLIED":
        return {
          title: "Replied to Support Ticket",
          badgeColor: "bg-blue-500/15 text-blue-500 border-blue-500/20",
          description: "An administrative response was emailed to a customer support thread.",
        };
      case "ADMIN_LOGIN":
        return {
          title: "Admin Signed In",
          badgeColor: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/20",
          description: "The administrator successfully authenticated using Master OTP bypass.",
        };
      case "ADMIN_LOGOUT":
        return {
          title: "Admin Signed Out",
          badgeColor: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
          description: "The administrator explicitly logged out and destroyed their session.",
        };
      default:
        return {
          title: action.replace(/_/g, " "),
          badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/20",
          description: "Administrative action executed on the platform.",
        };
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Administrative Activity Log
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-bold">
              Tamper-Evident Ledger
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Track all administrative actions, account deletions, custom emails, logins, and status updates for auditing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] shadow-sm transition-all"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#6366F1]" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Download CSV Report</span>
          </button>
        </div>
      </div>

      {/* ── Filters Toolbar ───────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search by admin email, target ID, or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#6366F1] transition-colors"
          />
        </div>

        {/* Action Type Filters */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <span className="text-xs text-[var(--text-secondary)] font-medium">Filter Action:</span>
          {(["all", "USER_DELETED", "EMAIL_DISPATCHED", "TICKET_STATUS_UPDATED", "ADMIN_LOGIN"] as const).map((act) => (
            <button
              key={act}
              onClick={() => {
                setActionFilter(act);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                actionFilter === act
                  ? "bg-[#6366F1] text-white"
                  : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {act === "all"
                ? "All Events"
                : act === "USER_DELETED"
                ? "User Deletions"
                : act === "EMAIL_DISPATCHED"
                ? "Emails Sent"
                : act === "TICKET_STATUS_UPDATED"
                ? "Ticket Updates"
                : "Admin Logins"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Audit Table ───────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-card-hover)] border-b border-[var(--border-color)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-5">Date & Time</th>
                <th className="py-3.5 px-4">Action Performed</th>
                <th className="py-3.5 px-4">Administrator</th>
                <th className="py-3.5 px-4">Affected Account / Subject</th>
                <th className="py-3.5 px-4">Client IP</th>
                <th className="py-3.5 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-secondary)]">
                    <Loader2 size={24} className="animate-spin text-[#6366F1] mx-auto mb-2" />
                    <span>Loading audit ledger...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-secondary)]">
                    No activity logs found matching the filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const meta = getHumanActionInfo(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-[var(--bg-card-hover)]/50 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-5 font-mono text-[11px] text-[var(--text-primary)]">
                        {new Date(log.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      {/* Action Type with readable badge */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.badgeColor}`}>
                          {meta.title}
                        </span>
                      </td>

                      {/* Admin Identity */}
                      <td className="py-3.5 px-4 font-mono text-[var(--text-primary)]">
                        {log.adminEmail}
                      </td>

                      {/* Target Account */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {log.details?.recipientEmail ||
                            log.details?.deletedUserEmail ||
                            (log.details?.ticketId ? `Ticket #${log.details.ticketId}` : log.targetType)}
                        </div>
                        {log.details?.deletedUserName && (
                          <div className="text-[11px] text-[var(--text-secondary)]">
                            Name: {log.details.deletedUserName}
                          </div>
                        )}
                        {log.details?.subject && (
                          <div className="text-[11px] text-[var(--text-secondary)] truncate max-w-xs">
                            Subject: {log.details.subject}
                          </div>
                        )}
                      </td>

                      {/* Client IP */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-secondary)]">
                        {log.ipAddress}
                      </td>

                      {/* View Details */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setInspectedLog(log)}
                          className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-card-hover)] hover:bg-[#6366F1]/10 text-[var(--text-primary)] hover:text-[#6366F1] transition-all text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ─────────────────────────────────────────── */}
        <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div>
            Showing Page <strong className="text-[var(--text-primary)]">{page}</strong> of <strong className="text-[var(--text-primary)]">{totalPages}</strong> ({totalCount} entries)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-[var(--bg-card-hover)] hover:bg-[var(--border-color)] disabled:opacity-30 disabled:pointer-events-none text-[var(--text-primary)]"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-[var(--bg-card-hover)] hover:bg-[var(--border-color)] disabled:opacity-30 disabled:pointer-events-none text-[var(--text-primary)]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Human-Readable Event Inspector Modal (NO RAW JSON) ─────────── */}
      {inspectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#6366F1]/15 text-[#6366F1] flex items-center justify-center font-bold">
                  <FileText size={17} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Audit Event Details
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Recorded in company security ledger
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectedLog(null)}
                className="p-1.5 rounded-xl bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Event Content Cards */}
            <div className="mt-4 space-y-4 text-xs">
              {/* Event Summary Card */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
                <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">
                  Action Executed
                </div>
                <div className="text-sm font-extrabold text-[var(--text-primary)] mt-1 flex items-center gap-2">
                  <span>{getHumanActionInfo(inspectedLog.action).title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getHumanActionInfo(inspectedLog.action).badgeColor}`}>
                    {inspectedLog.targetType}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {getHumanActionInfo(inspectedLog.action).description}
                </p>
              </div>

              {/* Action Information Fields */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] space-y-2.5">
                <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mb-1">
                  Event Data Summary
                </div>

                {inspectedLog.details?.deletedUserEmail && (
                  <div className="flex justify-between items-center py-1 border-b border-[var(--border-color)]">
                    <span className="text-[var(--text-secondary)]">Deleted Account:</span>
                    <strong className="text-red-500 font-mono">{inspectedLog.details.deletedUserEmail}</strong>
                  </div>
                )}

                {inspectedLog.details?.deletedUserName && (
                  <div className="flex justify-between items-center py-1 border-b border-[var(--border-color)]">
                    <span className="text-[var(--text-secondary)]">User's Full Name:</span>
                    <strong className="text-[var(--text-primary)]">{inspectedLog.details.deletedUserName}</strong>
                  </div>
                )}

                {inspectedLog.details?.recipientEmail && (
                  <div className="flex justify-between items-center py-1 border-b border-[var(--border-color)]">
                    <span className="text-[var(--text-secondary)]">Email Recipient:</span>
                    <strong className="text-[var(--text-primary)] font-mono">{inspectedLog.details.recipientEmail}</strong>
                  </div>
                )}

                {inspectedLog.details?.subject && (
                  <div className="flex justify-between items-center py-1 border-b border-[var(--border-color)]">
                    <span className="text-[var(--text-secondary)]">Email Subject:</span>
                    <span className="text-[var(--text-primary)] font-semibold">{inspectedLog.details.subject}</span>
                  </div>
                )}

                {inspectedLog.details?.ticketId && (
                  <div className="flex justify-between items-center py-1 border-b border-[var(--border-color)]">
                    <span className="text-[var(--text-secondary)]">Ticket Reference:</span>
                    <strong className="text-[#6366F1] font-mono">#{inspectedLog.details.ticketId}</strong>
                  </div>
                )}

                {inspectedLog.details?.newStatus && (
                  <div className="flex justify-between items-center py-1 border-b border-[var(--border-color)]">
                    <span className="text-[var(--text-secondary)]">Status Changed To:</span>
                    <strong className="text-[#10B981] uppercase font-bold">{inspectedLog.details.newStatus}</strong>
                  </div>
                )}

                {inspectedLog.details?.method && (
                  <div className="flex justify-between items-center py-1 border-b border-[var(--border-color)]">
                    <span className="text-[var(--text-secondary)]">Login Method:</span>
                    <strong className="text-[var(--text-primary)]">{inspectedLog.details.method}</strong>
                  </div>
                )}

                <div className="flex justify-between items-center py-1">
                  <span className="text-[var(--text-secondary)]">Executing Admin:</span>
                  <span className="font-mono text-[var(--text-primary)] font-semibold">{inspectedLog.adminEmail}</span>
                </div>
              </div>

              {/* Timestamp & IP Card */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Recorded At</span>
                  <div className="text-[var(--text-primary)] font-semibold mt-0.5">
                    {new Date(inspectedLog.createdAt).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Client IP Address</span>
                  <div className="font-mono text-[var(--text-primary)] font-semibold mt-0.5">
                    {inspectedLog.ipAddress}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
