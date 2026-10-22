import {
  calculateEqualSplits,
  autoBalanceExactShares,
  calculateMemberNetPositions,
  simplifyDebts,
  roundTo2Decimals,
  toCents,
  fromCents,
  generateSessionId,
  getExpenseMemberStatus,
  getItemizedExpensesForPair,
} from '@/lib/splitter/debtEngine';
import { SplitSession } from '@/types/splitter';

describe('Splitter Debt Engine', () => {
  test('calculateEqualSplits divides amount accurately with remainder handling', () => {
    // 100 divided among 3 members: 33.34, 33.33, 33.33 => total 100.00
    const splits = calculateEqualSplits(100, ['m1', 'm2', 'm3']);
    expect(splits).toHaveLength(3);
    const sum = splits.reduce((acc, s) => acc + s.amount, 0);
    expect(roundTo2Decimals(sum)).toBe(100);
    expect(splits[0].amount).toBe(33.34);
    expect(splits[1].amount).toBe(33.33);
    expect(splits[2].amount).toBe(33.33);
  });

  test('calculateMemberNetPositions routes dependent liabilities to primary payer', () => {
    // Papa (m1, primary), Kid (m2, dependent of m1), Friend (m3, independent)
    const session: SplitSession = {
      sessionId: 'CAP-SPLIT-TEST-1',
      userId: 'user_1',
      name: 'Family & Friend Trip',
      template: 'family',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      currency: 'INR',
      status: 'active',
      members: [
        {
          id: 'm1',
          name: 'Papa',
          handle: '@papa',
          color: '#6366F1',
          isDependent: false,
        },
        {
          id: 'm2',
          name: 'Kid',
          handle: '@kid',
          color: '#EC4899',
          isDependent: true,
          primaryPayerMemberId: 'm1',
        },
        {
          id: 'm3',
          name: 'Friend',
          handle: '@friend',
          color: '#10B981',
          isDependent: false,
        },
      ],
      expenses: [
        {
          id: 'exp1',
          sessionId: 'CAP-SPLIT-TEST-1',
          title: 'Amusement Park Tickets',
          amount: 3000,
          currency: 'INR',
          category: 'Entertainment',
          date: '2026-10-02T10:00:00Z',
          createdBy: { memberId: 'm3', name: 'Friend' },
          paidBy: [{ memberId: 'm3', amount: 3000 }], // Friend paid 3000
          splitMode: 'equal',
          splits: [
            { memberId: 'm1', amount: 1000 },
            { memberId: 'm2', amount: 1000 }, // Kid consumes 1000
            { memberId: 'm3', amount: 1000 },
          ],
          createdAt: '2026-10-02T10:00:00Z',
          updatedAt: '2026-10-02T10:00:00Z',
        },
      ],
      settlements: [],
      auditLogs: [],
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-02T10:00:00Z',
    };

    const positions = calculateMemberNetPositions(session);
    const papa = positions.find((p) => p.memberId === 'm1')!;
    const kid = positions.find((p) => p.memberId === 'm2')!;
    const friend = positions.find((p) => p.memberId === 'm3')!;

    // Friend paid 3000, owes 1000 => Net: +2000 (Gets back 2000)
    expect(friend.netBalance).toBe(2000);
    expect(friend.individualSpend).toBe(1000);

    // Kid consumed 1000, but is dependent => Kid's effective net balance is 0!
    expect(kid.individualSpend).toBe(1000);
    expect(kid.netBalance).toBe(0);

    // Papa consumed 1000, absorbed 1000 from Kid => Papa owes 2000 => Net: -2000 (Owes 2000)
    expect(papa.individualSpend).toBe(1000);
    expect(papa.dependentLiabilitiesAbsorbed).toBe(1000);
    expect(papa.netBalance).toBe(-2000);

    // Now test min-cash-flow simplification: Papa should pay Friend 2000
    const debts = simplifyDebts(positions);
    expect(debts).toHaveLength(1);
    expect(debts[0].fromMemberId).toBe('m1');
    expect(debts[0].toMemberId).toBe('m3');
    expect(debts[0].amount).toBe(2000);
  });

  test('partial settlement updates net balances accurately', () => {
    const session: SplitSession = {
      sessionId: 'CAP-SPLIT-TEST-2',
      userId: 'user_1',
      name: 'Flatmates',
      template: 'group',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      currency: 'INR',
      status: 'active',
      members: [
        { id: 'm1', name: 'Alice', handle: '@alice', color: '#6366F1', isDependent: false },
        { id: 'm2', name: 'Bob', handle: '@bob', color: '#10B981', isDependent: false },
      ],
      expenses: [
        {
          id: 'exp1',
          sessionId: 'CAP-SPLIT-TEST-2',
          title: 'Groceries',
          amount: 2000,
          currency: 'INR',
          category: 'Food',
          date: '2026-10-01T12:00:00Z',
          createdBy: { memberId: 'm1', name: 'Alice' },
          paidBy: [{ memberId: 'm1', amount: 2000 }],
          splitMode: 'equal',
          splits: [
            { memberId: 'm1', amount: 1000 },
            { memberId: 'm2', amount: 1000 },
          ],
          createdAt: '2026-10-01T12:00:00Z',
          updatedAt: '2026-10-01T12:00:00Z',
        },
      ],
      settlements: [
        {
          id: 'st1',
          sessionId: 'CAP-SPLIT-TEST-2',
          fromMemberId: 'm2', // Bob pays Alice 600
          toMemberId: 'm1',
          amount: 600,
          date: '2026-10-02T15:00:00Z',
          recordedBy: { memberId: 'm2', name: 'Bob' },
          createdAt: '2026-10-02T15:00:00Z',
        },
      ],
      auditLogs: [],
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-02T15:00:00Z',
    };

    const positions = calculateMemberNetPositions(session);
    const alice = positions.find((p) => p.memberId === 'm1')!;
    const bob = positions.find((p) => p.memberId === 'm2')!;

    // Bob originally owed 1000, paid 600 => now owes 400
    expect(bob.netBalance).toBe(-400);
    // Alice was owed 1000, received 600 => now gets back 400
    expect(alice.netBalance).toBe(400);

    const simplified = simplifyDebts(positions);
    expect(simplified).toHaveLength(1);
    expect(simplified[0].fromMemberName).toBe('Bob');
    expect(simplified[0].toMemberName).toBe('Alice');
    expect(simplified[0].amount).toBe(400);
  });

  test('calculateEqualSplits distributes amounts proportionally by family headcount', () => {
    // 7000 total: Ramesh (family of 4), Priya (family of 2), Amit (1)
    // 4 + 2 + 1 = 7 parts
    // Ramesh: 4000, Priya: 2000, Amit: 1000
    const weights = { m_ramesh: 4, m_priya: 2, m_amit: 1 };
    const splits = calculateEqualSplits(7000, ['m_ramesh', 'm_priya', 'm_amit'], weights);
    
    expect(splits).toHaveLength(3);
    const sum = splits.reduce((acc, s) => acc + s.amount, 0);
    expect(roundTo2Decimals(sum)).toBe(7000);

    const ramesh = splits.find((s) => s.memberId === 'm_ramesh')!;
    const priya = splits.find((s) => s.memberId === 'm_priya')!;
    const amit = splits.find((s) => s.memberId === 'm_amit')!;

    expect(ramesh.amount).toBe(4000);
    expect(priya.amount).toBe(2000);
    expect(amit.amount).toBe(1000);
  });

  test('autoBalanceExactShares auto-balances other members when one member value is changed', () => {
    // Total: 1000, 4 participants A, B, C, D (initially 250 each)
    const participants = ['A', 'B', 'C', 'D'];
    const initialShares = { A: '250.00', B: '250.00', C: '250.00', D: '250.00' };
    const customizedIds = new Set<string>();

    // User edits A to 400: remaining 600 should be split equally across B, C, D (200 each)
    const step1 = autoBalanceExactShares(1000, participants, initialShares, 'A', '400.00', customizedIds);
    expect(step1.updatedShares['A']).toBe('400.00');
    expect(step1.updatedShares['B']).toBe('200.00');
    expect(step1.updatedShares['C']).toBe('200.00');
    expect(step1.updatedShares['D']).toBe('200.00');
    const sumStep1 = Object.values(step1.updatedShares).reduce((acc, v) => acc + parseFloat(v), 0);
    expect(roundTo2Decimals(sumStep1)).toBe(1000);

    // User then edits B to 350: A stays 400 (customized), remaining 250 split across C, D (125 each)
    const step2 = autoBalanceExactShares(
      1000,
      participants,
      step1.updatedShares,
      'B',
      '350.00',
      step1.updatedCustomizedIds
    );
    expect(step2.updatedShares['A']).toBe('400.00');
    expect(step2.updatedShares['B']).toBe('350.00');
    expect(step2.updatedShares['C']).toBe('125.00');
    expect(step2.updatedShares['D']).toBe('125.00');
    const sumStep2 = Object.values(step2.updatedShares).reduce((acc, v) => acc + parseFloat(v), 0);
    expect(roundTo2Decimals(sumStep2)).toBe(1000);
  });

  test('generateSessionId generates ID starting with CAP@ containing uppercase, lowercase, and numbers [0-9]', () => {
    const id = generateSessionId();
    expect(id.startsWith('CAP@')).toBe(true);
    const suffix = id.slice(4);
    expect(suffix.length).toBe(8);
    // Contains at least one uppercase
    expect(/[A-Z]/.test(suffix)).toBe(true);
    // Contains at least one lowercase
    expect(/[a-z]/.test(suffix)).toBe(true);
    // Contains at least one digit
    expect(/[0-9]/.test(suffix)).toBe(true);
    // Contains only alphanumeric characters
    expect(/^[A-Za-z0-9]+$/.test(suffix)).toBe(true);
  });

  test('getExpenseMemberStatus correctly computes paid, pending, and settled statuses', () => {
    const members = [
      { id: 'm1', name: 'Alice', handle: '@alice', color: '#10B981', isDependent: false },
      { id: 'm2', name: 'Bob', handle: '@bob', color: '#6366F1', isDependent: false },
    ];

    const expense = {
      id: 'e1',
      sessionId: 'CAP@test',
      title: 'Dinner',
      amount: 100,
      currency: 'INR',
      category: 'Food',
      date: '2026-10-22',
      createdBy: { memberId: 'm1', name: 'Alice' },
      paidBy: [{ memberId: 'm1', amount: 100 }],
      splitMode: 'equal' as const,
      splits: [
        { memberId: 'm1', amount: 50 },
        { memberId: 'm2', amount: 50 },
      ],
      createdAt: '2026-10-22',
      updatedAt: '2026-10-22',
    };

    // Alice paid 100 upfront, her share is 50 -> status: paid
    const aliceStatus = getExpenseMemberStatus(expense, members[0], members);
    expect(aliceStatus.status).toBe('paid');
    expect(aliceStatus.isPayer).toBe(true);

    // Bob paid 0, his share is 50 -> status: pending
    const bobStatus = getExpenseMemberStatus(expense, members[1], members);
    expect(bobStatus.status).toBe('pending');
    expect(bobStatus.canMarkSettled).toBe(true);

    // If Bob's split is marked settled -> status: settled
    const settledExpense = {
      ...expense,
      splits: [
        { memberId: 'm1', amount: 50 },
        { memberId: 'm2', amount: 50, settled: true },
      ],
    };
    const bobSettledStatus = getExpenseMemberStatus(settledExpense, members[1], members);
    expect(bobSettledStatus.status).toBe('settled');
    expect(bobSettledStatus.canUndo).toBe(true);
  });

  test('getItemizedExpensesForPair retrieves expenses between debtor and creditor', () => {
    const session: SplitSession = {
      sessionId: 'CAP@test',
      userId: 'u1',
      name: 'Trip',
      template: 'group',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      currency: 'INR',
      status: 'active',
      members: [
        { id: 'm1', name: 'Alice', handle: '@alice', color: '#10B981', isDependent: false },
        { id: 'm2', name: 'Bob', handle: '@bob', color: '#6366F1', isDependent: false },
      ],
      expenses: [
        {
          id: 'e1',
          sessionId: 'CAP@test',
          title: 'Lunch',
          amount: 200,
          currency: 'INR',
          category: 'Food',
          date: '2026-10-02',
          createdBy: { memberId: 'm1', name: 'Alice' },
          paidBy: [{ memberId: 'm1', amount: 200 }],
          splitMode: 'equal',
          splits: [
            { memberId: 'm1', amount: 100 },
            { memberId: 'm2', amount: 100, settled: false },
          ],
          createdAt: '2026-10-02',
          updatedAt: '2026-10-02',
        },
      ],
      settlements: [],
      auditLogs: [],
      createdAt: '2026-10-01',
      updatedAt: '2026-10-02',
    };

    const breakdown = getItemizedExpensesForPair(session, 'm2', 'm1');
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].title).toBe('Lunch');
    expect(breakdown[0].shareAmount).toBe(100);
    expect(breakdown[0].settled).toBe(false);
  });
});
