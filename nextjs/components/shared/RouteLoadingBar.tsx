"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function RouteLoadingBar() {
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // When pathname changes, route transition has completed!
  useEffect(() => {
    if (navigating) {
      const finishTimer = setTimeout(() => {
        setNavigating(false);
      }, 150);
      return () => clearTimeout(finishTimer);
    }
  }, [pathname, navigating]);

  // Intercept navigation link clicks across the entire app
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Skip non-page or external links
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.target === "_blank" ||
        href.startsWith("http://") ||
        href.startsWith("https://")
      ) {
        return;
      }

      // Check if already on this exact path
      const currentPath = window.location.pathname;
      if (href === currentPath) return;

      // Start the route loading animation immediately
      setNavigating(true);

      // Auto-fallback timeout in case navigation completes or cancels
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setNavigating(false);
      }, 5000);
    };

    window.addEventListener("click", handleLinkClick, { capture: true });
    return () => {
      window.removeEventListener("click", handleLinkClick, { capture: true });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {navigating && (
        <motion.div
          key="route-loading-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
        >
          <div className="h-[3px] w-full bg-transparent overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#6366F1] via-[#818CF8] to-[#10B981] shadow-[0_0_10px_rgba(99,102,241,0.85)]"
              initial={{ x: "-100%" }}
              animate={{ x: ["-100%", "-25%", "-5%"] }}
              transition={{
                duration: 2.4,
                times: [0, 0.4, 1],
                ease: "easeOut",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RouteLoadingBar;
