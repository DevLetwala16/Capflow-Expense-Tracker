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

import { useAuthStore } from "@/lib/store/authStore";

export type AnalyticsPeriod = "week" | "month" | "year";

export function useAnalytics(
  period: AnalyticsPeriod,
  categories: Category[],
  currency: string,
  groupBy: "category" | "paymentMethod" = "category",
  customRange?: DateRange
): AnalyticsResult & { loading: boolean } {
  const { user } = useAuthStore();
  const { transactions: storeTransactions, loading: storeLoading } = useTransactionStore();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

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
        const txs = await db.transactions.where("userId").equals(user.id).toArray();
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

  const result = useMemo(() => {
    const range = customRange ?? getRangeForPeriod(period);
    const sourceTxs = allTransactions.length > 0 ? allTransactions : storeTransactions;
    return computeAnalytics(sourceTxs, categories, range, groupBy, currency);
  }, [allTransactions, storeTransactions, categories, period, groupBy, currency, customRange]);

  return { ...result, loading: dbLoading && storeLoading };
}

