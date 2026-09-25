"use client";

import { useState, useEffect, useMemo } from "react";
import { useTransactionStore } from "@/lib/store/transactionStore";
import {
  computeAnalytics,
  getRangeForPeriod,
  DateRange,
  AnalyticsResult,
} from "@/lib/analytics/jsEngine";
import { db, Category, Transaction } from "@/lib/db";

export type AnalyticsPeriod = "week" | "month" | "year";

export function useAnalytics(
  period: AnalyticsPeriod,
  categories: Category[],
  currency: string,
  groupBy: "category" | "paymentMethod" = "category",
  customRange?: DateRange
): AnalyticsResult & { loading: boolean } {
  const { transactions: storeTransactions, loading: storeLoading } = useTransactionStore();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadAll() {
      try {
        const txs = await db.transactions.toArray();
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
  }, [storeTransactions]);

  const result = useMemo(() => {
    const range = customRange ?? getRangeForPeriod(period);
    const sourceTxs = allTransactions.length > 0 ? allTransactions : storeTransactions;
    return computeAnalytics(sourceTxs, categories, range, groupBy, currency);
  }, [allTransactions, storeTransactions, categories, period, groupBy, currency, customRange]);

  return { ...result, loading: dbLoading && storeLoading };
}

