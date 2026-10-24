/**
 * UPI & Mobile Payment Link Utilities for CapFlow
 * Supports Google Pay, PhonePe, Paytm, BHIM, and system UPI choosers on Android and iOS.
 */

export interface ParsedUpiData {
  pa?: string; // Payee address / VPA (e.g. rahul@oksbi)
  pn?: string; // Payee name
  am?: string; // Amount
  cu?: string; // Currency
  tn?: string; // Note / transaction note
  tr?: string; // Transaction reference
  mc?: string; // Merchant code
}

/**
 * Parses a standard UPI URI (upi://pay?pa=...&pn=...)
 */
export function parseUpiUri(uri: string): ParsedUpiData | null {
  if (!uri) return null;
  const cleanUri = uri.trim();

  // Try standard URL parse
  try {
    const urlString = cleanUri.includes("://") ? cleanUri : `upi://pay?${cleanUri}`;
    const url = new URL(urlString);
    const pa = url.searchParams.get("pa");
    if (pa) {
      return {
        pa: decodeURIComponent(pa),
        pn: url.searchParams.get("pn") ? decodeURIComponent(url.searchParams.get("pn")!) : undefined,
        am: url.searchParams.get("am") || undefined,
        cu: url.searchParams.get("cu") || "INR",
        tn: url.searchParams.get("tn") ? decodeURIComponent(url.searchParams.get("tn")!) : undefined,
        tr: url.searchParams.get("tr") || undefined,
        mc: url.searchParams.get("mc") || undefined,
      };
    }
  } catch {
    // regex fallback below
  }

  // Regex fallback
  const paMatch = cleanUri.match(/[?&]pa=([^&]+)/i);
  if (paMatch) {
    const pnMatch = cleanUri.match(/[?&]pn=([^&]+)/i);
    const amMatch = cleanUri.match(/[?&]am=([^&]+)/i);
    const tnMatch = cleanUri.match(/[?&]tn=([^&]+)/i);
    return {
      pa: decodeURIComponent(paMatch[1]),
      pn: pnMatch ? decodeURIComponent(pnMatch[1]) : undefined,
      am: amMatch ? decodeURIComponent(amMatch[1]) : undefined,
      cu: "INR",
      tn: tnMatch ? decodeURIComponent(tnMatch[1]) : undefined,
    };
  }

  // If text itself looks like a UPI ID (e.g. name@bank or 9876543210@paytm)
  if (/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(cleanUri)) {
    return {
      pa: cleanUri,
      cu: "INR",
    };
  }

  return null;
}

/**
 * Builds a standard UPI query string
 */
export function buildUpiQueryString(params: {
  pa: string;
  pn: string;
  am?: number | string;
  cu?: string;
  tn?: string;
}): string {
  const { pa, pn, am, cu = "INR", tn = "CapFlow Settlement" } = params;
  const cleanPa = pa.trim();
  const cleanPn = (pn || "Payee").trim();

  let query = `pa=${encodeURIComponent(cleanPa)}&pn=${encodeURIComponent(cleanPn)}&cu=${encodeURIComponent(cu)}`;

  if (am !== undefined && Number(am) > 0) {
    query += `&am=${encodeURIComponent(Number(am).toFixed(2))}`;
  }

  if (tn) {
    query += `&tn=${encodeURIComponent(tn)}`;
  }

  return query;
}

/**
 * Builds a standard UPI URI
 */
export function buildUpiUri(params: {
  pa: string;
  pn: string;
  am?: number | string;
  cu?: string;
  tn?: string;
}): string {
  const query = buildUpiQueryString(params);
  return `upi://pay?${query}`;
}

export type PaymentAppType = "gpay" | "phonepe" | "paytm" | "bhim" | "generic";

export interface PaymentAppInfo {
  id: PaymentAppType;
  name: string;
  color: string;
  bgLight: string;
  textColor: string;
  androidPackage: string;
  iosSchemePrefix: string;
}

