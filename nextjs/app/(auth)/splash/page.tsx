"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/auth");
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center min-h-dvh bg-[var(--bg-primary)] cursor-pointer"
      onClick={() => router.replace("/auth")}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-4"
      >
        {/* CapFlow Logo */}
        <motion.div
          animate={{ rotate: [0, -3, 3, -3, 0] }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/30"
        >
          <Image
            src="/capflow-logo.png"
            alt="CapFlow"
            width={96}
            height={96}
            className="w-full h-full object-contain"
            priority
          />
        </motion.div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">CapFlow</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Your money, fully under control</p>
        </div>
      </motion.div>

      {/* Loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-16 flex gap-1.5"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#6366F1]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </div>
  );
}
