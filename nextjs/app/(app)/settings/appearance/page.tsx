"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, RotateCcw, Paintbrush } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  useSettingsStore,
  FontScale,
  Density,
  AccentPreset,
} from "@/lib/store/settingsStore";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_STEPS: { key: FontScale; label: string; rem: string }[] = [
  { key: "small",   label: "Small",       rem: "0.85rem" },
  { key: "medium",  label: "Medium",      rem: "0.92rem" },
  { key: "default", label: "Default",     rem: "1rem"    },
  { key: "large",   label: "Large",       rem: "1.1rem"  },
  { key: "xlarge",  label: "Extra Large", rem: "1.25rem" },
];

const ACCENT_PRESETS: { key: AccentPreset; hex: string; label: string }[] = [
  { key: "indigo",  hex: "#6366F1", label: "Indigo"  },
  { key: "emerald", hex: "#10B981", label: "Emerald" },
  { key: "purple",  hex: "#9333EA", label: "Purple"  },
  { key: "orange",  hex: "#F97316", label: "Orange"  },
  { key: "blue",    hex: "#3B82F6", label: "Blue"    },
];

function presetHex(preset: AccentPreset): string {
  return ACCENT_PRESETS.find((p) => p.key === preset)?.hex ?? "#6366F1";
}

// Resolve the effective accent: custom takes precedence over preset
function effectiveAccent(preset: AccentPreset, custom: string): string {
  return custom.trim() !== "" ? custom.trim() : presetHex(preset);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
      {children}
    </p>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

function CardRow({
  label,
  sub,
  noBorder = false,
  children,
}: {
  label: string;
  sub?: string;
  noBorder?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3.5 ${
        noBorder ? "" : "border-t border-[var(--border-color)]"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)]">{label}</p>
        {sub && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{sub}</p>
        )}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? "bg-[#6366F1]" : "bg-[var(--border-color)]"
      }`}
      style={checked ? { backgroundColor: "var(--accent)" } : undefined}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppearancePage() {
  const router = useRouter();
  const { setTheme: setNextTheme } = useTheme();

  const {
    fontScale,   setFontScale,
    density,     setDensity,
    accentPreset, setAccentPreset,
    customAccent, setCustomAccent,
    customBackground, setCustomBackground,
    customSurface, setCustomSurface,
    timeBasedTheme, setTimeBasedTheme,
  } = useSettingsStore();

  // Local hex input state
  const [hexInput, setHexInput] = useState<string>(customAccent || "");
  const [hexError, setHexError] = useState(false);
  const [bgInput, setBgInput] = useState<string>(customBackground || "");
  const [bgError, setBgError] = useState(false);
  const [surfaceInput, setSurfaceInput] = useState<string>(customSurface || "");
  const [surfaceError, setSurfaceError] = useState(false);

  const fontIndex = FONT_STEPS.findIndex((s) => s.key === fontScale);
  const activeFontStep = FONT_STEPS[fontIndex === -1 ? 2 : fontIndex];

  // ── Apply CSS vars ──────────────────────────────────────────────────────────

  const applyFontScale = useCallback((scale: FontScale) => {
    const step = FONT_STEPS.find((s) => s.key === scale);
    if (step) document.documentElement.style.setProperty("--font-scale", step.rem);
  }, []);

  const applyDensity = useCallback((d: Density) => {
    document.documentElement.style.setProperty("--density", d === "compact" ? "1" : "0");
  }, []);

  const applyAccent = useCallback((hex: string) => {
    document.documentElement.style.setProperty("--accent", hex);
  }, []);

  const applyBackground = useCallback((hex: string) => {
    if (hex && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
      document.documentElement.style.setProperty("--bg-primary", hex);
    } else {
      document.documentElement.style.removeProperty("--bg-primary");
    }
  }, []);

  const applySurface = useCallback((hex: string) => {
    if (hex && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
      document.documentElement.style.setProperty("--bg-card", hex);
    } else {
      document.documentElement.style.removeProperty("--bg-card");
    }
  }, []);

  // On mount: apply all stored settings
  useEffect(() => {
    applyFontScale(fontScale);
    applyDensity(density);
    applyAccent(effectiveAccent(accentPreset, customAccent));
    if (customBackground) applyBackground(customBackground);
    if (customSurface) applySurface(customSurface);
    setHexInput(customAccent || "");
    setBgInput(customBackground || "");
    setSurfaceInput(customSurface || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Time-based theme: run an interval to check the hour ────────────────────
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyTimeBased = useCallback(() => {
    const hour = new Date().getHours();
    // Dark between 20 (8 PM) and 06 (7 AM inclusive)
    const isDarkHour = hour >= 20 || hour < 7;
    setNextTheme(isDarkHour ? "dark" : "light");
  }, [setNextTheme]);

  useEffect(() => {
    if (timeBasedTheme) {
      applyTimeBased();
      timeIntervalRef.current = setInterval(applyTimeBased, 60_000);
    } else {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    }
    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    };
  }, [timeBasedTheme, applyTimeBased]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleFontSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const idx = Number(e.target.value);
    const step = FONT_STEPS[idx];
    setFontScale(step.key);
    applyFontScale(step.key);
  }

  function handleDensity(d: Density) {
    setDensity(d);
    applyDensity(d);
  }

  function handlePreset(preset: AccentPreset) {
    setAccentPreset(preset);
    setCustomAccent("");
    setHexInput("");
    setHexError(false);
    applyAccent(presetHex(preset));
  }

  function handleHexInput(raw: string) {
    setHexInput(raw);
    const val = raw.startsWith("#") ? raw : `#${raw}`;
    const valid = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val);
    setHexError(!valid && raw.trim() !== "");
    if (valid) {
      setCustomAccent(val);
      applyAccent(val);
    }
  }

  function handleColorPicker(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value;
    setCustomAccent(hex);
    setHexInput(hex);
    setHexError(false);
    applyAccent(hex);
  }

  function handleBgChange(hex: string) {
    setBgInput(hex);
    const val = hex.startsWith("#") ? hex : `#${hex}`;
    const valid = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val);
    setBgError(!valid && hex.trim() !== "");
    if (valid) {
      setCustomBackground(val);
      applyBackground(val);
    }
  }

  function handleSurfaceChange(hex: string) {
    setSurfaceInput(hex);
    const val = hex.startsWith("#") ? hex : `#${hex}`;
    const valid = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val);
    setSurfaceError(!valid && hex.trim() !== "");
    if (valid) {
      setCustomSurface(val);
      applySurface(val);
    }
  }

  function handleResetToPreset() {
    setCustomAccent("");
    setCustomBackground("");
    setCustomSurface("");
    setHexInput("");
    setBgInput("");
    setSurfaceInput("");
    setHexError(false);
    setBgError(false);
    setSurfaceError(false);
    applyAccent(presetHex(accentPreset));
    applyBackground("");
    applySurface("");
  }

  function handleTimeBasedTheme(val: boolean) {
    setTimeBasedTheme(val);
    if (!val) {
      // Restore store theme when disabling
      setNextTheme(useSettingsStore.getState().theme ?? "system");
    }
  }

  // ── Preview font size ───────────────────────────────────────────────────────
  const previewSize = activeFontStep.rem;

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* ── Header ── */}
      <header className="px-4 py-5 border-b border-[var(--border-color)] flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors -ml-1 flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-[var(--text-primary)]" />
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Appearance</h1>
      </header>

      <div className="px-4 py-5 space-y-5 max-w-lg mx-auto pb-10">
        {/* ═══════════════════════════════════════════════════════════════════
            1. Font Size
        ════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
          className="space-y-1.5"
        >
          <SectionLabel>Font Size</SectionLabel>
          <Card>
            <div className="px-4 pt-4 pb-2">
              {/* Step labels */}
              <div className="flex justify-between mb-2">
                {FONT_STEPS.map((step) => (
                  <span
                    key={step.key}
                    className={`text-[10px] font-medium transition-colors ${
                      step.key === activeFontStep.key
                        ? "text-[var(--accent)] font-bold"
                        : "text-[var(--text-secondary)]"
                    }`}
                    style={{ color: step.key === activeFontStep.key ? "var(--accent)" : undefined }}
                  >
                    {step.label}
                  </span>
                ))}
              </div>

              {/* Slider */}
              <input
                type="range"
                min={0}
                max={FONT_STEPS.length - 1}
                step={1}
                value={FONT_STEPS.findIndex((s) => s.key === fontScale)}
                onChange={handleFontSlider}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${
                    (FONT_STEPS.findIndex((s) => s.key === fontScale) / (FONT_STEPS.length - 1)) * 100
                  }%, var(--border-color) ${
                    (FONT_STEPS.findIndex((s) => s.key === fontScale) / (FONT_STEPS.length - 1)) * 100
                  }%, var(--border-color) 100%)`,
                }}
              />

              {/* Live preview */}
              <div className="mt-4 p-3 rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border-color)]">
                <p
                  className="text-[var(--text-secondary)] leading-relaxed transition-all duration-200"
                  style={{ fontSize: previewSize }}
                >
                  The quick brown fox jumps over the lazy dog.
                </p>
                <p
                  className="text-[var(--text-primary)] font-semibold mt-0.5 transition-all duration-200"
                  style={{ fontSize: previewSize }}
                >
                  CapFlow · Expense Tracker
                </p>
              </div>

              <p className="text-center text-xs text-[var(--text-secondary)] mt-2">
                Current:{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {activeFontStep.label}
                </span>{" "}
                ({activeFontStep.rem})
              </p>
            </div>
          </Card>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════
            2. Layout Density
        ════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.06 }}
          className="space-y-1.5"
        >
          <SectionLabel>Layout Density</SectionLabel>
          <Card>
            <div className="px-4 py-3.5">
              <div className="flex gap-2">
                {(["standard", "compact"] as Density[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => handleDensity(d)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      density === d
                        ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10 font-semibold"
                        : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                    }`}
                    style={density === d ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
                  >
                    {d === "standard" ? "Standard" : "Compact"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-2 text-center">
                {density === "compact"
                  ? "Tighter spacing — more content visible at once"
                  : "Comfortable spacing — easier to read and tap"}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════
            3. Accent Color Presets
        ════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className="space-y-1.5"
        >
          <SectionLabel>Accent Color</SectionLabel>
          <Card>
            <div className="px-4 py-3.5">
              <p className="text-xs text-[var(--text-secondary)] mb-3">Preset colors</p>
              <div className="flex items-center gap-3">
                {ACCENT_PRESETS.map((preset) => {
                  const isActive = accentPreset === preset.key && customAccent.trim() === "";
                  return (
                    <button
                      key={preset.key}
                      onClick={() => handlePreset(preset.key)}
                      aria-label={preset.label}
                      title={preset.label}
                      className="relative w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-card)]"
                      style={{
                        backgroundColor: preset.hex,
                        boxShadow: isActive ? `0 0 0 3px var(--bg-card), 0 0 0 5px ${preset.hex}` : undefined,
                      }}
                    >
                      {isActive && <Check size={16} className="text-white" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Custom Theme Builder (Accent, Background, Surface) ── */}
            <div className="border-t border-[var(--border-color)] px-4 py-3.5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paintbrush size={14} className="text-[var(--text-secondary)]" />
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Custom Theme Builder</p>
                </div>
                {(customAccent || customBackground || customSurface) && (
                  <button
                    onClick={handleResetToPreset}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <RotateCcw size={10} />
                    Reset Palette
                  </button>
                )}
              </div>

              {/* 1. Accent Color */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-[var(--text-secondary)] font-medium">Primary Accent Color</label>
                <div className="flex items-center gap-3">
                  <label className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-[var(--border-color)] cursor-pointer flex-shrink-0 hover:scale-105 transition-transform">
                    <input
                      type="color"
                      value={customAccent.trim() !== "" ? customAccent : presetHex(accentPreset)}
                      onChange={handleColorPicker}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span
                      className="block w-full h-full rounded-full"
                      style={{
                        backgroundColor: customAccent.trim() !== "" ? customAccent : presetHex(accentPreset),
                      }}
                    />
                  </label>
                  <input
                    type="text"
                    value={hexInput}
                    placeholder={presetHex(accentPreset)}
                    onChange={(e) => handleHexInput(e.target.value)}
                    maxLength={7}
                    className={`flex-1 px-3 py-1.5 text-xs rounded-xl border bg-[var(--bg-card-hover)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none transition-colors font-mono ${
                      hexError
                        ? "border-[#EF4444] focus:border-[#EF4444]"
                        : "border-[var(--border-color)] focus:border-[var(--accent)]"
                    }`}
                  />
                </div>
              </div>

              {/* 2. Background Color */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-[var(--text-secondary)] font-medium">Custom Background Color</label>
                <div className="flex items-center gap-3">
                  <label className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-[var(--border-color)] cursor-pointer flex-shrink-0 hover:scale-105 transition-transform">
                    <input
                      type="color"
                      value={customBackground || "#0F1115"}
                      onChange={(e) => handleBgChange(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span
                      className="block w-full h-full rounded-full"
                      style={{ backgroundColor: customBackground || "var(--bg-primary)" }}
                    />
                  </label>
                  <input
                    type="text"
                    value={bgInput}
                    placeholder="e.g. #0F1115 or leave default"
                    onChange={(e) => handleBgChange(e.target.value)}
                    maxLength={7}
                    className={`flex-1 px-3 py-1.5 text-xs rounded-xl border bg-[var(--bg-card-hover)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none transition-colors font-mono ${
                      bgError
                        ? "border-[#EF4444] focus:border-[#EF4444]"
                        : "border-[var(--border-color)] focus:border-[var(--accent)]"
                    }`}
                  />
                </div>
              </div>

              {/* 3. Surface / Card Color */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-[var(--text-secondary)] font-medium">Custom Surface / Card Color</label>
                <div className="flex items-center gap-3">
                  <label className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-[var(--border-color)] cursor-pointer flex-shrink-0 hover:scale-105 transition-transform">
                    <input
                      type="color"
                      value={customSurface || "#111827"}
                      onChange={(e) => handleSurfaceChange(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span
                      className="block w-full h-full rounded-full"
                      style={{ backgroundColor: customSurface || "var(--bg-card)" }}
                    />
                  </label>
                  <input
                    type="text"
                    value={surfaceInput}
                    placeholder="e.g. #111827 or leave default"
                    onChange={(e) => handleSurfaceChange(e.target.value)}
                    maxLength={7}
                    className={`flex-1 px-3 py-1.5 text-xs rounded-xl border bg-[var(--bg-card-hover)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none transition-colors font-mono ${
                      surfaceError
                        ? "border-[#EF4444] focus:border-[#EF4444]"
                        : "border-[var(--border-color)] focus:border-[var(--accent)]"
                    }`}
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════
            4. Theme
        ════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
          className="space-y-1.5"
        >
          <SectionLabel>Theme</SectionLabel>
          <Card>
            {/* Three-way Light / System / Dark toggle */}
            <div className="px-4 py-3.5">
              <ThemeToggle className="w-full" />
            </div>

            {/* Time-based auto-switch */}
            <div className="border-t border-[var(--border-color)] flex items-start justify-between gap-3 px-4 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)]">Time-based auto-switch</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                  Automatically switches to Dark mode between{" "}
                  <span className="font-semibold">8 PM – 7 AM</span> and Light mode during the day.
                  Overrides the selector above.
                </p>
              </div>
              <div className="flex-shrink-0 pt-0.5">
                <ToggleSwitch checked={timeBasedTheme} onChange={handleTimeBasedTheme} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Bottom hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.28 }}
          className="text-center text-xs text-[var(--text-secondary)] pb-2"
        >
          Changes apply immediately and are saved automatically.
        </motion.p>
      </div>

      {/* ── Slider thumb styles (injected once) ── */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: 2px solid var(--bg-card);
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: 2px solid var(--bg-card);
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        }
        input[type="range"]:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
