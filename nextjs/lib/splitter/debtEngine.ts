import {
  SplitSession,
  SplitMember,
  MemberNetPosition,
  SettlementTransaction,
  SplitExpenseItem,
} from '@/types/splitter';

/**
 * Safe currency rounder to exact 2 decimals without floating point inaccuracies.
 */
export function roundTo2Decimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Convert currency amount to integer cents (or paisa) for lossless arithmetic.
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert integer cents back to 2-decimal number.
 */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Evenly or weighted distribute total amount among participants, handling remainder cents
 * so that sum(shares) exactly matches the total amount to the penny/paisa.
 * Supports weighted distribution (e.g. family members headcount).
 */
export function calculateEqualSplits(
  totalAmount: number,
  memberIds: string[],
  memberWeights?: Record<string, number>
): { memberId: string; amount: number }[] {
  if (!memberIds.length) return [];
  const totalCents = toCents(totalAmount);

  // If weights are provided and any weight is different from 1
  const hasCustomWeights =
    memberWeights &&
    memberIds.some((id) => (memberWeights[id] || 1) !== 1);

  if (!hasCustomWeights) {
    const baseShareCents = Math.floor(totalCents / memberIds.length);
    let remainderCents = totalCents % memberIds.length;

    return memberIds.map((memberId) => {
      let cents = baseShareCents;
      if (remainderCents > 0) {
        cents += 1;
        remainderCents -= 1;
      }
      return {
        memberId,
        amount: fromCents(cents),
      };
    });
  }

  // Weighted distribution (e.g. family headcount)
  const weights = memberIds.map((id) => Math.max(1, memberWeights?.[id] || 1));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) return [];

  // Calculate unrounded cents and floor allocations
  const unroundedCents = weights.map((w) => (totalCents * w) / totalWeight);
  const floorCents = unroundedCents.map((c) => Math.floor(c));
  const allocatedSum = floorCents.reduce((sum, c) => sum + c, 0);
  const remainder = totalCents - allocatedSum;

  // Distribute remainder 1 cent at a time to highest fractional parts
  const withFractions = memberIds.map((memberId, idx) => ({
    memberId,
    cents: floorCents[idx],
    fraction: unroundedCents[idx] - floorCents[idx],
    idx,
  }));

  withFractions.sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < remainder; i++) {
    withFractions[i % withFractions.length].cents += 1;
  }

  // Restore original ordering
  withFractions.sort((a, b) => a.idx - b.idx);

  return withFractions.map((item) => ({
    memberId: item.memberId,
    amount: fromCents(item.cents),
  }));
}

/**
 * Auto-balances exact split shares when one participant's share is edited.
 * Preserves previously customized shares and distributes the remaining amount
 * across the remaining participants (weighted by familyCount if present).
 */
export function autoBalanceExactShares(
  totalAmount: number,
  participantIds: string[],
  currentShares: Record<string, string>,
  editedMemberId: string,
  newValStr: string,
  customizedIds: Set<string>,
  memberWeights?: Record<string, number>
): {
  updatedShares: Record<string, string>;
  updatedCustomizedIds: Set<string>;
} {
  const updatedShares: Record<string, string> = { ...currentShares, [editedMemberId]: newValStr };
  const nextCustomized = new Set(customizedIds);
  nextCustomized.add(editedMemberId);

  const parsedNewVal = parseFloat(newValStr);
  const newAmount = isNaN(parsedNewVal) ? 0 : parsedNewVal;

  // Determine which other participants should absorb the adjustment
  // Prefer participants not yet customized; if all others are customized, adjust all other participants
  let targetIds = participantIds.filter(
    (id) => id !== editedMemberId && !nextCustomized.has(id)
  );

  if (targetIds.length === 0) {
    targetIds = participantIds.filter((id) => id !== editedMemberId);
  }

  if (targetIds.length === 0) {
    return { updatedShares, updatedCustomizedIds: nextCustomized };
  }

  // Calculate sum of locked amounts (participants NOT in targetIds)
  let lockedSumCents = 0;
  for (const id of participantIds) {
    if (!targetIds.includes(id)) {
      const val = id === editedMemberId ? newAmount : (parseFloat(updatedShares[id] || "0") || 0);
      lockedSumCents += toCents(val);
    }
  }

  const totalCents = toCents(totalAmount);
  const remainingCents = totalCents - lockedSumCents;

  if (remainingCents <= 0) {
    // No remaining budget, set target participants to 0.00
    for (const id of targetIds) {
      updatedShares[id] = "0.00";
    }
  } else {
    const remainingAmount = fromCents(remainingCents);
    const splits = calculateEqualSplits(remainingAmount, targetIds, memberWeights);
    for (const split of splits) {
      updatedShares[split.memberId] = split.amount.toFixed(2);
    }
  }

  return { updatedShares, updatedCustomizedIds: nextCustomized };
}

