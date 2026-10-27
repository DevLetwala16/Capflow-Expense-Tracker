import {
  calculateEqualSplits,
  calculateMemberNetPositions,
  simplifyDebts,
  roundTo2Decimals,
  getPairwiseNetDebt,
  getExpenseMemberStatus,
  toCents,
  fromCents,
} from '@/lib/splitter/debtEngine';
import { SplitSession, SplitMember, SplitExpenseItem, SplitSettlement } from '@/types/splitter';

function createMockSession(members: SplitMember[]): SplitSession {
  return {
    sessionId: 'TEST_SESSION_CONFLICT_CHECK',
    userId: 'user_admin',
    name: 'Conflict Test Session',
    template: 'group',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    currency: 'INR',
    status: 'active',
    members,
    expenses: [],
    settlements: [],
    auditLogs: [],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };
}

describe('Money Conflict Verification Suite', () => {
  const members: SplitMember[] = [
    { id: 'm1', name: 'Alice', handle: '@alice', color: '#10B981', isDependent: false },
    { id: 'm2', name: 'Bob', handle: '@bob', color: '#3B82F6', isDependent: false },
    { id: 'm3', name: 'Charlie', handle: '@charlie', color: '#F59E0B', isDependent: false },
    { id: 'm4', name: 'Diana', handle: '@diana', color: '#8B5CF6', isDependent: false },
  ];

  test('Invariant 1: Total Net Balance is strictly ZERO (Conservation of Money)', () => {
    const session = createMockSession(members);

    // Expense 1: Alice pays 1000, split 4 ways
    session.expenses.push({
      id: 'e1',
      sessionId: session.sessionId,
      title: 'Dinner',
      amount: 1000,
      currency: 'INR',
      category: 'Food',
      date: '2026-10-02T12:00:00Z',
      createdBy: { memberId: 'm1', name: 'Alice' },
      paidBy: [{ memberId: 'm1', amount: 1000 }],
      splitMode: 'equal',
      splits: [
        { memberId: 'm1', amount: 250 },
        { memberId: 'm2', amount: 250 },
        { memberId: 'm3', amount: 250 },
        { memberId: 'm4', amount: 250 },
      ],
      createdAt: '2026-10-02T12:00:00Z',
      updatedAt: '2026-10-02T12:00:00Z',
    });

    // Expense 2: Bob pays 600, split among Bob, Charlie, Diana
    session.expenses.push({
      id: 'e2',
      sessionId: session.sessionId,
      title: 'Cab',
      amount: 600,
      currency: 'INR',
      category: 'Travel',
      date: '2026-10-02T14:00:00Z',
      createdBy: { memberId: 'm2', name: 'Bob' },
      paidBy: [{ memberId: 'm2', amount: 600 }],
      splitMode: 'equal',
      splits: [
        { memberId: 'm2', amount: 200 },
        { memberId: 'm3', amount: 200 },
        { memberId: 'm4', amount: 200 },
      ],
      createdAt: '2026-10-02T14:00:00Z',
      updatedAt: '2026-10-02T14:00:00Z',
    });

    const positions = calculateMemberNetPositions(session);
    const totalNet = positions.reduce((acc, p) => acc + p.netBalance, 0);
    expect(Math.abs(totalNet)).toBeLessThanOrEqual(0.001);

    // Alice: paid 1000, consumed 250 => +750
    // Bob: paid 600, consumed 450 (250+200) => +150
    // Charlie: paid 0, consumed 450 (250+200) => -450
    // Diana: paid 0, consumed 450 (250+200) => -450
    // Sum: 750 + 150 - 450 - 450 = 0
    const posMap = new Map(positions.map((p) => [p.memberId, p.netBalance]));
    expect(posMap.get('m1')).toBe(750);
    expect(posMap.get('m2')).toBe(150);
    expect(posMap.get('m3')).toBe(-450);
    expect(posMap.get('m4')).toBe(-450);
  });

  test('Invariant 2: Settlement decreases debt without money loss or creation', () => {
    const session = createMockSession(members);

    // Alice pays 900 for Alice, Bob, Charlie (300 each)
    session.expenses.push({
      id: 'e1',
      sessionId: session.sessionId,
      title: 'Groceries',
      amount: 900,
      currency: 'INR',
      category: 'Food',
      date: '2026-10-02T12:00:00Z',
      createdBy: { memberId: 'm1', name: 'Alice' },
      paidBy: [{ memberId: 'm1', amount: 900 }],
      splitMode: 'equal',
      splits: [
        { memberId: 'm1', amount: 300 },
        { memberId: 'm2', amount: 300 },
        { memberId: 'm3', amount: 300 },
      ],
      createdAt: '2026-10-02T12:00:00Z',
      updatedAt: '2026-10-02T12:00:00Z',
    });

    // Bob pays Alice 300 (full settlement)
    session.settlements.push({
      id: 'stl1',
      sessionId: session.sessionId,
      fromMemberId: 'm2',
      toMemberId: 'm1',
      amount: 300,
      date: '2026-10-02T15:00:00Z',
      recordedBy: { memberId: 'm2', name: 'Bob' },
      createdAt: '2026-10-02T15:00:00Z',
    });

    const positions = calculateMemberNetPositions(session);
    const posMap = new Map(positions.map((p) => [p.memberId, p.netBalance]));

    // Bob is completely settled up (0 net balance)
    expect(posMap.get('m2')).toBe(0);

    // Alice gets 600 - 300 received = 300 still owed from Charlie
    expect(posMap.get('m1')).toBe(300);

    // Charlie still owes 300
    expect(posMap.get('m3')).toBe(-300);

    // Total net balance remains strictly 0
    const totalNet = positions.reduce((acc, p) => acc + p.netBalance, 0);
    expect(Math.abs(totalNet)).toBeLessThanOrEqual(0.001);

    // Min-cash-flow simplification should yield exactly 1 transaction: Charlie -> Alice 300
    const simplified = simplifyDebts(positions);
    expect(simplified).toHaveLength(1);
    expect(simplified[0].fromMemberId).toBe('m3');
    expect(simplified[0].toMemberId).toBe('m1');
    expect(simplified[0].amount).toBe(300);
  });

  test('Invariant 3: Multi-Payer Expense Settlement correctly distributes credit to ALL payers', () => {
    const session = createMockSession(members);

    // Lunch: 600 total.
    // Payers: Alice paid 300, Bob paid 300.
    // Splits: Alice 200, Bob 200, Charlie 200.
    // Charlie owes 100 to Alice, and 100 to Bob.
    session.expenses.push({
      id: 'e_multi',
      sessionId: session.sessionId,
      title: 'Shared Feast',
      amount: 600,
      currency: 'INR',
      category: 'Food',
      date: '2026-10-03T12:00:00Z',
      createdBy: { memberId: 'm1', name: 'Alice' },
      paidBy: [
        { memberId: 'm1', amount: 300 },
        { memberId: 'm2', amount: 300 },
      ],
      splitMode: 'equal',
      splits: [
        { memberId: 'm1', amount: 200 },
        { memberId: 'm2', amount: 200 },
        { memberId: 'm3', amount: 200 },
      ],
      createdAt: '2026-10-03T12:00:00Z',
      updatedAt: '2026-10-03T12:00:00Z',
    });

    // Pairwise debt checks:
    // Charlie owes Alice 100
    const debtCharlieToAlice = getPairwiseNetDebt(session, 'm3', 'm1');
    expect(debtCharlieToAlice).toBe(100);

    // Charlie owes Bob 100
    const debtCharlieToBob = getPairwiseNetDebt(session, 'm3', 'm2');
    expect(debtCharlieToBob).toBe(100);

    // Alice and Bob pairwise debt between each other is 0
    const debtAliceToBob = getPairwiseNetDebt(session, 'm1', 'm2');
    expect(debtAliceToBob).toBe(0);

    // Now Charlie settles: 100 to Alice, 100 to Bob
    session.settlements.push({
      id: 'stl_c_a',
      sessionId: session.sessionId,
      fromMemberId: 'm3',
      toMemberId: 'm1',
      amount: 100,
      date: '2026-10-03T13:00:00Z',
      recordedBy: { memberId: 'm3', name: 'Charlie' },
      createdAt: '2026-10-03T13:00:00Z',
    });
    session.settlements.push({
      id: 'stl_c_b',
      sessionId: session.sessionId,
      fromMemberId: 'm3',
      toMemberId: 'm2',
      amount: 100,
      date: '2026-10-03T13:00:00Z',
      recordedBy: { memberId: 'm3', name: 'Charlie' },
      createdAt: '2026-10-03T13:00:00Z',
    });

    const positionsAfter = calculateMemberNetPositions(session);
    positionsAfter.forEach((p) => {
      expect(p.netBalance).toBe(0); // Everyone is completely 0 net balance!
    });
  });

  test('Invariant 4: Cyclic Debt cancellation (A pays for B, B pays for C, C pays for A)', () => {
    const session = createMockSession(members);

    // 1. Alice pays 100 for Bob
    session.expenses.push({
      id: 'c1',
      sessionId: session.sessionId,
      title: 'Coffee for Bob',
      amount: 100,
      currency: 'INR',
      category: 'Drinks',
      date: '2026-10-04T09:00:00Z',
      createdBy: { memberId: 'm1', name: 'Alice' },
      paidBy: [{ memberId: 'm1', amount: 100 }],
      splitMode: 'exact',
      splits: [{ memberId: 'm2', amount: 100 }],
      createdAt: '2026-10-04T09:00:00Z',
      updatedAt: '2026-10-04T09:00:00Z',
    });

    // 2. Bob pays 100 for Charlie
    session.expenses.push({
      id: 'c2',
      sessionId: session.sessionId,
      title: 'Snack for Charlie',
      amount: 100,
      currency: 'INR',
      category: 'Food',
      date: '2026-10-04T10:00:00Z',
      createdBy: { memberId: 'm2', name: 'Bob' },
      paidBy: [{ memberId: 'm2', amount: 100 }],
      splitMode: 'exact',
      splits: [{ memberId: 'm3', amount: 100 }],
      createdAt: '2026-10-04T10:00:00Z',
      updatedAt: '2026-10-04T10:00:00Z',
    });

    // 3. Charlie pays 100 for Alice
    session.expenses.push({
      id: 'c3',
      sessionId: session.sessionId,
      title: 'Juice for Alice',
      amount: 100,
      currency: 'INR',
      category: 'Drinks',
      date: '2026-10-04T11:00:00Z',
      createdBy: { memberId: 'm3', name: 'Charlie' },
      paidBy: [{ memberId: 'm3', amount: 100 }],
      splitMode: 'exact',
      splits: [{ memberId: 'm1', amount: 100 }],
      createdAt: '2026-10-04T11:00:00Z',
      updatedAt: '2026-10-04T11:00:00Z',
    });

    const positions = calculateMemberNetPositions(session);

    // Net balance of all three is 0 because of cycle cancellation!
    // Alice: paid 100, consumed 100 => 0
    // Bob: paid 100, consumed 100 => 0
    // Charlie: paid 100, consumed 100 => 0
    positions.forEach((p) => {
      expect(p.netBalance).toBe(0);
    });

    // Zero transactions needed to settle!
    const simplified = simplifyDebts(positions);
    expect(simplified).toHaveLength(0);
  });

  test('Invariant 5: Decimal Precision and Remainder Cent Distribution', () => {
    // ₹100 split 3 ways must sum to exactly ₹100.00 without loss of 1 paisa
    const splits = calculateEqualSplits(100, ['m1', 'm2', 'm3']);
    const sumCents = splits.reduce((acc, s) => acc + toCents(s.amount), 0);
    expect(sumCents).toBe(10000); // exactly 10000 cents

    // ₹100 split with weights (e.g. family headcounts: 2, 3, 1)
    const weightedSplits = calculateEqualSplits(100, ['m1', 'm2', 'm3'], {
      m1: 2,
      m2: 3,
      m3: 1,
    });
    const weightedSumCents = weightedSplits.reduce((acc, s) => acc + toCents(s.amount), 0);
    expect(weightedSumCents).toBe(10000);
  });

  test('Invariant 6: Pairwise Net Debt preserves floating point accuracy without round-down to 0', () => {
    const session = createMockSession(members);

    // Multi-payer expense where a small proportion is paid
    // Total 1000. Charlie paid 997, Bob paid 3.
    // Alice split is 334.
    session.expenses.push({
      id: 'e_precision',
      sessionId: session.sessionId,
      title: 'Precision Check',
      amount: 1000,
      currency: 'INR',
      category: 'Other',
      date: '2026-10-05T12:00:00Z',
      createdBy: { memberId: 'm3', name: 'Charlie' },
      paidBy: [
        { memberId: 'm3', amount: 997 },
        { memberId: 'm2', amount: 3 },
      ],
      splitMode: 'exact',
      splits: [
        { memberId: 'm1', amount: 334 },
        { memberId: 'm2', amount: 333 },
        { memberId: 'm3', amount: 333 },
      ],
      createdAt: '2026-10-05T12:00:00Z',
      updatedAt: '2026-10-05T12:00:00Z',
    });

    // Debt Alice owes Bob: (334 * 3) / 1000 = 1.002 INR -> rounds to ₹1.00
    const debtAliceToBob = getPairwiseNetDebt(session, 'm1', 'm2');
    expect(debtAliceToBob).toBe(1);

    // Status for Alice on this expense must NOT be auto-adjusted to settled because she owes money
    const aliceMember = members.find((m) => m.id === 'm1')!;
    const status = getExpenseMemberStatus(session.expenses[0], aliceMember, session);
    expect(status.status).toBe('pending');
  });

  test('Invariant 7: Partial settlement maintains exact net zero-sum balance', () => {
    const session = createMockSession(members);

    // Alice pays 1000 for Bob and Alice (500 each)
    session.expenses.push({
      id: 'e_partial',
      sessionId: session.sessionId,
      title: 'Hotel',
      amount: 1000,
      currency: 'INR',
      category: 'Stay',
      date: '2026-10-06T10:00:00Z',
      createdBy: { memberId: 'm1', name: 'Alice' },
      paidBy: [{ memberId: 'm1', amount: 1000 }],
      splitMode: 'equal',
      splits: [
        { memberId: 'm1', amount: 500 },
        { memberId: 'm2', amount: 500 },
      ],
      createdAt: '2026-10-06T10:00:00Z',
      updatedAt: '2026-10-06T10:00:00Z',
    });

    // Bob only pays 200 today (partial payment)
    session.settlements.push({
      id: 'stl_part',
      sessionId: session.sessionId,
      fromMemberId: 'm2',
      toMemberId: 'm1',
      amount: 200,
      date: '2026-10-06T12:00:00Z',
      recordedBy: { memberId: 'm2', name: 'Bob' },
      createdAt: '2026-10-06T12:00:00Z',
    });

    const positions = calculateMemberNetPositions(session);
    const posMap = new Map(positions.map((p) => [p.memberId, p.netBalance]));

    // Alice: paid 1000, liability 500, received 200 => net +300 (gets back 300)
    expect(posMap.get('m1')).toBe(300);

    // Bob: paid 0, liability 500, paid 200 => net -300 (owes 300)
    expect(posMap.get('m2')).toBe(-300);

    // Sum is strictly 0
    const totalNet = positions.reduce((acc, p) => acc + p.netBalance, 0);
    expect(Math.abs(totalNet)).toBeLessThanOrEqual(0.001);

    // Simplified debt: Bob pays Alice 300
    const simplified = simplifyDebts(positions);
    expect(simplified).toHaveLength(1);
    expect(simplified[0].fromMemberId).toBe('m2');
    expect(simplified[0].toMemberId).toBe('m1');
    expect(simplified[0].amount).toBe(300);
  });

  test('Invariant 8: Dependent member liabilities route to Primary Payer without balance leaks', () => {
    const familyMembers: SplitMember[] = [
      { id: 'p1', name: 'Parent', handle: '@parent', color: '#10B981', isDependent: false },
      {
        id: 'd1',
        name: 'Child',
        handle: '@child',
        color: '#EC4899',
        isDependent: true,
        primaryPayerMemberId: 'p1',
      },
      { id: 'f1', name: 'Friend', handle: '@friend', color: '#3B82F6', isDependent: false },
    ];

    const session = createMockSession(familyMembers);

    // Friend pays 1500 for Parent (500), Child (500), Friend (500)
    session.expenses.push({
      id: 'e_fam',
      sessionId: session.sessionId,
      title: 'Family Activity',
      amount: 1500,
      currency: 'INR',
      category: 'Activities',
      date: '2026-10-07T10:00:00Z',
      createdBy: { memberId: 'f1', name: 'Friend' },
      paidBy: [{ memberId: 'f1', amount: 1500 }],
      splitMode: 'equal',
      splits: [
        { memberId: 'p1', amount: 500 },
        { memberId: 'd1', amount: 500 },
        { memberId: 'f1', amount: 500 },
      ],
      createdAt: '2026-10-07T10:00:00Z',
      updatedAt: '2026-10-07T10:00:00Z',
    });

    const positions = calculateMemberNetPositions(session);
    const posMap = new Map(positions.map((p) => [p.memberId, p.netBalance]));

    // Child net balance must be exactly 0 (debt absorbed by Parent)
    expect(posMap.get('d1')).toBe(0);

    // Parent owes their 500 + Child 500 = 1000
    expect(posMap.get('p1')).toBe(-1000);

    // Friend is owed 1000 (1500 paid - 500 share)
    expect(posMap.get('f1')).toBe(1000);

    // Total net is strictly 0
    const totalNet = positions.reduce((acc, p) => acc + p.netBalance, 0);
    expect(Math.abs(totalNet)).toBeLessThanOrEqual(0.001);

    // Debt simplifies directly from Parent to Friend for 1000
    const simplified = simplifyDebts(positions);
    expect(simplified).toHaveLength(1);
    expect(simplified[0].fromMemberId).toBe('p1');
    expect(simplified[0].toMemberId).toBe('f1');
    expect(simplified[0].amount).toBe(1000);
  });
});
