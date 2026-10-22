"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, CalendarDays, Target, CreditCard, Settings, ReceiptText } from "lucide-react";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useBudgetStore } from "@/lib/store/budgetStore";
import { useSettingsStore, rehydrateSettings } from "@/lib/store/settingsStore";
import { rehydrateWalkthrough } from "@/lib/store/walkthroughStore";
import { useAuthStore } from "@/lib/store/authStore";
import { DesktopSidebar } from "@/components/shared/DesktopSidebar";
import { PWAInstallBanner } from "@/components/shared/PWAInstallBanner";
import { useRecurringEngine } from "@/hooks/useRecurringEngine";
import { useNotificationEngine } from "@/hooks/useNotificationEngine";

// These components read browser-only APIs (localStorage / window) during render.
// Rendering them with ssr:false ensures the server HTML never includes them,
// preventing the Suspense-boundary hydration mismatch.
const RouteLoadingBar = dynamic(
  () => import("@/components/shared/RouteLoadingBar").then((m) => ({ default: m.RouteLoadingBar })),
  { ssr: false }
);
const WalkthroughProvider = dynamic(
  () => import("@/components/walkthrough/WalkthroughProvider").then((m) => ({ default: m.WalkthroughProvider })),
  { ssr: false }
);
const AppLockOverlay = dynamic(
  () => import("@/components/shared/AppLockOverlay").then((m) => ({ default: m.AppLockOverlay })),
  { ssr: false }
);
const InAppNotificationBanner = dynamic(
  () => import("@/components/shared/InAppNotificationBanner").then((m) => ({ default: m.InAppNotificationBanner })),
  { ssr: false }
);
const DevicePermissionModal = dynamic(
  () => import("@/components/shared/DevicePermissionModal").then((m) => ({ default: m.DevicePermissionModal })),
  { ssr: false }
);

import { useEMIStore } from "@/lib/store/emiStore";
import { useExchangeRateStore } from "@/lib/currency/exchangeRates";

const NAV_ITEMS = [
  { href: "/dashboard",    icon: Home,         label: "Home" },
  { href: "/transactions", icon: ReceiptText,  label: "History" },
  { href: "/analytics",    icon: BarChart2,    label: "Analytics" },
  { href: "/calendar",     icon: CalendarDays, label: "Calendar" },
  { href: "/budgets",      icon: Target,       label: "Budgets" },
  { href: "/emis",         icon: CreditCard,   label: "EMIs" },
  { href: "/settings",     icon: Settings,     label: "Settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loadCategories } = useCategoryStore();
  const { loadTransactions } = useTransactionStore();
  const { loadBudgets, loadGoals } = useBudgetStore();
  const { selectedMonth } = useSettingsStore();
  const { user, setUser } = useAuthStore();

  const { loadEMIs } = useEMIStore();

  // Run the recurring-transaction engine once per calendar day on app load.
  // This auto-generates child transactions for any recurring parent that is due.
  useRecurringEngine(user?.id);

  // Run the notification & reminder engine (daily reminders, EMI due alerts, budget warnings, auto emails)
  useNotificationEngine();

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
    // Warm up exchange rates (auto-checks 3h cache TTL)
    useExchangeRateStore.getState().fetchRates().catch(() => {});

    // Check periodically to refresh if 3 hours have passed
    const interval = setInterval(() => {
      useExchangeRateStore.getState().fetchRates().catch(() => {});
    }, 20 * 60 * 1000); // Check every 20 mins

    return () => clearInterval(interval);
  }, []);

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
    loadEMIs(user.id);
  }, [user, selectedMonth, loadCategories, loadTransactions, loadBudgets, loadGoals, loadEMIs]);

  // Reload transactions / budgets when the selected month changes (user already bootstrapped)
  useEffect(() => {
    if (!user?.id || bootstrappedUserId.current !== user.id) return;
    loadTransactions(selectedMonth, user.id);
    loadBudgets(selectedMonth, user.id);
  }, [selectedMonth, user, loadTransactions, loadBudgets]);

  // Synchronize dynamic appearance tokens (font scale, density, custom/preset accent, background, surface)
  const { fontScale, density, accentPreset, customAccent, customBackground, customSurface } = useSettingsStore();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fontMap: Record<string, string> = {
      small: "0.85",
      medium: "0.92",
      default: "1",
      large: "1.1",
      xlarge: "1.25",
    };
    if (fontScale && fontMap[fontScale]) {
      document.documentElement.style.setProperty("--font-scale", fontMap[fontScale]);
    }
    if (density) {
      document.documentElement.style.setProperty("--density", density === "compact" ? "1" : "0");
    }
    const presetMap: Record<string, string> = {
      indigo: "#6366F1",
      emerald: "#10B981",
      purple: "#9333EA",
      orange: "#F97316",
      blue: "#3B82F6",
    };
    const accent = customAccent || (accentPreset && presetMap[accentPreset]) || "#6366F1";
    document.documentElement.style.setProperty("--accent", accent);

    if (customBackground && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(customBackground)) {
      document.documentElement.style.setProperty("--bg-primary", customBackground);
    } else {
      document.documentElement.style.removeProperty("--bg-primary");
    }

    if (customSurface && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(customSurface)) {
      document.documentElement.style.setProperty("--bg-card", customSurface);
    } else {
      document.documentElement.style.removeProperty("--bg-card");
    }
  }, [fontScale, density, accentPreset, customAccent, customBackground, customSurface]);

  return (
    <div className="app-shell flex flex-col md:flex-row min-h-screen bg-[var(--bg-primary)]">
      {/* ── App Lock & Security Overlay ── */}
      <AppLockOverlay />

      {/* ── Floating In-App Notifications Banner ── */}
      <InAppNotificationBanner />

      {/* ── First-time Device & Hardware Permissions Modal ── */}
      <DevicePermissionModal />

      {/* ── Walkthrough overlay (renderless — manages its own portal/modal) ── */}
      <WalkthroughProvider />

      {/* ── Instant Route Loading Bar ── */}
      <RouteLoadingBar />

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
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[9px] font-medium relative transition-colors ${
                active ? "text-[#6366F1]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#6366F1] rounded-b-full" />
              )}
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
              <span className="truncate max-w-full px-0.5">{label}</span>
            </Link>
          );
        })}
      </nav>
      {/* ── PWA Install Prompt Banner ── */}
      <PWAInstallBanner />
    </div>
  );
}
