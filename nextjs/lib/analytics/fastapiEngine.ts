/**
 * fastapiEngine.ts
 * ────────────────
 * Frontend adapter that calls the CapFlow FastAPI analytics microservice.
 *
 * Contract: identical to jsEngine.computeAnalytics — same parameters, same
 * AnalyticsResult return type (DailyTrendEntry carries extra optional fields
 * when the FastAPI service responds successfully).
 *
 * Fallback: on any network error or non-2xx response the adapter silently
 * falls back to jsEngine.computeAnalytics and logs a console warning so the
 * UI is never left broken.
 */

import {
  computeAnalytics as jsComputeAnalytics,
  AnalyticsResult,
  DateRange,
} from "@/lib/analytics/jsEngine";

// Re-export shared types so callers can import from a single place.
export type {
  DonutSlice,
  StackedBarEntry,
  DailyTrendEntry,
  InsightItem,
  AnalyticsResult,
  DateRange,
} from "@/lib/analytics/jsEngine";

import type { Transaction, Category } from "@/lib/db";

// ─── Payload shape sent to POST /analyze ─────────────────────────────────────

interface AnalyzePayload {
  transactions: Transaction[];
  categories: Category[];
  range: DateRange;
  groupBy: "category" | "paymentMethod";
  currency: string;
  numMonths: number;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Computes analytics by calling the FastAPI microservice.
 *
 * Falls back to the pure-JS engine if:
 *   - `NEXT_PUBLIC_FASTAPI_URL` is not set
 *   - The network request fails (TypeError / fetch error)
 *   - The server returns a non-2xx status code
 */
export async function computeAnalytics(
  txs: Transaction[],
  categories: Category[],
  range: DateRange,
  groupBy: "category" | "paymentMethod",
  currency: string
): Promise<AnalyticsResult> {
  const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;

  if (!baseUrl) {
    console.warn(
      "[fastapiEngine] NEXT_PUBLIC_FASTAPI_URL is not set — falling back to jsEngine."
    );
    return jsComputeAnalytics(txs, categories, range, groupBy, currency);
  }

  const payload: AnalyzePayload = {
    transactions: txs,
    categories: categories,
    range,
    groupBy,
    currency,
    numMonths: 6,
  };

  try {
    const res = await fetch(`${baseUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      console.warn(
        `[fastapiEngine] Service responded ${res.status}: ${errorText}. Falling back to jsEngine.`
      );
      return jsComputeAnalytics(txs, categories, range, groupBy, currency);
    }

    const data = (await res.json()) as AnalyticsResult;
    return data;
  } catch (err) {
    console.warn(
      "[fastapiEngine] Network error — falling back to jsEngine.",
      err
    );
    return jsComputeAnalytics(txs, categories, range, groupBy, currency);
  }
}