export const PAYMENT_APPS: PaymentAppInfo[] = [
  {
    id: "gpay",
    name: "Google Pay",
    color: "#4285F4",
    bgLight: "bg-[#4285F4]/10",
    textColor: "text-[#4285F4]",
    androidPackage: "com.google.android.apps.nbu.paisa.user",
    iosSchemePrefix: "tez://upi/pay?",
  },
  {
    id: "phonepe",
    name: "PhonePe",
    color: "#5F259F",
    bgLight: "bg-[#5F259F]/10",
    textColor: "text-[#5F259F]",
    androidPackage: "com.phonepe.app",
    iosSchemePrefix: "phonepe://pay?",
  },
  {
    id: "paytm",
    name: "Paytm",
    color: "#00BAF2",
    bgLight: "bg-[#00BAF2]/10",
    textColor: "text-[#00BAF2]",
    androidPackage: "net.one97.paytm",
    iosSchemePrefix: "paytmmp://pay?",
  },
  {
    id: "bhim",
    name: "BHIM",
    color: "#0078D7",
    bgLight: "bg-[#0078D7]/10",
    textColor: "text-[#0078D7]",
    androidPackage: "in.org.npci.upiapp",
    iosSchemePrefix: "bhim://upi/pay?",
  },
  {
    id: "generic",
    name: "Any UPI App",
    color: "#10B981",
    bgLight: "bg-[#10B981]/10",
    textColor: "text-[#10B981]",
    androidPackage: "",
    iosSchemePrefix: "upi://pay?",
  },
];

/**
 * Checks if current platform is Android
 */
export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent || "");
}

/**
 * Checks if current platform is iOS
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent || "");
}

/**
 * Builds the best URL/Intent link for a specific payment app
 */
export function getAppPaymentUri(
  app: PaymentAppType,
  params: {
    pa: string;
    pn: string;
    am?: number | string;
    cu?: string;
    tn?: string;
  }
): string {
  const query = buildUpiQueryString(params);
  const genericUri = `upi://pay?${query}`;

  const appInfo = PAYMENT_APPS.find((a) => a.id === app);
  const onAndroid = isAndroid();
  const onIOS = isIOS();

  if (app === "generic") {
    if (onAndroid) {
      return `intent://pay?${query}#Intent;scheme=upi;end`;
    }
    return genericUri;
  }

  if (onAndroid && appInfo?.androidPackage) {
    // Android Intent URL targeting exact package
    return `intent://pay?${query}#Intent;scheme=upi;package=${appInfo.androidPackage};end`;
  }

  if (onIOS && appInfo?.iosSchemePrefix) {
    return `${appInfo.iosSchemePrefix}${query}`;
  }

  // Fallback schemes
  switch (app) {
    case "gpay":
      return `tez://upi/pay?${query}`;
    case "phonepe":
      return `phonepe://pay?${query}`;
    case "paytm":
      return `paytmmp://pay?${query}`;
    case "bhim":
      return `bhim://upi/pay?${query}`;
    default:
      return genericUri;
  }
}

/**
 * Launches payment app on mobile device with immediate fallback
 */
export function openPaymentApp(
  app: PaymentAppType,
  params: {
    pa: string;
    pn: string;
    am?: number | string;
    cu?: string;
    tn?: string;
  }
): boolean {
  if (typeof window === "undefined") return false;

  const targetUri = getAppPaymentUri(app, params);
  const genericUri = buildUpiUri(params);

  try {
    // Dynamic hidden link dispatch (most reliable across mobile browsers without popup blocker)
    const link = document.createElement("a");
    link.href = targetUri;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Fallback to generic upi:// if app-specific intent fails after 1.5s
    if (app !== "generic") {
      setTimeout(() => {
        window.location.href = genericUri;
      }, 1500);
    }
    return true;
  } catch {
    window.location.href = genericUri;
    return false;
  }
}

/**
 * Downloads an image (from Cloudinary URL or Data URL) with a specific filename
 */
export async function downloadQrImage(imageUrl: string, filename: string): Promise<void> {
  if (!imageUrl || typeof window === "undefined") return;

  try {
    const res = await fetch(imageUrl, { mode: "cors" });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
