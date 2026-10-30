"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Users2,
  Search,
  Filter,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  X,
  Loader2,
  RefreshCw,
  QrCode,
  Layers,
  CheckCircle2,
  Copy,
  Check,
  CreditCard,
  Bell,
  Clock,
  UserCheck,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "user" | "admin";
  avatar: string | null;
  upiId: string;
  hasPaymentQr: boolean;
  splitCount: number;
  preferences?: any;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailedMeta, setDetailedMeta] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Delete Modal
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search: search.trim(),
        role: roleFilter,
      });

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openUserDetails = async (user: UserItem) => {
    setSelectedUser(user);
    setDetailLoading(true);
    setDetailedMeta(null);
    setCopiedField(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailedMeta(data);
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    if (
      deleteConfirmationText.trim().toLowerCase() !== userToDelete.email.toLowerCase() &&
      deleteConfirmationText.trim() !== "DELETE"
    ) {
      setActionMessage({
        type: "error",
        text: `Confirmation mismatch. Please type '${userToDelete.email}' or 'DELETE' to confirm.`,
      });
      return;
    }

    setDeleting(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setActionMessage({ type: "success", text: data.message });
        setUserToDelete(null);
        setDeleteConfirmationText("");
        fetchUsers();
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to delete user." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error attempting user deletion." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              User Accounts & Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#6366F1]/10 text-[#6366F1] text-xs font-bold">
              {totalCount} Total Accounts
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Search registered users, view profile information, check linked financial groups, and manage account data.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-[#6366F1]" : ""} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* ── Action Notice Toast ───────────────────────────────────────── */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            actionMessage.type === "success"
              ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
              : "bg-red-500/10 border-red-500/30 text-red-500"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {actionMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-80">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search by user name, email, or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#6366F1] transition-colors"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-[#6366F1] text-white text-[11px] font-bold hover:bg-[#4F46E5] transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs text-[var(--text-secondary)] font-medium">Account Role:</span>
          {(["all", "user", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRoleFilter(r);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                roleFilter === r
                  ? "bg-[#6366F1] text-white"
                  : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {r === "all" ? "All Accounts" : r === "admin" ? "Admins" : "Standard Users"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mobile Phone View (Responsive Cards — Visible only on phones < 768px) ── */}
      <div className="flex md:hidden flex-col gap-3">
        {loading ? (
          <div className="p-8 text-center text-[var(--text-secondary)] bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]">
            <Loader2 size={24} className="animate-spin text-[#6366F1] mx-auto mb-2" />
            <span className="text-xs">Loading user accounts...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-secondary)] bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]">
            <p className="text-xs">No registered users found matching your search.</p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#6366F1]/15 text-[#6366F1] flex items-center justify-center font-extrabold text-sm shrink-0 overflow-hidden border border-[#6366F1]/20">
                    {user.avatar ? (
                      <Image src={user.avatar} alt={user.name} width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                      user.name ? user.name[0].toUpperCase() : "U"
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
                      <span>{user.name || "Unnamed User"}</span>
                      {user.role === "admin" && <Shield size={12} className="text-[#10B981]" />}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-mono">{user.email}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                  user.role === "admin"
                    ? "bg-[#10B981]/15 text-[#10B981]"
                    : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                }`}>
                  {user.role}
                </span>
              </div>

              {/* Info chips */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-[var(--bg-card-hover)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Contact Phone:</span>
                  <span className="font-mono text-[11px] text-[var(--text-primary)] font-medium">
                    {user.phone || "Not set"}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[var(--bg-card-hover)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Shared Groups:</span>
                  <span className="text-[11px] text-[var(--text-primary)] font-bold">
                    {user.splitCount} session(s)
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
                <button
                  onClick={() => openUserDetails(user)}
                  className="flex-1 py-2 rounded-xl bg-[var(--bg-card-hover)] hover:bg-[#6366F1]/10 text-xs font-bold text-[var(--text-primary)] hover:text-[#6366F1] transition-all flex items-center justify-center gap-1.5"
                >
                  <Eye size={13} />
                  <span>View Details</span>
                </button>
                <button
                  onClick={() => {
                    setUserToDelete(user);
                    setDeleteConfirmationText("");
                    setActionMessage(null);
                  }}
                  disabled={user.email.toLowerCase() === "capflow@softcapphyjas.com"}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors disabled:opacity-20"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Desktop Table View (Visible on screens >= 768px) ────────── */}
      <div className="hidden md:block rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-card-hover)] border-b border-[var(--border-color)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-5">User Details</th>
                <th className="py-3.5 px-4">Contact Phone</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Shared Groups</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-secondary)]">
                    <Loader2 size={24} className="animate-spin text-[#6366F1] mx-auto mb-2" />
                    <span>Loading user accounts...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-secondary)]">
                    No registered users found matching your search.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--bg-card-hover)]/50 transition-colors">
                    {/* User Identity */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#6366F1]/15 text-[#6366F1] flex items-center justify-center font-extrabold text-xs shrink-0 overflow-hidden border border-[#6366F1]/20">
                          {user.avatar ? (
                            <Image src={user.avatar} alt={user.name} width={36} height={36} className="w-full h-full object-cover" />
                          ) : (
                            user.name ? user.name[0].toUpperCase() : "U"
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                            <span>{user.name || "Unnamed User"}</span>
                            {user.role === "admin" && (
                              <Shield size={12} className="text-[#10B981]" />
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] font-mono truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono text-[var(--text-primary)]">
                      {user.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone size={11} className="text-[var(--text-secondary)]" />
                          {user.phone}
                        </span>
                      ) : (
                        <span className="text-[var(--text-secondary)] italic">Not provided</span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.role === "admin"
                          ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/20"
                          : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]"
                      }`}>
                        {user.role === "admin" ? "Administrator" : "Standard User"}
                      </span>
                    </td>

                    {/* Financial Groups / Splits */}
                    <td className="py-3.5 px-4 text-[var(--text-primary)] font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Layers size={13} className="text-[#6366F1]" />
                        <span>{user.splitCount} active group(s)</span>
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] font-mono text-[11px]">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "--"}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openUserDetails(user)}
                          className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-card-hover)] hover:bg-[#6366F1]/10 text-xs font-semibold text-[var(--text-primary)] hover:text-[#6366F1] transition-all flex items-center gap-1.5"
                          title="View Complete Profile"
                        >
                          <Eye size={13} />
                          <span>View Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteConfirmationText("");
                            setActionMessage(null);
                          }}
                          disabled={user.email.toLowerCase() === "capflow@softcapphyjas.com"}
                          className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors disabled:opacity-20 disabled:pointer-events-none"
                          title={user.email.toLowerCase() === "capflow@softcapphyjas.com" ? "Master admin cannot be deleted" : "Delete Account"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ─────────────────────────────────────────── */}
        <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div>
            Showing Page <strong className="text-[var(--text-primary)]">{page}</strong> of <strong className="text-[var(--text-primary)]">{totalPages}</strong> ({totalCount} users)
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

      {/* ── Complete User Profile Modal (100% Human-Readable Cards, NO RAW JSON) ── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/20 flex items-center justify-center text-lg font-extrabold shrink-0">
                  {selectedUser.name ? selectedUser.name[0].toUpperCase() : "U"}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                    <span>{selectedUser.name || "User Profile"}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedUser.role === "admin"
                        ? "bg-[#10B981]/15 text-[#10B981]"
                        : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                    }`}>
                      {selectedUser.role === "admin" ? "Administrator" : "Standard Account"}
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-16 text-center text-[var(--text-secondary)]">
                <Loader2 size={24} className="animate-spin text-[#6366F1] mx-auto mb-2" />
                <span>Retrieving complete user profile...</span>
              </div>
            ) : (
              <div className="mt-5 space-y-5 text-xs">
                {/* 1. Account Identity & Contact Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">
                      Verified Email Address
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-semibold text-[var(--text-primary)] truncate">
                        {selectedUser.email}
                      </span>
                      <button
                        onClick={() => copyToClipboard(selectedUser.email, "email")}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Copy email"
                      >
                        {copiedField === "email" ? <Check size={13} className="text-[#10B981]" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">
                      Contact Mobile Number
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        {selectedUser.phone || "No phone added by user"}
                      </span>
                      {selectedUser.phone && (
                        <button
                          onClick={() => copyToClipboard(selectedUser.phone, "phone")}
                          className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          title="Copy phone"
                        >
                          {copiedField === "phone" ? <Check size={13} className="text-[#10B981]" /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Account Dates & Timeline */}
                <div className="p-4 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[var(--text-primary)]">
                    <Clock size={14} className="text-[#6366F1]" />
                    <span>Account History & Registration</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-[var(--text-secondary)]">Member Since:</span>
                      <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                        {selectedUser.createdAt
                          ? new Date(selectedUser.createdAt).toLocaleDateString(undefined, {
                              weekday: "short",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "Not recorded"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-[var(--text-secondary)]">Last Profile Update:</span>
                      <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                        {selectedUser.updatedAt
                          ? new Date(selectedUser.updatedAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Not recorded"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Payment & UPI Configuration */}
                <div className="p-4 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[var(--text-primary)]">
                    <CreditCard size={14} className="text-[#38bdf8]" />
                    <span>Payment & UPI Setup</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-[var(--text-secondary)]">Registered UPI ID:</span>
                      <div className="font-mono font-semibold text-[var(--text-primary)] mt-0.5">
                        {selectedUser.upiId || "No UPI ID registered"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-[var(--text-secondary)]">Payment QR Code:</span>
                      <div className="mt-1">
                        {selectedUser.hasPaymentQr ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] font-bold text-[10px]">
                            <CheckCircle2 size={12} />
                            Uploaded & Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-500/10 text-[var(--text-secondary)] font-medium text-[10px]">
                            Not Uploaded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Notification Preferences */}
                <div className="p-4 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[var(--text-primary)]">
                    <Bell size={14} className="text-[#F59E0B]" />
                    <span>Email & Notification Preferences</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between">
                      <span className="text-[11px] text-[var(--text-secondary)]">EMI Due Reminders:</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        selectedUser.preferences?.emailNotifications?.emiReminders
                          ? "bg-[#10B981]/15 text-[#10B981]"
                          : "bg-zinc-500/10 text-[var(--text-secondary)]"
                      }`}>
                        {selectedUser.preferences?.emailNotifications?.emiReminders ? "Enabled" : "Disabled"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between">
                      <span className="text-[11px] text-[var(--text-secondary)]">Monthly PDF Statements:</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        selectedUser.preferences?.emailNotifications?.monthlyStatement
                          ? "bg-[#10B981]/15 text-[#10B981]"
                          : "bg-zinc-500/10 text-[var(--text-secondary)]"
                      }`}>
                        {selectedUser.preferences?.emailNotifications?.monthlyStatement ? "Enabled" : "Disabled"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between">
                      <span className="text-[11px] text-[var(--text-secondary)]">Auto Email Sync:</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        selectedUser.preferences?.emailNotifications?.emiEmailSync
                          ? "bg-[#10B981]/15 text-[#10B981]"
                          : "bg-zinc-500/10 text-[var(--text-secondary)]"
                      }`}>
                        {selectedUser.preferences?.emailNotifications?.emiEmailSync ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Shared Splitter Groups */}
                <div className="p-4 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                      <Layers size={14} className="text-[#6366F1]" />
                      <span>Financial Splitter Groups ({detailedMeta?.metadata?.splitSessionsCount || 0})</span>
                    </div>
                  </div>
                  {detailedMeta?.metadata?.splitSessions?.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      {detailedMeta.metadata.splitSessions.map((s: any) => (
                        <div
                          key={s.sessionId}
                          className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-[var(--text-primary)]">{s.name}</div>
                            <div className="text-[11px] text-[var(--text-secondary)]">
                              Currency: {s.currency} &bull; {s.memberCount} Members &bull; {s.expenseCount} Expenses recorded
                            </div>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.status === "active"
                              ? "bg-[#10B981]/15 text-[#10B981]"
                              : "bg-zinc-500/10 text-[var(--text-secondary)]"
                          }`}>
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[var(--text-secondary)] italic text-xs py-1">
                      This user has not created or joined any shared Splitter groups yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-red-500/30 rounded-3xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center mb-5">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Permanently Delete User Account?</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                You are about to permanently delete the profile for:
              </p>
              <div className="mt-2 py-1 px-3 rounded-lg bg-red-500/10 text-red-500 font-mono text-xs font-bold inline-block border border-red-500/20">
                {userToDelete.email}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-2">
                This will remove their profile and unlink their session state. This action is irreversible and will be logged in the activity trail.
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                Type <strong className="text-red-500 font-mono">{userToDelete.email}</strong> or <strong className="text-red-500 font-mono">DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder={userToDelete.email}
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-[var(--bg-card-hover)] border border-red-500/30 text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-card-hover)] hover:bg-[var(--border-color)] text-[var(--text-primary)] text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={
                  deleting ||
                  (deleteConfirmationText.trim().toLowerCase() !== userToDelete.email.toLowerCase() &&
                    deleteConfirmationText.trim() !== "DELETE")
                }
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