/**
 * Calculates net positions for all members in a session.
 * Handles:
 * 1. Multi-payer and single-payer expenses.
 * 2. Dependent liabilities routing: if Member D is a dependent of Member P (Primary Payer),
 *    D's liability is transferred to P.
 * 3. Individual consumption tracking (Member D still has their consumption tracked for analytics).
 * 4. Full and partial settlements.
 * 5. 2-decimal precision.
 */
export function calculateMemberNetPositions(session: SplitSession): MemberNetPosition[] {
  const members = session.members || [];
  const expenses = session.expenses || [];
  const settlements = session.settlements || [];

  const memberMap = new Map<string, SplitMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  // Initialize tracking maps (in cents to eliminate float rounding errors)
  const paidCents = new Map<string, number>();
  const directOwedCents = new Map<string, number>();
  const settlementsPaidCents = new Map<string, number>();
  const settlementsReceivedCents = new Map<string, number>();
  const individualSpendCents = new Map<string, number>();

  members.forEach((m) => {
    paidCents.set(m.id, 0);
    directOwedCents.set(m.id, 0);
    settlementsPaidCents.set(m.id, 0);
    settlementsReceivedCents.set(m.id, 0);
    individualSpendCents.set(m.id, 0);
  });

  // 1. Process Expenses
  for (const exp of expenses) {
    // Paid amounts
    if (exp.paidBy && exp.paidBy.length > 0) {
      for (const p of exp.paidBy) {
        const cur = paidCents.get(p.memberId) || 0;
        paidCents.set(p.memberId, cur + toCents(p.amount));
      }
    }

    // Splits / consumption
    if (exp.splits && exp.splits.length > 0) {
      for (const s of exp.splits) {
        const shareCents = toCents(s.amount);
        // Track consumption for analytics
        const curSpend = individualSpendCents.get(s.memberId) || 0;
        individualSpendCents.set(s.memberId, curSpend + shareCents);

        // Track direct liability
        const curOwed = directOwedCents.get(s.memberId) || 0;
        directOwedCents.set(s.memberId, curOwed + shareCents);
      }
    }
  }

  // 2. Process Settlements
  for (const st of settlements) {
    const stCents = toCents(st.amount);
    const pCur = settlementsPaidCents.get(st.fromMemberId) || 0;
    settlementsPaidCents.set(st.fromMemberId, pCur + stCents);

    const rCur = settlementsReceivedCents.get(st.toMemberId) || 0;
    settlementsReceivedCents.set(st.toMemberId, rCur + stCents);
  }

  // 3. Dependent Debt Routing
  // If member is dependent, their debt liability is routed to primary payer.
  // Dependent's own net debt becomes 0.
  const dependentLiabilitiesAbsorbedCents = new Map<string, number>();
  members.forEach((m) => dependentLiabilitiesAbsorbedCents.set(m.id, 0));

  const effectiveLiabilitiesCents = new Map<string, number>();
  members.forEach((m) => {
    effectiveLiabilitiesCents.set(m.id, directOwedCents.get(m.id) || 0);
  });

  for (const m of members) {
    if (m.isDependent && m.primaryPayerMemberId) {
      const depOwed = directOwedCents.get(m.id) || 0;
      if (depOwed > 0) {
        // Route to primary payer
        const primaryId = m.primaryPayerMemberId;
        const curAbsorbed = dependentLiabilitiesAbsorbedCents.get(primaryId) || 0;
        dependentLiabilitiesAbsorbedCents.set(primaryId, curAbsorbed + depOwed);

        const curPrimaryEff = effectiveLiabilitiesCents.get(primaryId) || 0;
        effectiveLiabilitiesCents.set(primaryId, curPrimaryEff + depOwed);

        // Dependent's effective liability is now 0 since parent covers it
        effectiveLiabilitiesCents.set(m.id, 0);
      }
    }
  }

  // 4. Build output positions
  const positions: MemberNetPosition[] = members.map((m) => {
    const totalP = paidCents.get(m.id) || 0;
    const directO = directOwedCents.get(m.id) || 0;
    const effO = effectiveLiabilitiesCents.get(m.id) || 0;
    const absorbed = dependentLiabilitiesAbsorbedCents.get(m.id) || 0;
    const sPaid = settlementsPaidCents.get(m.id) || 0;
    const sRecv = settlementsReceivedCents.get(m.id) || 0;
    const indSpend = individualSpendCents.get(m.id) || 0;

    // Net balance in cents:
    // (Money Paid out for expenses + Settlements paid) - (Effective Liability + Settlements received)
    const netCents = (totalP + sPaid) - (effO + sRecv);

    let primaryPayerName: string | undefined;
    if (m.primaryPayerMemberId) {
      primaryPayerName = memberMap.get(m.primaryPayerMemberId)?.name;
    }

    return {
      memberId: m.id,
      memberName: m.name,
      handle: m.handle,
      color: m.color,
      isDependent: !!m.isDependent,
      primaryPayerMemberId: m.primaryPayerMemberId,
      primaryPayerName,
      individualSpend: fromCents(indSpend),
      totalPaid: fromCents(totalP),
      directOwed: fromCents(directO),
      dependentLiabilitiesAbsorbed: fromCents(absorbed),
      settlementsPaid: fromCents(sPaid),
      settlementsReceived: fromCents(sRecv),
      netBalance: fromCents(netCents),
    };
  });

  return positions;
}

