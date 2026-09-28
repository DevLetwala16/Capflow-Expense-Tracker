import { db, Transaction } from "@/lib/db";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  format,
  parseISO,
  isAfter,
} from "date-fns";

// Module-level idempotency guard — reset on every page reload (fresh module load)
let lastRunDate: string | null = null;

/**
 * runRecurringEngine(userId: string): Promise<number>
 *
 * Scans all recurring transactions for this user where:
 *   recurrence.type !== null
 *   recurrence.nextOccurrence <= today ("YYYY-MM-DD")
 *
 * For each due recurring transaction:
 *   1. Creates a new child transaction (same fields, date = nextOccurrence, no recurrence,
 *      parentId set to original.id)
 *   2. Advances nextOccurrence by the recurrence interval
 *   3. If endDate is set and new nextOccurrence > endDate → sets recurrence.type = null
 *   4. Updates the parent transaction's recurrence in Dexie
 *
 * Returns the count of new transactions created.
 * Safe to call multiple times per session — only runs once per calendar day.
 */
export async function runRecurringEngine(userId: string): Promise<number> {
  const today = format(new Date(), "yyyy-MM-dd");

  // Idempotency: skip if already ran today in this session
  if (lastRunDate === today) {
    return 0;
  }
  lastRunDate = today;

  // Fetch all transactions for this user, then JS-filter for active recurring parents
  const allUserTxs = await db.transactions
    .where("userId")
    .equals(userId)
    .filter(
      (tx) =>
        tx.recurrence != null &&
        tx.recurrence.type != null &&
        tx.recurrence.nextOccurrence != null &&
        tx.recurrence.nextOccurrence <= today
    )
    .toArray();

  if (allUserTxs.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();
  let createdCount = 0;

  for (const parent of allUserTxs) {
    const recurrence = parent.recurrence!;
    // nextOccurrence is guaranteed non-null by the filter above
    let nextDate = parseISO(recurrence.nextOccurrence!);

    // Track whether the endDate boundary was hit inside the loop
    let seriesDone = false;

    // We may need to advance multiple times if engine was offline for several periods
    while (format(nextDate, "yyyy-MM-dd") <= today) {
      const occurrenceDateStr = format(nextDate, "yyyy-MM-dd");

      // 1. Create a child transaction for this occurrence
      const childTx: Omit<Transaction, "id"> = {
        userId: parent.userId,
        type: parent.type,
        amount: parent.amount,
        currency: parent.currency,
        categoryId: parent.categoryId,
        title: parent.title,
        notes: parent.notes,
        date: occurrenceDateStr,
        paymentMethod: parent.paymentMethod,
        receiptImage: undefined, // receipts are not copied to child occurrences
        recurrence: {
          type: null,
          parentId: parent.id,
        },
        createdAt: now,
        updatedAt: now,
      };

      await db.transactions.add(childTx);
      createdCount++;

      // 2. Advance nextOccurrence by the recurrence interval
      switch (recurrence.type) {
        case "daily":
          nextDate = addDays(nextDate, 1);
          break;
        case "weekly":
          nextDate = addWeeks(nextDate, 1);
          break;
        case "monthly":
          nextDate = addMonths(nextDate, 1);
          break;
        case "yearly":
          nextDate = addYears(nextDate, 1);
          break;
        default:
          // Should not reach here; break the loop defensively
          nextDate = addYears(nextDate, 100);
          break;
      }

      // 3. If endDate is set and the newly computed nextOccurrence > endDate → stop recurring
      if (recurrence.endDate && isAfter(nextDate, parseISO(recurrence.endDate))) {
        // Mark the series as completed on the parent (type → null)
        await db.transactions.update(parent.id!, {
          recurrence: {
            ...recurrence,
            type: null,
            nextOccurrence: format(nextDate, "yyyy-MM-dd"),
          },
          updatedAt: now,
        });
        seriesDone = true;
        break; // no more occurrences for this series
      }
    }

    // 4. Persist the updated nextOccurrence on the parent (only when series is still active)
    if (!seriesDone) {
      await db.transactions.update(parent.id!, {
        recurrence: {
          ...recurrence,
          nextOccurrence: format(nextDate, "yyyy-MM-dd"),
        },
        updatedAt: now,
      });
    }
  }

  return createdCount;
}
