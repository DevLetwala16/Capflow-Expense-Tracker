"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Camera,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useEMIStore } from "@/lib/store/emiStore";
import {
  requestNotificationPermission,
  requestCameraPermission,
  checkDevicePermissions,
  emitInAppNotification,
} from "@/lib/notifications/notificationEngine";

interface DevicePermissionModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function DevicePermissionModal({ forceOpen = false, onClose }: DevicePermissionModalProps) {
  const {
    hasPromptedPermissions,
    setHasPromptedPermissions,
    notificationPermission,
    cameraPermission,
    setNotificationPermission,
    setCameraPermission,
    setPushNotificationsEnabled,
    setNotifDailyReminder,
    setDailyReminderTime,
    setBudgetAlert80,
    setBudgetAlert100,
    setEmailAlertsEnabled,
  } = useSettingsStore();

  const { user } = useAuthStore();
  const { emis } = useEMIStore();

  const [isOpen, setIsOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [camGranted, setCamGranted] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Determine whether modal should be visible
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    // Automatically prompt on first entry / first login if never asked before
    if (!hasPromptedPermissions) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [forceOpen, hasPromptedPermissions]);

  // Sync initial hardware permission states
  useEffect(() => {
    checkDevicePermissions().then(({ notifications, camera }) => {
      setNotifGranted(notifications === "granted");
      setCamGranted(camera === "granted");
    });
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setHasPromptedPermissions(true);
    setIsOpen(false);
    onClose?.();
  }, [setHasPromptedPermissions, onClose]);

  const handleGrantAll = async () => {
    setRequesting(true);

    let notifResult = false;
    let camResult = false;

    // 1. Request Notification Permission & Subscribe Web Push
    try {
      const nPerm = await requestNotificationPermission(user?.id, user?.email);
      if (nPerm === "granted") {
        notifResult = true;
        setNotifGranted(true);
        setNotificationPermission("granted");
        setPushNotificationsEnabled(true);
        setNotifDailyReminder(true);
        setDailyReminderTime("21:00");
        setBudgetAlert80(true);
        setBudgetAlert100(true);
        setEmailAlertsEnabled(true);
      } else {
        setNotificationPermission(nPerm === "denied" ? "denied" : "prompt");
      }
    } catch (e) {
      console.warn("Notification permission error:", e);
    }

    // 2. Request Camera Hardware Permission
    try {
      const cPerm = await requestCameraPermission();
      if (cPerm) {
        camResult = true;
        setCamGranted(true);
        setCameraPermission("granted");
      }
    } catch (e) {
      console.warn("Camera permission error:", e);
    }

    // 3. Sync preferences with backend server
    if (user?.email) {
      try {
        await fetch("/api/user/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            emiReminders: true,
            monthlyStatement: true,
            emiEmailSync: true,
          }),
        });

        // Sync existing EMIs if available
        if (emis && emis.length > 0) {
          await fetch("/api/emis/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              emis,
              enableSync: true,
            }),
          });
        }
      } catch (syncErr) {
        console.warn("Background sync error after permission grant:", syncErr);
      }
    }

    setRequesting(false);
    setCompleted(true);
    setHasPromptedPermissions(true);

    emitInAppNotification({
      title: "🎉 Device Features Activated",
      body: "Notifications and hardware permissions are configured. You'll receive daily expense reminders & EMI alerts!",
      type: "success",
    });

    setTimeout(() => {
      setIsOpen(false);
      onClose?.();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md select-none overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 350, damping: 26 }}
        className="relative w-full max-w-lg bg-[#0E131F] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/10 text-white overflow-hidden"
      >
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center p-1.5 shadow-inner">
            <Image
              src="/capflow-logo.png"
              alt="CapFlow Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                Enable Device Permissions
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                <Sparkles size={10} />
                Recommended
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Unlock notifications, reminders & hardware features
            </p>
          </div>
        </div>

        {/* Permission Cards */}
        <div className="space-y-3 my-5">
          {/* 1. Notifications */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-indigo-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">
                  Push Notifications & Daily Reminders
                </span>
                {notifGranted ? (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Allowed
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                    Alerts
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Receive daily expense prompts, EMI due date reminders, and 80%/100% budget limit warnings.
              </p>
            </div>
          </div>

          {/* 2. Camera */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Camera size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">
                  Camera & Receipt Scanner
                </span>
                {camGranted ? (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Allowed
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Hardware
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Scan physical receipts and bill-splitting QR codes directly from your device camera without leaving the app.
              </p>
            </div>
          </div>

          {/* 3. Haptics & Local Privacy */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Smartphone size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">
                  Haptics & Vibration Alerts
                </span>
                <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Ready
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Vibration feedback for quick logging confirmations and critical budget threshold warnings.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-zinc-400 text-[11px] mb-5">
          <ShieldCheck size={16} className="text-indigo-400 flex-shrink-0" />
          <span>
            Hardware access is strictly used locally on your device for receipts & alerts.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleGrantAll}
            disabled={requesting || completed}
            className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {requesting ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                <span>Requesting Permissions...</span>
              </>
            ) : completed ? (
              <>
                <CheckCircle2 size={17} className="text-emerald-300" />
                <span>Permissions Granted!</span>
              </>
            ) : (
              <>
                <span>Allow & Enable Features</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 font-semibold text-xs transition-colors cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </motion.div>
    </div>
  );
}
