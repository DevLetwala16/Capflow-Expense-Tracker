"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Mail,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Shield,
  X,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";

type Step = "email" | "otp";

/**
 * Concentric ripple background matching the sleek wave pattern in the reference design.
 */
function ConcentricBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Deep ambient background fill */}
      <div className="absolute inset-0 bg-[#090B0E] dark:bg-[#090B0E]" />

      {/* Ambient center radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] md:w-[720px] h-[520px] md:h-[720px] bg-gradient-to-tr from-indigo-600/10 via-indigo-500/5 to-transparent rounded-full blur-[100px]" />

      {/* SVG concentric ripple rings */}
      <svg
        className="w-full h-full opacity-45 dark:opacity-35"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="ring-mask-grad" cx="50%" cy="58%" r="55%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#6366F1" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#ring-mask-grad)" />

        {/* Curved concentric ripple rings emanating from lower-center */}
        {[90, 150, 215, 280, 350, 425, 505, 590, 680, 775, 875, 985, 1100].map(
          (r, idx) => (
            <circle
              key={idx}
              cx="500"
              cy="580"
              r={r}
              stroke="rgba(255, 255, 255, 0.07)"
              strokeWidth="1.2"
              fill="none"
            />
          )
        )}
      </svg>
    </div>
  );
}

