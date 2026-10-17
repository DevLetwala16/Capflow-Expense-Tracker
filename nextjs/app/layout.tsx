import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { SkipToContent } from "@/components/shared/SkipToContent";
import { ChunkErrorHandler } from "@/components/shared/ChunkErrorHandler";

export const metadata: Metadata = {
  title: "CapFlow — Expense Tracker",
  description: "Smart mobile-first expense tracker. All data stays on your device.",
  manifest: "/manifest.json",
  keywords: ["expense tracker", "budget", "finance", "PWA", "offline"],
  icons: {
    icon: [
      { url: "/capflow-logo.png", type: "image/png" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/capflow-logo.png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CapFlow",
  },
  openGraph: {
    title: "CapFlow — Expense Tracker",
    description: "Smart mobile-first expense tracker. All data stays on your device.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366F1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* ── Accessibility: skip navigation for keyboard users (Step 4.5) ── */}
        <SkipToContent />
        <ChunkErrorHandler />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <div id="main-content">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
