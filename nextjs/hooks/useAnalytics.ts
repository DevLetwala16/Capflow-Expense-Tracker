"use client";

import { useState, useEffect } from "react";
import { useTransactionStore } from "@/lib/store/transactionStore";
import {
  computeAnalytics as jsComputeAnalytics,
  getRangeForPeriod,
  DateRange,
  AnalyticsResult,
} from "@/lib/analytics/jsEngine";
import { computeAnalytics as fastapiComputeAnalytics } from "@/lib/analytics/fastapiEngine";
import { db, Category, Transaction } from "@/lib/db";
import { useAuthStore } from "@/lib/store/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalyticsPeriod = "week" | "month" | "year";
export type AnalyticsEngine = "js" | "fastapi";

const EMPTY_RESULT: AnalyticsResult = {
  donut: [],
  stackedBar: [],
  lineTrend: [],
  insights: [],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAnalytics
 * ─────────────
 * Loads all transactions for the authenticated user and runs them through the
 * selected analytics engine (js or fastapi).
 *
 * The active engine is controlled by the env var:
 *   NEXT_PUBLIC_ANALYTICS_ENGINE=js | fastapi   (default: "js")
 *
 * Returns the full AnalyticsResult plus:
 *   - `loading`: true while transactions are being fetched or analytics are computing
 *   - `engine`: which engine produced the result ("js" | "fastapi")
 */
export function useAnalytics(
  period: AnalyticsPeriod,
  categories: Category[],
  currency: string,
  groupBy: "category" | "paymentMethod" = "category",
  customRange?: DateRange
): AnalyticsResult & { loading: boolean; engine: AnalyticsEngine } {
  const { user } = useAuthStore();
  const { transactions: storeTransactions, loading: storeLoading } =
    useTransactionStore();

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [result, setResult] = useState<AnalyticsResult>(EMPTY_RESULT);
  const [computing, setComputing] = useState(false);

  // Determine active engine from env var (evaluated once per render cycle)
  const activeEngine: AnalyticsEngine =
    process.env.NEXT_PUBLIC_ANALYTICS_ENGINE === "fastapi" ? "fastapi" : "js";

  // ── Step 1: Load all user transactions from IndexedDB ──────────────────────
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      if (!user?.id) {
        if (mounted) {
          setAllTransactions([]);
          setDbLoading(false);
        }
        return;
      }
      try {
        const txs = await db.transactions
          .where("userId")
          .equals(user.id)
          .toArray();
        if (mounted) {
          setAllTransactions(txs);
          setDbLoading(false);
        }
      } catch (err) {
        console.error("Failed to load transactions for analytics:", err);
        if (mounted) setDbLoading(false);
      }
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, [user?.id, storeTransactions]);

  // ── Step 2: Compute analytics whenever inputs or engine change ────────────
  useEffect(() => {
    let mounted = true;

    async function runAnalytics() {
      setComputing(true);

      const range = customRange ?? getRangeForPeriod(period);
      const sourceTxs =
        allTransactions.length > 0 ? allTransactions : storeTransactions;

      let computed: AnalyticsResult;

      if (activeEngine === "fastapi") {
        // fastapiEngine is async (network call with js fallback)
        computed = await fastapiComputeAnalytics(
          sourceTxs,
          categories,
          range,
          groupBy,
          currency
        );
      } else {
        // jsEngine is synchronous — wrap in Promise.resolve to stay uniform
        computed = await Promise.resolve(
          jsComputeAnalytics(sourceTxs, categories, range, groupBy, currency)
        );
      }

      if (mounted) {
        setResult(computed);
        setComputing(false);
      }
    }

    runAnalytics();
    return () => {
      mounted = false;
    };
  }, [
    allTransactions,
    storeTransactions,
    categories,
    period,
    groupBy,
    currency,
    customRange,
    activeEngine,
  ]);

  const loading = (dbLoading && storeLoading) || computing;

  return { ...result, loading, engine: activeEngine };
}
