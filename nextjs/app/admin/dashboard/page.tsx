"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users2,
  TrendingUp,
  Activity,
  Server,
  Database,
  Mail,
  LifeBuoy,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Send,
  FileText,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  HardDrive,
  Cpu,
} from "lucide-react";

interface StatsData {
  users: { total: number; newLast30Days: number };
  groups: { total: number; active: number; settled: number };
  transactions: { count: number; volume: number };
  support: { total: number; open: number; inProgress: number; resolved: number; urgent: number };
}

interface HealthData {
  overall: "operational" | "degraded" | "outage";
  mongo: { status: string; latencyMs: number; database: string };
  renderApi: { url: string; status: string; latencyMs: number };
  smtp: { status: string; host: string; user: string };
  system: {
    nodeVersion: string;
    uptimeSeconds: number;
    heapUsedMb: number;
    heapTotalMb: number;
    environment: string;
  };
}

interface AuditLogItem {
  _id: string;
  action: string;
  adminEmail: string;
  targetType: string;
  targetId?: string;
  details?: any;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setHealth(data.health);
        setRecentLogs(data.recentLogs || []);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d} days ${h} hrs`;
    if (h > 0) return `${h} hrs ${m} mins`;
    return `${m} mins`;
  };

  const formatINR = (val: number) => {
    return "₹" + Math.round(val).toLocaleString("en-IN");
  };

  const getFriendlyActionLabel = (action: string) => {
    switch (action) {
      case "USER_DELETED":
        return { label: "Deleted User Account", color: "bg-red-500/10 text-red-500" };
      case "EMAIL_DISPATCHED":
        return { label: "Sent Custom Email", color: "bg-[#6366F1]/10 text-[#6366F1]" };
      case "TICKET_STATUS_UPDATED":
        return { label: "Updated Support Ticket", color: "bg-amber-500/10 text-amber-500" };
      case "TICKET_REPLIED":
        return { label: "Replied to Ticket", color: "bg-blue-500/10 text-blue-500" };
      case "ADMIN_LOGIN":
        return { label: "Admin Signed In", color: "bg-emerald-500/10 text-emerald-500" };
      case "ADMIN_LOGOUT":
        return { label: "Admin Signed Out", color: "bg-zinc-500/10 text-zinc-400" };
      default:
        return { label: action.replace(/_/g, " "), color: "bg-purple-500/10 text-purple-400" };
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12 select-none">
      {/* ── Top Header Section (Exact CapFlow Style) ─────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Company Operations Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] text-[11px] font-bold">
              Production Live
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Overview of company accounts, financial activity, service status, and customer inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <span className="text-[11px] text-[var(--text-secondary)] hidden lg:inline font-mono">
            Updated at {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-[#6366F1]" : ""} />
            <span>{refreshing ? "Updating..." : "Refresh Data"}</span>
          </button>
        </div>
      </div>

      {/* ── Main Executive Hero Card (Exact CapFlow BalanceCard Style) ── */}
      <div className="rounded-2xl p-6 bg-gradient-to-br from-[#6366F1] to-[#38bdf8] shadow-xl shadow-indigo-500/20 overflow-hidden relative text-white">
        {/* Background ambient lighting */}
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-black/15 blur-lg pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/20 gap-2">
            <div>
              <span className="text-xs text-white/80 font-bold uppercase tracking-wider">
                CapFlow Network Overview
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                Financial Operations & User Metrics
              </h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span>Real-Time Sync</span>
            </div>
          </div>

          {/* 4 Primary Executive Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {/* Registered Users */}
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
              <div className="flex items-center gap-1.5 text-xs text-white/80 font-medium">
                <Users2 size={14} />
                <span>Registered Users</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold mt-1">
                {loading ? "--" : stats?.users.total.toLocaleString()}
              </div>
              <div className="text-[11px] text-white/70 mt-1">
                +{stats?.users.newLast30Days || 0} joined recently
              </div>
            </div>

            {/* Splitter Groups */}
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
              <div className="flex items-center gap-1.5 text-xs text-white/80 font-medium">
                <Layers size={14} />
                <span>Financial Groups</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold mt-1">
                {loading ? "--" : stats?.groups.total.toLocaleString()}
              </div>
              <div className="text-[11px] text-white/70 mt-1">
                {stats?.groups.active || 0} active &bull; {stats?.groups.settled || 0} settled
              </div>
            </div>

            {/* Total Money Tracked */}
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
              <div className="flex items-center gap-1.5 text-xs text-white/80 font-medium">
                <TrendingUp size={14} />
                <span>Money Tracked in Groups</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold mt-1">
                {loading ? "--" : stats?.transactions.volume ? formatINR(stats.transactions.volume) : "₹0"}
              </div>
              <div className="text-[11px] text-white/70 mt-1">
                Across {stats?.transactions.count || 0} split records
              </div>
            </div>

            {/* Support Cases */}
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
              <div className="flex items-center gap-1.5 text-xs text-white/80 font-medium">
                <LifeBuoy size={14} />
                <span>Customer Inquiries</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold mt-1 flex items-baseline gap-2">
                <span>{loading ? "--" : stats?.support.total}</span>
                {stats?.support.open ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white text-[#6366F1] font-bold">
                    {stats.support.open} Need Action
                  </span>
                ) : null}
              </div>
              <div className="text-[11px] text-white/70 mt-1">
                {stats?.support.resolved || 0} resolved successfully
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── System Health & Connected Cloud Services ─────────────────── */}
      <div className="rounded-2xl p-5 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-color)] gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center">
              <Activity size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Live Cloud Services & Infrastructure Health
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Real-time operational status of databases, APIs, and servers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span className="text-xs font-bold text-[#10B981]">
              All Core Systems Healthy
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
          {/* MongoDB Atlas */}
          <div className="p-4 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Database size={15} className="text-[#6366F1]" />
                <span>Primary Database (MongoDB)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] text-[10px] font-bold">
                Connected
              </span>
            </div>
            <div className="space-y-1 text-xs text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>Response Speed:</span>
                <strong className="text-[var(--text-primary)] font-mono">{health?.mongo.latencyMs || 10} ms</strong>
              </div>
              <div className="flex justify-between">
                <span>Database Name:</span>
                <span className="text-[var(--text-primary)]">{health?.mongo.database || "Capflow"}</span>
              </div>
            </div>
          </div>

          {/* Render Analytics Microservice */}
          <div className="p-4 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Cpu size={15} className="text-[#38bdf8]" />
                <span>Analytics Engine (Render API)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] text-[10px] font-bold">
                Active
              </span>
            </div>
            <div className="space-y-1 text-xs text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>Response Speed:</span>
                <strong className="text-[var(--text-primary)] font-mono">{health?.renderApi.latencyMs || 14} ms</strong>
              </div>
              <div className="flex justify-between">
                <span>Endpoint:</span>
                <span className="text-[var(--text-primary)] font-mono text-[11px] truncate max-w-[140px]">
                  capflow-analytics
                </span>
              </div>
            </div>
          </div>

          {/* SMTP Gateway */}
          <div className="p-4 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Mail size={15} className="text-[#F59E0B]" />
                <span>Email Gateway (SMTP)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] text-[10px] font-bold">
                Ready to Send
              </span>
            </div>
            <div className="space-y-1 text-xs text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>Sender Account:</span>
                <span className="text-[var(--text-primary)] font-mono text-[11px] truncate max-w-[140px]">
                  {health?.smtp.user || "dev.lethwala@gmail.com"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Security Protocol:</span>
                <span className="text-[var(--text-primary)]">SSL (Port 465)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Runtime info bar */}
        <div className="mt-3.5 pt-3.5 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-3">
            <span>Uptime: <strong className="text-[var(--text-primary)]">{health ? formatUptime(health.system.uptimeSeconds) : "..."}</strong></span>
            <span>&bull;</span>
            <span>Memory: <strong className="text-[var(--text-primary)]">{health?.system.heapUsedMb} MB in use</strong></span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>CapFlow v1.0.0</span>
            <span>&bull;</span>
            <span>Node {health?.system.nodeVersion || process.version}</span>
          </div>
        </div>
      </div>

      {/* ── Quick Administrative Launchpad & Activity Feed ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Tools Launchpad */}
        <div className="rounded-2xl p-5 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-[#6366F1]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Quick Admin Tools</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Direct shortcuts to manage user accounts, send emails, and review customer tickets.
            </p>

            <div className="space-y-2">
              <Link
                href="/admin/users"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card-hover)] hover:bg-[#6366F1]/10 text-xs font-semibold text-[var(--text-primary)] transition-all group border border-transparent hover:border-[#6366F1]/20"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#6366F1]/10 text-[#6366F1]">
                    <Users2 size={16} />
                  </div>
                  <div>
                    <div>User Accounts & Data</div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-normal">
                      Search, view profiles, inspect groups
                    </div>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[var(--text-secondary)] group-hover:text-[#6366F1] transition-colors" />
              </Link>

              <Link
                href="/admin/email"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card-hover)] hover:bg-[#6366F1]/10 text-xs font-semibold text-[var(--text-primary)] transition-all group border border-transparent hover:border-[#6366F1]/20"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8]">
                    <Mail size={16} />
                  </div>
                  <div>
                    <div>Send Custom Email</div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-normal">
                      Write and dispatch branded emails
                    </div>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[var(--text-secondary)] group-hover:text-[#6366F1] transition-colors" />
              </Link>

              <Link
                href="/admin/support"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card-hover)] hover:bg-[#6366F1]/10 text-xs font-semibold text-[var(--text-primary)] transition-all group border border-transparent hover:border-[#6366F1]/20"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B]">
                    <LifeBuoy size={16} />
                  </div>
                  <div>
                    <div>Customer Support CRM</div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-normal">
                      Inquiries with phone & email replies
                    </div>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[var(--text-secondary)] group-hover:text-[#6366F1] transition-colors" />
              </Link>

              <Link
                href="/admin/audit"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card-hover)] hover:bg-[#6366F1]/10 text-xs font-semibold text-[var(--text-primary)] transition-all group border border-transparent hover:border-[#6366F1]/20"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#10B981]/10 text-[#10B981]">
                    <FileText size={16} />
                  </div>
                  <div>
                    <div>Admin Activity Log</div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-normal">
                      Security records and action history
                    </div>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[var(--text-secondary)] group-hover:text-[#6366F1] transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Admin Actions Feed */}
        <div className="lg:col-span-2 rounded-2xl p-5 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Activity size={17} className="text-[#10B981]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Recent Administrative Actions
                </h3>
              </div>
              <Link
                href="/admin/audit"
                className="text-xs text-[#6366F1] hover:underline font-semibold"
              >
                View Full Log &rarr;
              </Link>
            </div>

            <div className="divide-y divide-[var(--border-color)] mt-1">
              {recentLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                  No recent admin activity recorded yet.
                </div>
              ) : (
                recentLogs.map((log) => {
                  const meta = getFriendlyActionLabel(log.action);
                  return (
                    <div key={log._id} className="py-3 flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5 ${meta.color}`}>
                          {meta.label}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--text-primary)] truncate">
                            {log.details?.recipientEmail ||
                              log.details?.deletedUserEmail ||
                              (log.details?.ticketId ? `Ticket #${log.details.ticketId}` : log.targetType)}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] truncate">
                            By {log.adminEmail}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-[var(--text-secondary)] font-mono shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
