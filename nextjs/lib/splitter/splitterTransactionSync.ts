import { db, Transaction } from "@/lib/db";
import { useTransactionStore } from "@/lib/store/transactionStore";
import { useCategoryStore } from "@/lib/store/categoryStore";
import { SplitSession, SplitExpenseItem } from "@/types/splitter";

/**
 * Resolves the appropriate category ID for an expense or settlement
 */
async function resolveCategoryId(
  userId: string,
  categoryName: string,
  type: "expense" | "income"
): Promise<number> {
  try {
    const cats = await useCategoryStore.getState().loadCategories(userId);
    if (!cats || cats.length === 0) return 1;

    // Direct case-insensitive match
    const match = cats.find(
      (c) => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase()
    );
    if (match?.id) return match.id;

    // Type-based match for income
    if (type === "income") {
      const incMatch = cats.find(
        (c) => c.type === "income" || c.name.toLowerCase() === "salary"
      );
      if (incMatch?.id) return incMatch.id;
    }

    // Default fallback to "Other" or first available category
    const other = cats.find((c) => c.name.toLowerCase() === "other");
    return other?.id || cats[0]?.id || 1;
  } catch (e) {
    console.warn("Failed resolving category ID, fallback to 1:", e);
    return 1;
  }
}

/**
 * Syncs an expense logged in a Splitter session to CapFlow's transaction ledger & balances
 * if the local user paid any amount for this expense.
 */
export async function syncExpenseToCapFlowTransactions(params: {
  session: SplitSession;
  expense: SplitExpenseItem;
  userId: string;
  userMemberId?: string;
}): Promise<{ synced: boolean; amount: number; type: "expense" } | null> {
  const { session, expense, userId, userMemberId } = params;
  if (!userId) return null;

  // Identify which member corresponds to this user
  const effectiveMemberId =
    userMemberId ||
    session.members.find((m) => m.userId === userId)?.id ||
    session.members[0]?.id;

  if (!effectiveMemberId) return null;

  // Check how much the user paid
  const userPaid = expense.paidBy?.find((p) => p.memberId === effectiveMemberId);
  const paidAmount = userPaid ? Number(userPaid.amount) : 0;

  const tag = `[SplitterExp:${session.sessionId}:${expense.id}]`;

  // Search if a transaction already exists for this expense
  const existingTx = await db.transactions
    .where("userId")
    .equals(userId)
    .filter((tx) => !!tx.notes && tx.notes.includes(tag))
    .first();

  if (paidAmount <= 0) {
    // If user paid nothing (or edited to 0), delete any previously synced transaction
    if (existingTx?.id) {
      await useTransactionStore.getState().deleteTransaction(existingTx.id);
      await useTransactionStore.getState().loadCumulativeBalance(userId);
    }
    return null;
  }

  const categoryId = await resolveCategoryId(userId, expense.category, "expense");
  const txDate = expense.date
    ? expense.date.split("T")[0]
    : new Date().toISOString().split("T")[0];

  const txData = {
    type: "expense" as const,
    amount: Math.round(paidAmount * 100) / 100,
    currency: expense.currency || session.currency || "USD",
    categoryId,
    title: expense.title,
    notes: `${tag} Splitter: ${session.name} · Paid for group`,
    date: txDate,
    paymentMethod: "upi" as const,
    receiptImage: expense.receiptImage || undefined,
  };

  if (existingTx?.id) {
    // Update existing transaction
    await useTransactionStore.getState().updateTransaction(existingTx.id, txData);
    await useTransactionStore.getState().loadCumulativeBalance(userId);
  } else {
    // Add new transaction
    await useTransactionStore.getState().addTransaction(txData, userId);
    await useTransactionStore.getState().loadCumulativeBalance(userId);
  }

  return { synced: true, amount: txData.amount, type: "expense" };
}

/**
 * Syncs a settlement ("Mark as Settled") to CapFlow transactions and updates all balances.
 * - If someone pays the user: records an INCOME transaction (+balance)
 * - If the user pays someone: records an EXPENSE transaction (-balance)
 */
