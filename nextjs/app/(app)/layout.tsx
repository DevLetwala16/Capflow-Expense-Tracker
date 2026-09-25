"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, CalendarDays, Target, Settings } from "lucide-react";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useBudgetStore } from "@/lib/store/budgetStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useAuthStore } from "@/lib/store/authStore";

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

  useEffect(() => {
    // Warm up stores in the background on startup
    loadCategories();
    loadTransactions(selectedMonth);
    loadBudgets(selectedMonth);
    loadGoals();

    // Recover user session if cookie exists but client state is empty
    if (!user) {
      fetch("/api/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) setUser(data.user);
        })
        .catch(() => {});
    }
  }, [loadCategories, loadTransactions, loadBudgets, loadGoals, selectedMonth, user, setUser]);

  return (
    <div className="app-shell flex flex-col bg-[var(--bg-primary)]">
      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-[var(--bottom-nav-h)]">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Main navigation"
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[var(--bottom-nav-h)] bg-[var(--bg-card)]/95 backdrop-blur-xl border-t border-[var(--border-color)] flex items-stretch z-50 safe-area-pb"
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
