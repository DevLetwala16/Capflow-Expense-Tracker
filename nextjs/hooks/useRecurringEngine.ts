import { useEffect, useState } from "react";
import { runRecurringEngine } from "@/lib/recurring/engine";
import { useTransactionStore } from "@/lib/store/transactionStore";

/**
 * useRecurringEngine
 *
 * Runs the recurring transactions engine once per session (on mount).
 * If any child transactions were created, forces a store refresh so the
 * UI reflects the newly spawned records immediately.
 *
 * @param userId - The authenticated user's ID. Pass undefined to skip.
 * @returns { newTransactionsCount } - Number of transactions created in this run.
 *
 * Usage: call once in app/(app)/layout.tsx or the dashboard page.
 */
export function useRecurringEngine(userId: string | undefined): {
  newTransactionsCount: number;
} {
  const [newTransactionsCount, setNewTransactionsCount] = useState(0);
  const refreshTransactions = useTransactionStore(
    (s) => s.refreshTransactions
  );

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function run() {
      try {
        const count = await runRecurringEngine(userId!);
        if (cancelled) return;
        if (count > 0) {
          setNewTransactionsCount(count);
          await refreshTransactions(userId!);
        }
      } catch (err) {
        console.error("[useRecurringEngine] Error running engine:", err);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { newTransactionsCount };
}
