"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import { Suspense } from "react";
import Image from "next/image";

function ConcentricBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      <div className="absolute inset-0 bg-[#090B0E] dark:bg-[#090B0E]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] md:w-[720px] h-[520px] md:h-[720px] bg-gradient-to-tr from-indigo-600/10 via-indigo-500/5 to-transparent rounded-full blur-[100px]" />
      <svg
        className="w-full h-full opacity-45 dark:opacity-35"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="auth-ring-mask-grad" cx="50%" cy="58%" r="55%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#6366F1" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#auth-ring-mask-grad)" />

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

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  const handleGoogleAuth = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="relative min-h-dvh w-full flex flex-col justify-between overflow-x-hidden text-white select-none">
      <ConcentricBackground />

      <div className="relative z-10 w-full min-h-dvh flex flex-col justify-between md:justify-center items-center px-5 py-6 md:py-12">
        <div className="w-full max-w-[440px] md:max-w-[480px] flex-1 md:flex-initial flex flex-col justify-between md:justify-start md:bg-[#10131B]/80 md:border md:border-white/10 md:rounded-[36px] md:backdrop-blur-2xl md:p-10 md:shadow-2xl md:shadow-black/70">
          <div className="my-auto md:my-0 flex flex-col items-center w-full">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8 flex flex-col items-center"
            >
              <div className="w-20 h-20 md:w-22 md:h-22 rounded-3xl p-1 bg-white/[0.04] border border-white/10 shadow-xl shadow-indigo-500/10 flex items-center justify-center mb-5 backdrop-blur-md">
                <Image
                  src="/capflow-logo.png"
                  alt="CapFlow Logo"
                  width={80}
                  height={80}
                  className="w-full h-full object-contain rounded-2xl"
                  priority
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome to CapFlow
              </h1>
              <p className="text-sm text-zinc-400 mt-2 max-w-[300px]">
                Your finances, private and under control.
              </p>
            </motion.div>

            {/* OAuth error banner */}
            {oauthError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full mb-5 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] text-center"
              >
                {oauthError}
              </motion.div>
            )}

            {/* Auth Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="flex flex-col gap-3 w-full"
            >
              {/* Google */}
              <div className="relative">
                <button
                  onClick={handleGoogleAuth}
                  className="flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-2xl bg-[#141721] hover:bg-[#1C202E] border border-white/10 text-white font-semibold text-sm transition-all shadow-sm active:scale-[0.99] cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
                <span className="absolute -top-2 -right-2 bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  Setup
                </span>
              </div>

              {/* Facebook */}
              <button
                onClick={() => {
                  window.location.href = "/api/auth/facebook";
                }}
                className="flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-2xl bg-[#141721] hover:bg-[#1C202E] border border-white/10 text-white font-semibold text-sm transition-all shadow-sm active:scale-[0.99] cursor-pointer"
              >
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Continue with Facebook</span>
              </button>

              {/* Apple */}
              <button
                onClick={() => {
                  window.location.href = "/api/auth/apple";
                }}
                className="flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-2xl bg-[#141721] hover:bg-[#1C202E] border border-white/10 text-white font-semibold text-sm transition-all shadow-sm active:scale-[0.99] cursor-pointer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                </svg>
                <span>Continue with Apple</span>
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Continue with Email */}
              <button
                onClick={() => router.push("/auth/otp")}
                className="w-full h-14 rounded-full bg-gradient-to-r from-[#6366F1] via-[#5D5FEF] to-[#4F46E5] hover:from-[#5558E6] hover:to-[#4338CA] text-white font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-[0.98] cursor-pointer"
              >
                <Mail size={18} />
                <span>Continue with Email</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>
          </div>

          {/* Footer Note */}
          <div className="w-full text-center mt-8 md:mt-8 pt-4 pb-2 text-xs text-zinc-500 leading-relaxed">
            All your financial data is stored only on this device.{" "}
            <span className="text-indigo-400 font-medium">
              Never uploaded to any server.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  );
}