export async function syncSettlementToCapFlowTransactions(params: {
  session: SplitSession;
  settlement: {
    id?: string;
    fromMemberId: string;
    toMemberId: string;
    amount: number;
    notes?: string;
    date?: string;
  };
  userId: string;
  userMemberId?: string;
}): Promise<{
  synced: boolean;
  amount: number;
  type: "income" | "expense";
  counterpartyName: string;
} | null> {
  const { session, settlement, userId, userMemberId } = params;
  if (!userId || !settlement.amount || settlement.amount <= 0) return null;

  const effectiveMemberId =
    userMemberId ||
    session.members.find((m) => m.userId === userId)?.id ||
    session.members[0]?.id;

  if (!effectiveMemberId) return null;

  const fromMember = session.members.find((m) => m.id === settlement.fromMemberId);
  const toMember = session.members.find((m) => m.id === settlement.toMemberId);

  const isUserRecipient = settlement.toMemberId === effectiveMemberId;
  const isUserPayer = settlement.fromMemberId === effectiveMemberId;

  if (!isUserRecipient && !isUserPayer) {
    // User is neither payer nor recipient (third-party settlement)
    return null;
  }

  const type: "income" | "expense" = isUserRecipient ? "income" : "expense";
  const counterpartyName = isUserRecipient
    ? fromMember?.name || "Member"
    : toMember?.name || "Member";

  const stlKey =
    settlement.id ||
    `stl_${settlement.fromMemberId}_${settlement.toMemberId}_${Date.now()}`;
  const tag = `[SplitterStl:${session.sessionId}:${stlKey}]`;

  const categoryId = await resolveCategoryId(
    userId,
    isUserRecipient ? "Salary" : "Other",
    type
  );

  const txDate = settlement.date
    ? settlement.date.split("T")[0]
    : new Date().toISOString().split("T")[0];

  const title = isUserRecipient
    ? `Settlement from ${counterpartyName}`
    : `Settlement to ${counterpartyName}`;

  const notes = `${tag} Splitter: ${session.name} · ${
    isUserRecipient ? "Received debt settlement" : "Paid debt settlement"
  }${settlement.notes ? ` · Note: ${settlement.notes}` : ""}`;

  const txData = {
    type,
    amount: Math.round(Number(settlement.amount) * 100) / 100,
    currency: session.currency || "USD",
    categoryId,
    title,
    notes,
    date: txDate,
    paymentMethod: "bank_transfer" as const,
  };

  await useTransactionStore.getState().addTransaction(txData, userId);
  await useTransactionStore.getState().loadCumulativeBalance(userId);

  return {
    synced: true,
    amount: txData.amount,
    type,
    counterpartyName,
  };
}

/**
 * Deletes any synced CapFlow transactions when an expense is deleted from Splitter
 */
export async function removeSyncedExpenseTransaction(
  sessionId: string,
  expenseId: string,
  userId: string
): Promise<void> {
  if (!userId) return;
  try {
    const tag = `[SplitterExp:${sessionId}:${expenseId}]`;
    const existingTx = await db.transactions
      .where("userId")
      .equals(userId)
      .filter((tx) => !!tx.notes && tx.notes.includes(tag))
      .first();

    if (existingTx?.id) {
      await useTransactionStore.getState().deleteTransaction(existingTx.id);
      await useTransactionStore.getState().loadCumulativeBalance(userId);
    }
  } catch (e) {
    console.warn("Failed to remove synced expense transaction:", e);
  }
}

/**
 * Deletes any synced CapFlow transaction when a settlement is deleted or undone
 */
export async function removeSyncedSettlementTransaction(
  sessionId: string,
  settlementId: string,
  userId: string
): Promise<void> {
  if (!userId) return;
  try {
    const tag = `[SplitterStl:${sessionId}:${settlementId}]`;
    const existingTx = await db.transactions
      .where("userId")
      .equals(userId)
      .filter((tx) => !!tx.notes && tx.notes.includes(tag))
      .first();

    if (existingTx?.id) {
      await useTransactionStore.getState().deleteTransaction(existingTx.id);
      await useTransactionStore.getState().loadCumulativeBalance(userId);
    }
  } catch (e) {
    console.warn("Failed to remove synced settlement transaction:", e);
  }
}

/**
 * Deletes all synced CapFlow transactions for a session when all settlements are purged
 */
export async function removeAllSyncedSettlementsForSession(
  sessionId: string,
  userId: string
): Promise<void> {
  if (!userId) return;
  try {
    const prefix = `[SplitterStl:${sessionId}:`;
    const all = await db.transactions
      .where("userId")
      .equals(userId)
      .filter((tx) => !!tx.notes && tx.notes.includes(prefix))
      .toArray();

    for (const tx of all) {
      if (tx.id) {
        await useTransactionStore.getState().deleteTransaction(tx.id);
      }
    }
    await useTransactionStore.getState().loadCumulativeBalance(userId);
  } catch (e) {
    console.warn("Failed to remove all synced settlements for session:", e);
  }
}