/**
 * Min-Cash-Flow Greedy Algorithm
 * Simplifies group debts into the absolute minimum number of settlement transactions.
 * Dependents are excluded because their net balances are zero (their liabilities are
 * merged into their primary payer).
 */
export function simplifyDebts(positions: MemberNetPosition[]): SettlementTransaction[] {
  // Separate into debtors (netBalance < 0) and creditors (netBalance > 0)
  interface BalanceNode {
    memberId: string;
    memberName: string;
    cents: number;
  }

  const debtors: BalanceNode[] = [];
  const creditors: BalanceNode[] = [];

  for (const pos of positions) {
    const cents = toCents(pos.netBalance);
    // Ignore members with zero balance or dependents who have no net balance
    if (cents < -0) {
      debtors.push({
        memberId: pos.memberId,
        memberName: pos.memberName,
        cents: -cents, // store as positive debt amount
      });
    } else if (cents > 0) {
      creditors.push({
        memberId: pos.memberId,
        memberName: pos.memberName,
        cents: cents,
      });
    }
  }

  // Sort descending by amount to maximize debt cancellation in each step
  debtors.sort((a, b) => b.cents - a.cents);
  creditors.sort((a, b) => b.cents - a.cents);

  const transactions: SettlementTransaction[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settleCents = Math.min(debtor.cents, creditor.cents);

    if (settleCents > 0) {
      transactions.push({
        fromMemberId: debtor.memberId,
        fromMemberName: debtor.memberName,
        toMemberId: creditor.memberId,
        toMemberName: creditor.memberName,
        amount: fromCents(settleCents),
      });

      debtor.cents -= settleCents;
      creditor.cents -= settleCents;
    }

    if (debtor.cents === 0) dIdx++;
    if (creditor.cents === 0) cIdx++;
  }

  return transactions;
}

/**
 * Generate unique collision-free session ID.
 * Starts with "CAP@" followed by a combination of:
 * - uppercase letters (A-Z)
 * - lowercase letters (a-z)
 * - numbers (0-9)
 * e.g. CAP@a8K2Xp9q
 */
export function generateSessionId(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const all = upper + lower + digits;

  // 8 random characters ensuring mix of uppercase, lowercase, and digits
  const length = 8;
  const chars: string[] = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
  ];
  for (let i = 3; i < length; i++) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }
  // Shuffle randomly
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return `CAP@${chars.join('')}`;
}

export interface ExpenseMemberStatus {
  status: 'paid' | 'settled' | 'pending';
  label: string;
  badgeClass: string;
  isPayer: boolean;
  canMarkSettled: boolean;
  canUndo: boolean;
  shareAmount: number;
}