export default function OTPAuthPage() {
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

  // Policy modal state
  const [policyModal, setPolicyModal] = useState<"terms" | "privacy" | null>(
    null
  );

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend countdown effect
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // Request OTP from API
  const requestOTP = async (targetEmail?: string) => {
    const toSend = targetEmail || email;
    if (!toSend || !toSend.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: toSend.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("otp");
        setCountdown(25);
        setTimeout(() => otpRefs.current[0]?.focus(), 150);
      } else {
        setError(data.error || "Failed to send OTP. Try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  // Handle single digit input
  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits are provided
    if (newOtp.every((d) => d) && newOtp.join("").length === 6) {
      verifyOTP(newOtp.join(""));
    }
  };

  // Handle backspace navigation
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (e.key === "Enter" && otp.join("").length === 6) {
      verifyOTP(otp.join(""));
    }
  };

  // Handle clipboard paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasted)) return;
    const digits = pasted.split("");
    setOtp(digits);
    otpRefs.current[5]?.focus();
    verifyOTP(pasted);
  };

  // Verify OTP code
  const verifyOTP = async (code: string) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: code,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("capflow_just_signed_in", "true");
        }
        setSuccess(true);
        setTimeout(() => router.replace("/onboarding"), 900);
      } else {
        setError("Invalid OTP code. Please check and try again.");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 150);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  // Handle back navigation
  const handleBack = () => {
    if (step === "otp") {
      setStep("email");
      setError("");
    } else {
      router.back();
    }
  };

  const isOtpComplete = otp.join("").length === 6;
  const isEmailValid = email.includes("@") && email.trim().length > 3;

  return (
    <div className="relative min-h-dvh w-full flex flex-col justify-between overflow-x-hidden text-white select-none">
      {/* Background Ripple Waves */}
      <ConcentricBackground />

      {/* Main Container: Device-adaptive (Full-bleed on mobile, floating centered card on laptop) */}
      <div className="relative z-10 w-full min-h-dvh flex flex-col justify-between md:justify-center items-center px-5 py-6 md:py-12">
        {/* Device card wrapper: on laptop renders as a glassmorphic floating container */}
        <div className="w-full max-w-[440px] md:max-w-[480px] flex-1 md:flex-initial flex flex-col justify-between md:justify-start md:bg-[#10131B]/80 md:border md:border-white/10 md:rounded-[36px] md:backdrop-blur-2xl md:p-10 md:shadow-2xl md:shadow-black/70">
          {/* Top Bar: Back button */}
          <div className="w-full flex items-center justify-between mb-2 md:mb-6">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#181B24]/90 hover:bg-[#232734] border border-white/10 flex items-center justify-center text-[#EF4444] transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <div className="w-10 h-10" /> {/* Spacer */}
          </div>

          {/* Center Content Section */}
          <div className="my-auto md:my-0 flex flex-col items-center w-full">
            <AnimatePresence mode="wait">
              {success ? (
                /* Verification Success State */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="py-10 flex flex-col items-center justify-center text-center w-full"
                >
                  <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20 mb-5">
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Verification Successful!
                  </h2>
                  <p className="text-sm text-zinc-400 mt-2 max-w-xs">
                    Welcome to CapFlow. Redirecting to your workspace...
                  </p>
                </motion.div>
              ) : step === "email" ? (
                /* 1. Enter Your Email Page */
                <motion.div
                  key="email-page"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-col items-center w-full"
                >
                  {/* CapFlow Logo (Positioned in red-marked area) */}
                  <div className="w-20 h-20 md:w-22 md:h-22 rounded-3xl p-1 bg-white/[0.04] border border-white/10 shadow-xl shadow-indigo-500/10 flex items-center justify-center mb-6 backdrop-blur-md">
                    <Image
                      src="/capflow-logo.png"
                      alt="CapFlow Logo"
                      width={80}
                      height={80}
                      className="w-full h-full object-contain rounded-2xl"
                      priority
                    />
                  </div>

                  {/* Title & Subtitle */}
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-center">
                    Enter your Email
                  </h1>
                  <p className="text-sm text-zinc-400 text-center mt-2 max-w-[310px] leading-relaxed">
                    Please enter your email address to receive a secure OTP code to
                    proceed.
                  </p>

                  {/* Email Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      requestOTP();
                    }}
                    className="w-full mt-8 space-y-5"
                    autoComplete="on"
                  >
                    <div className="relative flex items-center w-full">
                      <div className="absolute left-4 text-zinc-400 pointer-events-none">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        autoComplete="email"
                        autoFocus
                        disabled={loading}
                        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[#141721] border border-white/10 text-white text-base placeholder:text-zinc-500 outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 transition-all font-medium shadow-inner"
                      />
                    </div>

                    {/* Error message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 font-medium text-center"
                      >
                        {error}
                      </motion.div>
                    )}

                    {/* Action Button: Continue -> */}
                    <button
                      type="submit"
                      disabled={loading || !isEmailValid}
                      className={`w-full h-14 rounded-full font-semibold text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98] ${
                        isEmailValid && !loading
                          ? "bg-gradient-to-r from-[#6366F1] via-[#5D5FEF] to-[#4F46E5] text-white hover:from-[#5558E6] hover:to-[#4338CA] shadow-indigo-500/25"
                          : "bg-[#1E222D] text-zinc-500 border border-white/5 cursor-not-allowed shadow-none"
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin text-white" />
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue</span>
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              ) : (
                /* 2. Enter OTP Page */
                <motion.div
                  key="otp-page"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-col items-center w-full"
                >
                  {/* CapFlow Logo (Positioned in red-marked area) */}
                  <div className="w-20 h-20 md:w-22 md:h-22 rounded-3xl p-1 bg-white/[0.04] border border-white/10 shadow-xl shadow-indigo-500/10 flex items-center justify-center mb-6 backdrop-blur-md">
                    <Image
                      src="/capflow-logo.png"
                      alt="CapFlow Logo"
                      width={80}
                      height={80}
                      className="w-full h-full object-contain rounded-2xl"
                      priority
                    />
                  </div>

                  {/* Title & Subtitle */}
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-center">
                    Enter OTP
                  </h1>
                  <p className="text-sm text-zinc-400 text-center mt-2 max-w-[310px] leading-relaxed">
                    Please enter the OTP code we just sent to{" "}
                    <span className="text-white font-medium break-all">
                      {email}
                    </span>{" "}
                    to proceed.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setError("");
                    }}
                    className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 underline font-medium transition-colors"
                  >
                    Change email
                  </button>

                  {/* 6-Digit OTP Box Grid */}
                  <motion.div
                    animate={
                      shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}
                    }
                    transition={{ duration: 0.4 }}
                    className="flex gap-2 sm:gap-2.5 justify-center my-7 w-full max-w-sm"
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
                        className={`w-11 h-14 sm:w-12 sm:h-16 md:w-13 md:h-16 text-center text-xl md:text-2xl font-bold rounded-2xl bg-[#141721] border transition-all outline-none ${
                          digit
                            ? "border-[#6366F1] text-white ring-2 ring-[#6366F1]/30 bg-indigo-500/10 shadow-md shadow-indigo-500/15"
                            : "border-white/10 text-white focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/25"
                        }`}
                      />
                    ))}
                  </motion.div>

                  {/* Error message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 font-medium text-center w-full"
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* Continue -> Button */}
                  <button
                    type="button"
                    onClick={() => verifyOTP(otp.join(""))}
                    disabled={!isOtpComplete || loading}
                    className={`w-full h-14 rounded-full font-semibold text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.98] ${
                      isOtpComplete && !loading
                        ? "bg-gradient-to-r from-[#6366F1] via-[#5D5FEF] to-[#4F46E5] text-white hover:from-[#5558E6] hover:to-[#4338CA] shadow-indigo-500/25"
                        : "bg-[#1E222D] text-zinc-500 border border-white/5 cursor-not-allowed shadow-none"
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin text-white" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  {/* Resend OTP text / timer */}
                  <div className="mt-5 text-center">
                    {countdown > 0 ? (
                      <p className="text-sm text-zinc-400">
                        Resend OTP in{" "}
                        <span className="text-white font-medium">
                          {countdown}s
                        </span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          requestOTP();
                          setOtp(["", "", "", "", "", ""]);
                        }}
                        className="text-sm text-zinc-300 hover:text-white underline underline-offset-4 font-medium transition-colors cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Footer: Terms of Use and Privacy Policy */}
          <div className="w-full text-center mt-8 md:mt-8 pt-4 pb-2 text-xs text-zinc-500 leading-relaxed">
            By continuing you agree to the <button
              type="button"
              onClick={() => setPolicyModal("terms")}
              className="text-[#EF4444] hover:text-[#DC2626] font-medium transition-colors cursor-pointer inline"
            >
              Terms of Use
            </button> and <button
              type="button"
              onClick={() => setPolicyModal("privacy")}
              className="text-[#EF4444] hover:text-[#DC2626] font-medium transition-colors cursor-pointer inline"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>

      {/* Terms / Privacy Modal Dialog */}
      <AnimatePresence>
        {policyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="w-full max-w-md bg-[#131722] border border-white/10 rounded-3xl p-6 shadow-2xl relative text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                    <Shield size={16} />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {policyModal === "terms" ? "Terms of Use" : "Privacy Policy"}
                  </h3>
                </div>
                <button
                  onClick={() => setPolicyModal(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 text-xs text-zinc-300 space-y-3 max-h-[50vh] overflow-y-auto pr-1 leading-relaxed">
                {policyModal === "terms" ? (
                  <>
                    <p>
                      <strong>1. Privacy-First Architecture:</strong> CapFlow is
                      engineered as an offline-first, local-storage personal
                      finance application. All your transactions, categories, and
                      budgets reside in your device browser storage.
                    </p>
                    <p>
                      <strong>2. Authentication & Services:</strong> Email
                      verification codes are transmitted solely to authenticate
                      your user session. CapFlow does not share or sell your email
                      address to third parties.
                    </p>
                    <p>
                      <strong>3. Responsible Use:</strong> You are responsible for
                      maintaining backups of your financial records via the export
                      utility provided in the Settings page.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <strong>1. Zero Data Collection:</strong> CapFlow does not
                      store, inspect, or process your individual transactions or
                      account balances on any remote database.
                    </p>
                    <p>
                      <strong>2. Local Storage:</strong> All financial calculations
                      are computed locally on your device via client-side IndexedDB
                      storage.
                    </p>
                    <p>
                      <strong>3. Third-Party Integrations:</strong> Optional
                      services (such as scheduled monthly summary emails) only
                      transmit aggregated monthly totals with explicit user opt-in.
                    </p>
                  </>
                )}
              </div>

              <div className="mt-6 pt-3 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPolicyModal(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
