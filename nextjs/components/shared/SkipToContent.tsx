"use client";

/**
 * Skip-to-content link for keyboard / screen-reader accessibility (Step 4.5).
 *
 * Renders a visually hidden link that becomes visible on focus, allowing
 * keyboard users to skip the navigation and jump straight to the main content.
 *
 * Usage: render once at the very top of the root layout, before any nav.
 * The main content area must have `id="main-content"`.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className={[
        // Hidden by default — only visible on keyboard focus
        "sr-only focus:not-sr-only",
        // Positioning: top-left of viewport when visible
        "focus:absolute focus:top-2 focus:left-2 focus:z-[9999]",
        // Styling
        "focus:px-4 focus:py-2 focus:rounded-xl",
        "focus:bg-[#6366F1] focus:text-white focus:font-semibold focus:text-sm",
        "focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white",
        // Transition
        "transition-all",
      ].join(" ")}
    >
      Skip to main content
    </a>
  );
}
