"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/authStore";

type Step = "email" | "otp";

export default function OTPPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const requestOTP = async () => {
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("otp");
        setCountdown(30);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(data.error || "Failed to send OTP. Try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    // Auto-submit immediately when last digit entered
    if (newOtp.every((d) => d) && newOtp.join("").length === 6) {
      verifyOTP(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const verifyOTP = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSuccess(true);
        // Use replace so back button doesn't return to auth
        setTimeout(() => router.replace("/dashboard"), 900);
      } else {
        setError("Invalid code. Please try again.");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col max-w-sm mx-auto w-full px-6 py-8">
      {/* Back button */}
      <button
        onClick={() => step === "otp" ? setStep("email") : router.back()}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8 w-fit"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Back</span>
      </button>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <CheckCircle size={64} className="text-[#10B981]" />
            </motion.div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">Verified!</p>
            <p className="text-sm text-[var(--text-secondary)]">Redirecting to your dashboard…</p>
          </motion.div>
        ) : step === "email" ? (
          <motion.div
            key="email-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#F97316]/15 flex items-center justify-center mb-4">
                <Mail size={24} className="text-[#F97316]" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Enter your email</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {"We'll send a 6-digit code to verify it's you."}
              </p>
            </div>

            {/* Wrapped in <form> so browser shows email autocomplete suggestions */}
            <form
              onSubmit={(e) => { e.preventDefault(); requestOTP(); }}
              className="flex flex-col gap-3"
              autoComplete="on"
            >
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                autoComplete="email"
                autoFocus
                className="h-12 px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#6366F1] transition-colors w-full"
              />
              {error && <p className="text-sm text-[#EF4444]">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email}
                className="h-12 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Sending…" : "Send Code"}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-6"
          >
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Check your email</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                We sent a 6-digit code to{" "}
                <strong className="text-[var(--text-primary)]">{email}</strong>
              </p>
            </div>

            {/* OTP Input boxes */}
            <motion.div
              animate={shake ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex gap-2 justify-center"
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpInput(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={loading}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-[var(--bg-card)] border-2 border-[var(--border-color)] text-[var(--text-primary)] focus:border-[#6366F1] focus:outline-none transition-colors disabled:opacity-50"
                />
              ))}
            </motion.div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-[#EF4444] text-center"
              >
                {error}
              </motion.p>
            )}

            {/* Resend */}
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  Resend code in <strong className="text-[var(--text-primary)]">{countdown}s</strong>
                </p>
              ) : (
                <button
                  onClick={() => { requestOTP(); setOtp(["", "", "", "", "", ""]); }}
                  className="text-sm text-[#6366F1] font-medium hover:underline"
                >
                  Resend code
                </button>
              )}
            </div>

            <Button
              onClick={() => verifyOTP(otp.join(""))}
              disabled={otp.join("").length < 6 || loading}
              className="h-12 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold"
            >
              {loading ? "Verifying…" : "Verify Code"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
