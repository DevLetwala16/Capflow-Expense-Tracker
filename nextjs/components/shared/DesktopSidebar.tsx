"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  ReceiptText,
  BarChart2,
  CalendarDays,
  Target,
  CreditCard,
  Tags,
  DownloadCloud,
  Settings,
  LogOut,
  LogIn,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/transactions", icon: ReceiptText, label: "Transactions" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/budgets", icon: Target, label: "Budgets & Goals" },
  { href: "/emis", icon: CreditCard, label: "EMI Management" },
];

const SETTINGS_ITEMS = [
  { href: "/settings/categories", icon: Tags, label: "Categories" },
  { href: "/settings/export", icon: DownloadCloud, label: "Export & Backup" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    logout();
    window.location.href = "/auth";
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[var(--bg-card)] border-r border-[var(--border-color)] z-40 flex-shrink-0 select-none overflow-hidden">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-color)] min-h-[64px]">
        <div className="w-8 h-8 rounded-xl overflow-hidden bg-white/5 border border-[var(--border-color)] flex items-center justify-center p-0.5 flex-shrink-0 shadow-sm">
          <Image
            src="/capflow-logo.png"
            alt="CapFlow"
            width={28}
            height={28}
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-[var(--text-primary)]">
              CapFlow
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] font-medium">Expense Tracker</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            Menu
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#6366F1]/10 text-[#6366F1] font-bold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.3 : 1.8}
                    className="flex-shrink-0"
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            Tools & Preferences
          </p>
          <nav className="space-y-1">
            {SETTINGS_ITEMS.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#6366F1]/10 text-[#6366F1] font-bold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.3 : 1.8}
                    className="flex-shrink-0"
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User & Theme Footer (Clean vertical stack perfectly aligned inside sidebar) */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/50 space-y-3">
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1">
            Appearance
          </p>
          <ThemeToggle className="w-full" />
        </div>

        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <Link href="/settings" className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366F1] to-[#38bdf8] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || "G"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {user?.name || "Guest User"}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] truncate">
                {user?.email || "Local Account"}
              </p>
            </div>
          </Link>

          {user ? (
            <button
              onClick={handleSignOut}
              className="w-7 h-7 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[#EF4444] flex items-center justify-center transition-colors"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          ) : (
            <Link
              href="/auth"
              className="w-7 h-7 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[#6366F1] flex items-center justify-center transition-colors"
              title="Sign In"
            >
              <LogIn size={14} />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
