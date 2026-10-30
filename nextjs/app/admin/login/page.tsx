"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("capflow@softcapphyjas.com");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);

  const fillMasterCredentials = () => {
    setEmail("capflow@softcapphyjas.com");
    setOtp("100283");
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) {
      setError("Please provide both admin email and Master OTP.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("capflow_admin_authenticated", "true");
          localStorage.setItem("capflow_admin_email", email.trim().toLowerCase());
        }
        router.replace("/admin/dashboard");
      } else {
        setError(data.error || "Authentication failed. Check admin credentials.");
        if (res.status === 429 && data.retryAfter) {
          setCountdown(data.retryAfter);
        }
      }
    } catch {
      setError("Connection error. Unable to reach authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 select-none overflow-hidden transition-colors">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] md:w-[680px] h-[520px] md:h-[680px] bg-gradient-to-tr from-[#6366F1]/15 via-[#38bdf8]/10 to-transparent rounded-full blur-[100px]" />
      </div>

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-[420px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-7 shadow-2xl"
      >
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl p-1 bg-white/5 border border-[var(--border-color)] flex items-center justify-center mb-3 shadow-md">
            <Image
              src="/capflow-logo.png"
              alt="CapFlow"
              width={48}
              height={48}
              className="w-full h-full object-contain rounded-xl"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#6366F1]/10 text-[#6366F1] text-[11px] font-bold uppercase tracking-wider mb-2">
            <Lock size={12} />
            <span>Company Admin Console</span>
          </div>

          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
            CapFlow Administration
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Restricted access for platform management and customer support.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-500 flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{error}</div>
          </div>
        )}

        {/* 1-Click Master Credentials Helper */}
        <div className="mb-5 p-3 rounded-2xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-[#6366F1] flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>Special Admin Bypass</span>
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
              capflow@softcapphyjas.com &bull; 100283
            </div>
          </div>
          <button
            type="button"
            onClick={fillMasterCredentials}
            className="px-2.5 py-1.5 rounded-xl bg-[#6366F1] text-white text-[11px] font-bold hover:bg-[#4F46E5] transition-colors cursor-pointer"
          >
            Auto-fill
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Admin Email
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="capflow@softcapphyjas.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[#6366F1] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Master Bypass OTP
            </label>
            <div className="relative">
              <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="password"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit master OTP"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-mono tracking-widest focus:outline-none focus:border-[#6366F1] transition-colors"
              />
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              Backend validates bypass instantly without triggering external email OTP.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || (countdown !== null && countdown > 0)}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : countdown !== null && countdown > 0 ? (
              <span>Locked ({countdown}s)</span>
            ) : (
              <>
                <span>Sign In to Admin Portal</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1 font-medium">
            <ShieldCheck size={13} className="text-[#10B981]" />
            Secure Session
          </span>
          <button
            type="button"
            onClick={() => router.push("/auth")}
            className="hover:text-[var(--text-primary)] font-semibold transition-colors"
          >
            Go to User App &rarr;
          </button>
        </div>
      </motion.div>
    </div>
  );
}
