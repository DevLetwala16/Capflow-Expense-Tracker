"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import Image from "next/image";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  const handleGoogleAuth = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="flex-1 flex flex-col max-w-sm mx-auto w-full px-6 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="w-20 h-20 rounded-3xl overflow-hidden mx-auto mb-4 shadow-lg shadow-indigo-500/25">
          <Image
            src="/capflow-logo.png"
            alt="CapFlow"
            width={80}
            height={80}
            className="w-full h-full object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome to CapFlow</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Your finances, private and under control.
        </p>
      </motion.div>

      {/* OAuth error banner */}
      {oauthError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-sm text-[#EF4444] text-center"
        >
          {oauthError}
        </motion.div>
      )}

      {/* Auth Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col gap-3"
      >
        {/* Google */}
        <div className="relative">
          <button
            onClick={handleGoogleAuth}
            className="flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-[#1a2235] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold text-sm transition-all hover:bg-gray-50 dark:hover:bg-[#232f45] shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <span className="absolute -top-2 -right-2 bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Setup</span>
        </div>

        {/* Facebook */}
        <button disabled title="Coming soon"
          className="relative flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold text-sm opacity-50 cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Continue with Facebook
          <span className="absolute -top-2 -right-2 bg-[#6366F1] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Soon</span>
        </button>

        {/* Apple */}
        <button disabled title="Coming soon"
          className="relative flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold text-sm opacity-50 cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
          </svg>
          Continue with Apple
          <span className="absolute -top-2 -right-2 bg-[#6366F1] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Soon</span>
        </button>

        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          <span className="text-xs text-[var(--text-secondary)]">or</span>
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        <Button
          onClick={() => router.push("/auth/otp")}
          className="w-full py-3.5 rounded-2xl bg-[#F97316] hover:bg-[#ea6c0a] text-white font-semibold text-sm gap-2 h-auto"
        >
          <Mail size={16} />
          Continue with Email
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-xs text-[var(--text-secondary)] mt-8 px-4"
      >
        All your financial data is stored only on this device.{" "}
        <span className="text-[var(--accent)]">Never uploaded to any server.</span>
      </motion.p>
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
