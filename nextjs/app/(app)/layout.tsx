"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, Target, CreditCard, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",   icon: Home,       label: "Home" },
  { href: "/analytics",   icon: BarChart2,  label: "Analytics" },
  { href: "/budgets",     icon: Target,     label: "Budgets" },
  { href: "/emis",        icon: CreditCard, label: "EMI" },
  { href: "/settings",    icon: Settings,   label: "Settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
