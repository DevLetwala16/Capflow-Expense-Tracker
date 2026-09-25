"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, CalendarDays, Target, Settings } from "lucide-react";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useBudgetStore } from "@/lib/store/budgetStore";
import { useSettingsStore, rehydrateSettings } from "@/lib/store/settingsStore";
import { rehydrateWalkthrough } from "@/lib/store/walkthroughStore";
import { useAuthStore } from "@/lib/store/authStore";
import { DesktopSidebar } from "@/components/shared/DesktopSidebar";

const NAV_ITEMS = [
  { href: "/dashboard",   icon: Home,          label: "Home" },
  { href: "/analytics",   icon: BarChart2,     label: "Analytics" },
  { href: "/calendar",    icon: CalendarDays,  label: "Calendar" },
  { href: "/budgets",     icon: Target,        label: "Budgets" },
  { href: "/settings",    icon: Settings,      label: "Settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loadCategories } = useCategoryStore();
  const { loadTransactions } = useTransactionStore();
  const { loadBudgets, loadGoals } = useBudgetStore();
  const { selectedMonth } = useSettingsStore();
  const { user, setUser } = useAuthStore();

  // Track the last user we bootstrapped stores for, so we don't re-run on
  // every render — only when the user actually changes.
  const bootstrappedUserId = useRef<string | null>(null);

  useEffect(() => {
    // Recover user session if cookie exists but client state is empty
    if (!user) {
      fetch("/api/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) setUser(data.user);
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to recover session

  useEffect(() => {
    if (!user?.id) return;
    // Only bootstrap stores when the user actually changes
    if (bootstrappedUserId.current === user.id) return;
    bootstrappedUserId.current = user.id;

    // Re-hydrate settings and walkthrough from the user-scoped localStorage bucket
    rehydrateSettings(user.id);
    rehydrateWalkthrough(user.id);

    // Warm up all data stores scoped to this user
    loadCategories(user.id);
    loadTransactions(selectedMonth, user.id);
    loadBudgets(selectedMonth, user.id);
    loadGoals(user.id);
  }, [user, selectedMonth, loadCategories, loadTransactions, loadBudgets, loadGoals]);

  // Reload transactions / budgets when the selected month changes (user already bootstrapped)
  useEffect(() => {
    if (!user?.id || bootstrappedUserId.current !== user.id) return;
    loadTransactions(selectedMonth, user.id);
    loadBudgets(selectedMonth, user.id);
  }, [selectedMonth, user, loadTransactions, loadBudgets]);

  return (
    <div className="app-shell flex flex-col md:flex-row min-h-screen bg-[var(--bg-primary)]">
      {/* ── Desktop Navigation Sidebar (Hidden on mobile, visible on laptop/PC) ── */}
      <DesktopSidebar />

      {/* ── Main Content Area (Fluid on laptop, 480px on phone) ── */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-y-auto">
        <main className="flex-1 pb-[var(--bottom-nav-h)] md:pb-6">
          <div className="w-full max-w-[480px] md:max-w-6xl mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar (Visible on mobile, hidden on laptop/PC) ── */}
      <nav
        aria-label="Main navigation"
        className="flex md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[var(--bottom-nav-h)] bg-[var(--bg-card)]/95 backdrop-blur-xl border-t border-[var(--border-color)] items-stretch z-50 safe-area-pb"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium relative transition-colors ${
                active ? "text-[#6366F1]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-0.5 bg-[#6366F1] rounded-b-full" />
              )}
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
