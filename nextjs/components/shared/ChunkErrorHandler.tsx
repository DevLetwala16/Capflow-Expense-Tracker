"use client";

import { useEffect } from "react";

/**
 * Catches stale chunk loading errors and outdated build manifests,
 * clearing outdated browser/service-worker caches and seamlessly refreshing to the latest bundle.
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // In development mode:
    // If a Service Worker was previously registered (e.g. from testing a production build or PWA),
    // unregister it immediately and clear CacheStorage so it cannot intercept dev server requests.
    if (process.env.NODE_ENV === "development") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister().then(() => {
              console.log("[CapFlow Dev] Unregistered lingering Service Worker:", reg.scope);
            });
          }
        });
      }

      if ("caches" in window && window.caches) {
        window.caches.keys().then((keys) => {
          for (const key of keys) {
            window.caches.delete(key);
          }
        });
      }

      // Do NOT attach automatic reload listeners in development.
      // Next.js Fast Refresh handles development hot-reloading.
      return;
    }

    // In production mode:
    // Only intercept genuine dynamic chunk loading failures caused by a new build deployment.
    const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const errorMsg =
        "message" in event
          ? event.message
          : (event.reason?.message || String(event.reason || ""));

      const isChunkLoadError =
        errorMsg.includes("Loading chunk") ||
        errorMsg.includes("ChunkLoadError") ||
        errorMsg.includes("Loading CSS chunk") ||
        errorMsg.includes("Failed to fetch dynamically imported module");

      if (isChunkLoadError) {
        console.warn("[CapFlow] Outdated build chunk detected. Updating to latest build...", errorMsg);

        // Throttle recovery reload to at most once per 30 seconds
        const lastReload = sessionStorage.getItem("capflow_stale_chunk_recovery");
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 30000) {
          sessionStorage.setItem("capflow_stale_chunk_recovery", now.toString());

          const doReload = () => {
            window.location.reload();
          };

          if ("caches" in window && window.caches) {
            window.caches
              .keys()
              .then((keys) => Promise.all(keys.map((k) => window.caches.delete(k))))
              .catch(() => {})
              .finally(doReload);
          } else {
            doReload();
          }
        }
      }
    };

    window.addEventListener("error", handleChunkError);
    window.addEventListener("unhandledrejection", handleChunkError);

    return () => {
      window.removeEventListener("error", handleChunkError);
      window.removeEventListener("unhandledrejection", handleChunkError);
    };
  }, []);

  return null;
}
