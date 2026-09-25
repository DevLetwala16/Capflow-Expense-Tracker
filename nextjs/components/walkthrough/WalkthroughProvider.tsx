"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useWalkthroughStore } from "@/lib/store/walkthroughStore";
import { AppWalkthroughModal } from "./AppWalkthroughModal";
import { LiveSpotlightTour } from "./LiveSpotlightTour";

export function WalkthroughProvider() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const {
    isOpen,
    hasSeenWalkthrough,
    showOnSignIn,
    openWalkthrough,
  } = useWalkthroughStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Do not trigger on auth or splash screens
    if (pathname.startsWith("/auth") || pathname.startsWith("/splash")) {
      return;
    }

    // 1. Check if user just signed in from login screen
    const justSignedIn =
      typeof window !== "undefined" &&
      localStorage.getItem("capflow_just_signed_in") === "true";

    if (justSignedIn) {
      localStorage.removeItem("capflow_just_signed_in");
      sessionStorage.setItem("capflow_session_walkthrough_shown", "true");
      const timer = setTimeout(() => {
        openWalkthrough("showcase");
      }, 500);
      return () => clearTimeout(timer);
    }

    // 2. Check if first time new user
    if (!hasSeenWalkthrough) {
      sessionStorage.setItem("capflow_session_walkthrough_shown", "true");
      const timer = setTimeout(() => {
        openWalkthrough("showcase");
      }, 600);
      return () => clearTimeout(timer);
    }

    // 3. If showOnSignIn is enabled, trigger once per session when accessing app
    if (showOnSignIn) {
      const alreadyShownThisSession =
        typeof window !== "undefined" &&
        sessionStorage.getItem("capflow_session_walkthrough_shown") === "true";

      if (!alreadyShownThisSession) {
        sessionStorage.setItem("capflow_session_walkthrough_shown", "true");
        const timer = setTimeout(() => {
          openWalkthrough("showcase");
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [mounted, pathname, hasSeenWalkthrough, showOnSignIn, openWalkthrough]);

  if (!mounted) return null;

  return (
    <>
      <AppWalkthroughModal />
      <LiveSpotlightTour />
    </>
  );
}