export function getExpenseMemberStatus(
  exp: SplitExpenseItem,
  m: SplitMember,
  members: SplitMember[]
): ExpenseMemberStatus {
  const split = exp.splits?.find((s) => s.memberId === m.id);
  const shareAmount = split?.amount || 0;

  // Did this member pay towards the bill?
  const memberPaid = exp.paidBy?.reduce(
    (sum, p) => (p.memberId === m.id ? sum + p.amount : sum),
    0
  ) || 0;

  // Check dependent liability routing
  if (m.isDependent && m.primaryPayerMemberId) {
    const primaryPayer = members.find((x) => x.id === m.primaryPayerMemberId);
    const primaryPaid = exp.paidBy?.reduce(
      (sum, p) => (p.memberId === m.primaryPayerMemberId ? sum + p.amount : sum),
      0
    ) || 0;
    const primarySplit = exp.splits?.find((s) => s.memberId === m.primaryPayerMemberId);
    const combinedShare = (primarySplit?.amount || 0) + shareAmount;

    if (primaryPaid >= combinedShare && combinedShare > 0) {
      return {
        status: 'paid',
        label: `Paid by ${primaryPayer?.name || 'Payer'}`,
        badgeClass: 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30',
        isPayer: true,
        canMarkSettled: false,
        canUndo: false,
        shareAmount,
      };
    }
  }

  // If member paid upfront at least their share:
  if (memberPaid >= shareAmount && shareAmount > 0) {
    return {
      status: 'paid',
      label: 'Paid (Payer)',
      badgeClass: 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30',
      isPayer: true,
      canMarkSettled: false,
      canUndo: false,
      shareAmount,
    };
  }

  // If split is explicitly marked as settled
  if (split?.settled) {
    return {
      status: 'settled',
      label: 'Settled ✓',
      badgeClass: 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30',
      isPayer: false,
      canMarkSettled: false,
      canUndo: true,
      shareAmount,
    };
  }

  // If pending
  return {
    status: 'pending',
    label: 'Pending',
    badgeClass: 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
    isPayer: false,
    canMarkSettled: true,
    canUndo: false,
    shareAmount,
  };
}

export interface ItemizedExpenseBreakdown {
  expenseId: string;
  title: string;
  date: string;
  category: string;
  totalAmount: number;
  currency: string;
  shareAmount: number;
  settled: boolean;
  settledAt?: string;
  payerName: string;
  isDirectPayer: boolean;
}

/**
 * Returns the itemized expenses breakdown relevant to a settlement transaction between two members.
 */
export function getItemizedExpensesForPair(
  session: SplitSession,
  fromMemberId: string,
  toMemberId: string
): ItemizedExpenseBreakdown[] {
  const result: ItemizedExpenseBreakdown[] = [];
  const memberMap = new Map(session.members.map((m) => [m.id, m]));

  for (const exp of session.expenses) {
    const toPaidEntry = exp.paidBy?.find((p) => p.memberId === toMemberId && p.amount > 0);
    const fromPaidEntry = exp.paidBy?.find((p) => p.memberId === fromMemberId && p.amount > 0);

    // Case 1: toMember paid upfront, fromMember (or their dependent) participated in split
    const fromSplit = exp.splits?.find((s) => {
      if (s.memberId === fromMemberId) return true;
      const m = memberMap.get(s.memberId);
      return m?.isDependent && m?.primaryPayerMemberId === fromMemberId;
    });

    if (toPaidEntry && fromSplit) {
      result.push({
        expenseId: exp.id,
        title: exp.title,
        date: exp.date,
        category: exp.category,
        totalAmount: exp.amount,
        currency: exp.currency,
        shareAmount: fromSplit.amount,
        settled: !!fromSplit.settled,
        settledAt: fromSplit.settledAt,
        payerName: memberMap.get(toMemberId)?.name || 'Payer',
        isDirectPayer: false,
      });
      continue;
    }

    // Case 2: fromMember paid upfront, toMember participated (offsetting credit)
    const toSplit = exp.splits?.find((s) => {
      if (s.memberId === toMemberId) return true;
      const m = memberMap.get(s.memberId);
      return m?.isDependent && m?.primaryPayerMemberId === toMemberId;
    });

    if (fromPaidEntry && toSplit) {
      result.push({
        expenseId: exp.id,
        title: exp.title,
        date: exp.date,
        category: exp.category,
        totalAmount: exp.amount,
        currency: exp.currency,
        shareAmount: toSplit.amount,
        settled: !!toSplit.settled,
        settledAt: toSplit.settledAt,
        payerName: memberMap.get(fromMemberId)?.name || 'Payer',
        isDirectPayer: true,
      });
    }
  }

  // Sort newest expenses first
  return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Format currency with symbol and 2 decimals
 */
export function formatSplitCurrency(amount: number, currency: string = 'INR'): string {
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    AED: 'AED ',
    CAD: 'CA$',
  };
  const sym = symbols[currency] || `${currency} `;
  return `${sym}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format currency with WinAnsi-compatible ASCII symbols for standard PDF fonts.
 */
export function formatPDFCurrency(amount: number, currency: string = 'INR'): string {
  const symbols: Record<string, string> = {
    INR: 'Rs. ',
    USD: '$',
    EUR: 'EUR ',
    GBP: 'GBP ',
    JPY: 'JPY ',
    AED: 'AED ',
    CAD: 'CAD ',
  };
  const sym = symbols[currency] || `${currency} `;
  return `${sym}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

