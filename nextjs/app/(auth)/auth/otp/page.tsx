"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  Loader2,
  ArrowRight,
} from "lucide-react";
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

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasted)) return;
    const digits = pasted.split("");
    setOtp(digits);
    otpRefs.current[5]?.focus();
    verifyOTP(pasted);
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
        if (typeof window !== "undefined") {
          localStorage.setItem("capflow_just_signed_in", "true");
        }
        setSuccess(true);
        // Use replace to smoothly navigate to the onboarding walkthrough
        setTimeout(() => router.replace("/onboarding"), 900);
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
    <div className="min-h-dvh flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden bg-[var(--bg-primary)]">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Back navigation */}
        <button
          type="button"
          onClick={() => (step === "otp" ? setStep("email") : router.back())}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-indigo-500/30 transition-all mb-5 active:scale-95 shadow-sm"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        {/* Card Container */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Verification Successful!
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Redirecting to your dashboard...
                </p>
              </motion.div>
            ) : step === "email" ? (
              <motion.div
                key="email-step"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                {/* Header Icon */}
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center mx-auto mb-4 text-[#818CF8] shadow-sm shadow-indigo-500/10">
                  <Mail size={24} />
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] text-center tracking-tight">
                  Enter your email
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] text-center mt-1.5 max-w-[280px] mx-auto">
                  We will send a 6-digit verification code to sign you in securely.
                </p>

                {/* Email Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    requestOTP();
                  }}
                  className="mt-6 space-y-4"
                  autoComplete="on"
                >
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative flex items-center">
                      <Mail
                        size={16}
                        className="absolute left-3.5 text-[var(--text-secondary)] pointer-events-none"
                      />
                      <input
                        type="email"
                        name="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        autoComplete="email"
                        autoFocus
                        className="w-full h-12 pl-10 pr-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 transition-all font-medium placeholder:text-[var(--text-secondary)]/50"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full h-12 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                {/* Header Icon */}
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center mx-auto mb-4 text-[#818CF8] shadow-sm shadow-indigo-500/10">
                  <ShieldCheck size={26} />
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] text-center tracking-tight">
                  Enter Verification Code
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] text-center mt-1.5">
                  We sent a 6-digit code to
                  <span className="font-semibold text-[var(--text-primary)] block mt-0.5">
                    {email}
                  </span>
                </p>
                <div className="flex justify-center mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setError("");
                    }}
                    className="text-[11px] text-[#6366F1] hover:underline font-medium"
                  >
                    Wrong email? Change address
                  </button>
                </div>

                {/* 6-Digit OTP Input Boxes */}
                <motion.div
                  animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="flex gap-2 sm:gap-2.5 justify-center my-6"
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpInput(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      disabled={loading}
                      className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl bg-[var(--bg-primary)] border-2 transition-all outline-none ${
                        digit
                          ? "border-[#6366F1] text-[var(--text-primary)] bg-indigo-500/5 shadow-sm shadow-indigo-500/10"
                          : "border-[var(--border-color)] text-[var(--text-primary)] focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20"
                      }`}
                    />
                  ))}
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-medium text-center"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Resend Countdown */}
                <div className="text-center mb-5">
                  {countdown > 0 ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                      <Clock size={12} className="text-[var(--text-secondary)]" />
                      <span>Resend code in</span>
                      <strong className="text-[var(--text-primary)] font-semibold">
                        {countdown}s
                      </strong>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        requestOTP();
                        setOtp(["", "", "", "", "", ""]);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-[#6366F1] font-semibold hover:underline"
                    >
                      <RotateCcw size={13} />
                      <span>Resend code</span>
                    </button>
                  )}
                </div>

                {/* Verify Button */}
                <button
                  type="button"
                  onClick={() => verifyOTP(otp.join(""))}
                  disabled={otp.join("").length < 6 || loading}
                  className="w-full h-12 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Sign In</span>
                      <CheckCircle2 size={16} />
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
