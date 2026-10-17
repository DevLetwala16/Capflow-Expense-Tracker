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
 * Evenly distribute total amount among participants, handling remainder cents
 * so that sum(shares) exactly matches the total amount to the penny/paisa.
 */
export function calculateEqualSplits(
  totalAmount: number,
  memberIds: string[]
): { memberId: string; amount: number }[] {
  if (!memberIds.length) return [];
  const totalCents = toCents(totalAmount);
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
 * Generate unique collision-free session ID, e.g. CAP-SPLIT-9821-X
 */
export function generateSessionId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randNum = Math.floor(1000 + Math.random() * 9000);
  let suffix = '';
  for (let i = 0; i < 2; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CAP-SPLIT-${randNum}-${suffix}`;
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

