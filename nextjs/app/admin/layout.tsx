"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Home,
  Users2,
  Mail,
  LifeBuoy,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Shield,
  Activity,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

const navSections = [
  {
    title: "Main Dashboard",
    items: [
      { name: "Overview", href: "/admin/dashboard", icon: Home },
      { name: "User Directory", href: "/admin/users", icon: Users2 },
    ],
  },
  {
    title: "Communication & Support",
    items: [
      { name: "Send Custom Email", href: "/admin/email", icon: Mail },
      { name: "Support Inquiries", href: "/admin/support", icon: LifeBuoy },
    ],
  },
  {
    title: "Security & Auditing",
    items: [
      { name: "Admin Activity Log", href: "/admin/audit", icon: ShieldCheck },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [healthStatus, setHealthStatus] = useState<"ok" | "degraded" | "checking">("checking");

  // Skip layout shell on login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch("/api/admin/auth/logout", {
        method: "POST",
      });
      if (typeof window !== "undefined") {
        localStorage.removeItem("capflow_admin_authenticated");
        localStorage.removeItem("capflow_admin_email");
      }
      router.replace("/admin/login");
    } catch {
      router.replace("/admin/login");
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => {
        if (res.ok) setHealthStatus("ok");
        else setHealthStatus("degraded");
      })
      .catch(() => setHealthStatus("degraded"));
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col md:flex-row font-sans selection:bg-[#6366F1] selection:text-white transition-colors duration-200">
      {/* ── Desktop Sidebar (Exact CapFlow Design) ──────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[var(--bg-card)] border-r border-[var(--border-color)] z-40 flex-shrink-0 select-none overflow-hidden justify-between">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-color)] min-h-[64px]">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-white/5 border border-[var(--border-color)] flex items-center justify-center p-0.5 flex-shrink-0 shadow-sm">
              <Image
                src="/capflow-logo.png"
                alt="CapFlow Logo"
                width={28}
                height={28}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[var(--text-primary)]">
                  CapFlow
                </span>
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              </div>
              <p className="text-[10px] text-[#6366F1] font-bold uppercase tracking-wider">
                Company Admin
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {navSections.map((section, sIdx) => (
              <div key={sIdx}>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  {section.title}
                </p>
                <nav className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-[#6366F1]/10 text-[#6366F1] font-bold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            size={16}
                            className={isActive ? "text-[#6366F1]" : "text-[var(--text-secondary)]"}
                          />
                          <span>{item.name}</span>
                        </div>
                        {isActive && <ChevronRight size={13} className="opacity-80" />}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom System Status & Admin Profile */}
        <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col gap-2">
          {/* Service Live Indicator */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg-card-hover)] text-xs">
            <span className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <Activity size={12} className="text-[#10B981]" />
              System Status
            </span>
            <span className="text-[10px] font-bold text-[#10B981] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              {healthStatus === "ok" ? "Operational" : "Checking"}
            </span>
          </div>

          {/* User Profile Card */}
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#6366F1]/15 text-[#6366F1] flex items-center justify-center font-bold text-xs shrink-0">
                <Shield size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                  Master Admin
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] font-mono truncate">
                  capflow@softcapphyjas.com
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign Out"
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Header ────────────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--bg-card)] border-b border-[var(--border-color)] sticky top-0 z-40 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-white/5 border border-[var(--border-color)] flex items-center justify-center p-0.5">
            <Image
              src="/capflow-logo.png"
              alt="CapFlow Logo"
              width={26}
              height={26}
              className="object-contain"
            />
          </div>
          <div>
            <span className="font-extrabold text-sm text-[var(--text-primary)]">CapFlow Admin</span>
            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-[#6366F1]/10 text-[#6366F1] text-[9px] font-bold">
              PORTAL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-[var(--bg-card-hover)] text-[var(--text-primary)]"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer Navigation ─────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-between p-5">
          <div className="bg-[var(--bg-card)] rounded-3xl p-5 border border-[var(--border-color)] shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-[#6366F1]" />
                <span className="font-bold text-sm text-[var(--text-primary)]">Admin Menu</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
              >
                <X size={16} />
              </button>
            </div>

            <nav className="flex flex-col gap-1.5 mt-4">
              {navSections.flatMap((s) => s.items).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive
                        ? "bg-[#6366F1] text-white"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)] font-mono">capflow@softcapphyjas.com</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 text-xs font-semibold"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Workspace Area ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar on Desktop */}
        <div className="hidden md:flex items-center justify-between px-8 py-3.5 bg-[var(--bg-card)] border-b border-[var(--border-color)] select-none">
          {/* Breadcrumb / Current Location */}
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
            <Link href="/admin/dashboard" className="hover:text-[var(--text-primary)] transition-colors">
              Company Portal
            </Link>
            <ChevronRight size={12} className="opacity-40" />
            <span className="text-[var(--text-primary)] font-bold capitalize">
              {pathname === "/admin/dashboard"
                ? "Overview"
                : pathname.replace("/admin/", "").replace(/-/g, " ")}
            </span>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[#6366F1] font-semibold transition-colors"
            >
              <span>Open CapFlow App</span>
              <ExternalLink size={12} />
            </Link>

            <div className="h-4 w-px bg-[var(--border-color)]" />

            <ThemeToggle />

            <div className="h-4 w-px bg-[var(--border-color)]" />

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-card-hover)] text-xs text-[var(--text-secondary)] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span className="font-mono text-[11px] text-[var(--text-primary)]">
                capflow@softcapphyjas.com
              </span>
            </div>
          </div>
        </div>

        {/* Page Inner Content */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
