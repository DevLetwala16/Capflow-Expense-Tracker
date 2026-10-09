import { create } from "zustand";

/**
 * 3 hours cache TTL in milliseconds.
 * 3 hours = 3 * 60 * 60 * 1000 = 10,800,000 ms.
 */
export const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

export const STORAGE_KEY = "capflow_exchange_rates_v1";

export interface ExchangeRateData {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

export const CURRENCIES = [
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  CHF: "Fr",
  CNY: "¥",
  SGD: "S$",
  AED: "د.إ",
  MXN: "MX$",
  BRL: "R$",
  KRW: "₩",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  NZD: "NZ$",
  HKD: "HK$",
  ZAR: "R",
  RUB: "₽",
  TRY: "₺",
  THB: "฿",
  IDR: "Rp",
  MYR: "RM",
  PKR: "₨",
  BDT: "৳",
  VND: "₫",
  PHP: "₱",
  EGP: "E£",
};

/**
 * Built-in fallback exchange rates (relative to USD = 1.0)
 * Used if offline and no cache is present.
 */
export const DEFAULT_FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 86.8,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 153.2,
  CAD: 1.38,
  AUD: 1.54,
  CHF: 0.88,
  CNY: 7.23,
  SGD: 1.34,
  AED: 3.67,
  MXN: 19.8,
  BRL: 5.75,
  KRW: 1390.0,
  SEK: 10.6,
  NOK: 10.9,
  DKK: 6.85,
  NZD: 1.68,
  HKD: 7.78,
  ZAR: 18.2,
  RUB: 98.5,
  TRY: 34.5,
  THB: 34.2,
  IDR: 15800.0,
  MYR: 4.42,
  PKR: 278.0,
  BDT: 120.0,
  VND: 25400.0,
  PHP: 58.5,
  EGP: 49.3,
};

/**
 * Loads cached exchange rates from localStorage if within the 3-hour TTL.
 */
export function getLocalCachedRates(): ExchangeRateData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: ExchangeRateData = JSON.parse(raw);
    if (parsed && parsed.rates && typeof parsed.timestamp === "number") {
      return parsed;
    }
  } catch (e) {
    console.warn("Failed to parse cached exchange rates:", e);
  }
  return null;
}

/**
 * Saves rates to localStorage with current timestamp.
 */
export function saveRatesToCache(rates: Record<string, number>, base: string = "USD") {
  if (typeof window === "undefined") return;
  try {
    const data: ExchangeRateData = {
      base,
      rates,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save exchange rates cache:", e);
  }
}

/**
 * Fetches latest exchange rates from open APIs, respecting 3-hour cache TTL.
 */
export async function fetchLiveExchangeRates(force: boolean = false): Promise<Record<string, number>> {
  const cached = getLocalCachedRates();
  const now = Date.now();

  // If not forced and cache is less than 3 hours old, return cached rates
  if (!force && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.rates;
  }

  // Try primary endpoint (Open Exchange Rates / ER-API)
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.result === "success" && data.rates) {
        saveRatesToCache(data.rates, "USD");
        return data.rates;
      }
    }
  } catch (err) {
    console.warn("Primary exchange rate API failed, trying fallback...", err);
  }

  // Try fallback endpoint
  try {
    const resFallback = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      cache: "no-store",
    });
    if (resFallback.ok) {
      const dataFallback = await resFallback.json();
      if (dataFallback && dataFallback.rates) {
        saveRatesToCache(dataFallback.rates, "USD");
        return dataFallback.rates;
      }
    }
  } catch (err) {
    console.warn("Fallback exchange rate API failed:", err);
  }

  // If offline or failed, use existing cache (even if older than 3 hours) or default rates
  if (cached && cached.rates) {
    return cached.rates;
  }

  return DEFAULT_FALLBACK_RATES;
}

/**
 * Converts an amount from one currency to another using the provided exchange rates table.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (!amount || isNaN(amount)) return 0;
  const from = (fromCurrency || "USD").toUpperCase();
  const to = (toCurrency || "USD").toUpperCase();
  if (from === to) return amount;

  const rateFrom = rates[from] ?? DEFAULT_FALLBACK_RATES[from] ?? 1;
  const rateTo = rates[to] ?? DEFAULT_FALLBACK_RATES[to] ?? 1;

  // Base is USD:
  // (amount / rateFrom) converts from original to USD
  // * rateTo converts from USD to target currency
  const inUSD = amount / rateFrom;
  const converted = inUSD * rateTo;

  // Round to 2 decimal places
  return Math.round(converted * 100) / 100;
}

interface ExchangeRateStoreState {
  rates: Record<string, number>;
  lastUpdated: number;
  loading: boolean;
  error: string | null;
  fetchRates: (force?: boolean) => Promise<void>;
  convert: (amount: number, from: string, to: string) => number;
}

export const useExchangeRateStore = create<ExchangeRateStoreState>((set, get) => ({
  rates: (() => {
    const cached = getLocalCachedRates();
    return cached?.rates || DEFAULT_FALLBACK_RATES;
  })(),
  lastUpdated: (() => {
    const cached = getLocalCachedRates();
    return cached?.timestamp || 0;
  })(),
  loading: false,
  error: null,

  fetchRates: async (force = false) => {
    const { lastUpdated, loading } = get();
    const now = Date.now();

    // Check if within 3 hours unless force is true
    if (!force && lastUpdated > 0 && now - lastUpdated < CACHE_TTL_MS) {
      return;
    }

    if (loading) return;
    set({ loading: true, error: null });

    try {
      const freshRates = await fetchLiveExchangeRates(force);
      set({
        rates: freshRates,
        lastUpdated: Date.now(),
        loading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch exchange rates";
      set({
        loading: false,
        error: message,
      });
    }
  },

  convert: (amount: number, from: string, to: string) => {
    return convertCurrency(amount, from, to, get().rates);
  },
}));
