"use client";

import { useRouter } from "next/navigation";
import { Settings, ChevronRight, Sun, Database, Shield, LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { defaultCurrency } = useSettingsStore();

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    logout();
    router.replace("/auth");
  };

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      <header className="px-4 py-5 border-b border-[var(--border-color)]">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Profile */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366F1] to-[#38bdf8] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{user?.name || "Guest User"}</p>
            <p className="text-xs text-[var(--text-secondary)]">{user?.email || "Not signed in"}</p>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-color)]">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Preferences</p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun size={16} className="text-[var(--text-secondary)]" />
              <span className="text-sm text-[var(--text-primary)]">Theme</span>
            </div>
            <ThemeToggle />
          </div>
          <div className="px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between">
            <span className="text-sm text-[var(--text-primary)]">Currency</span>
            <span className="text-sm text-[var(--text-secondary)]">{defaultCurrency}</span>
          </div>
        </div>

        {/* Data */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-color)]">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Data</p>
          </div>
          <button
            onClick={() => router.push("/settings/categories")}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <span className="text-sm text-[var(--text-primary)]">Manage Categories</span>
            <ChevronRight size={16} className="text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => router.push("/settings/export")}
            className="w-full px-4 py-3 border-t border-[var(--border-color)] flex items-center justify-between hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <span className="text-sm text-[var(--text-primary)]">Export / Backup & Restore</span>
            <ChevronRight size={16} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* About */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#10B981]" />
            <p className="text-sm text-[var(--text-secondary)]">All your financial data is stored only on this device</p>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">CapFlow v1.0.0 — Softcapphyjas Pvt. Ltd.</p>
        </div>

        {/* Sign Out */}
        {user && (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#EF4444]/10 text-[#EF4444] font-semibold text-sm border border-[#EF4444]/20"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
