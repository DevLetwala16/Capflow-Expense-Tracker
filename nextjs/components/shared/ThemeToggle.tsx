"use client";

import { useTheme } from "next-themes";
import { Sun, Monitor, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const options = [
    { value: "light", icon: <Sun size={13} />, label: "Light" },
    { value: "system", icon: <Monitor size={13} />, label: "System" },
    { value: "dark", icon: <Moon size={13} />, label: "Dark" },
  ];

  return (
    <div className={`flex items-center gap-1 p-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
            theme === opt.value
              ? "bg-[#6366F1] text-white shadow-sm font-semibold"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
          }`}
          aria-label={`${opt.label} theme`}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
