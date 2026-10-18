import {
  syncExpenseToCapFlowTransactions,
  syncSettlementToCapFlowTransactions,
  removeSyncedExpenseTransaction,
} from "@/lib/splitter/splitterTransactionSync";
import { SplitSession, SplitExpenseItem } from "@/types/splitter";

// Mock Dexie DB
const mockTransactions = new Map<number, any>();
let nextTxId = 1;

jest.mock("@/lib/db", () => ({
  db: {
    transactions: {
      add: jest.fn(async (txData: any) => {
        const id = nextTxId++;
        const item = { ...txData, id };
        mockTransactions.set(id, item);
        return id;
      }),
      update: jest.fn(async (id: number, updates: any) => {
        const existing = mockTransactions.get(id);
        if (existing) {
          mockTransactions.set(id, { ...existing, ...updates });
        }
      }),
      delete: jest.fn(async (id: number) => {
        mockTransactions.delete(id);
      }),
      get: jest.fn(async (id: number) => mockTransactions.get(id)),
      where: jest.fn(() => ({
        equals: jest.fn(() => ({
          filter: jest.fn((filterFn: (tx: any) => boolean) => ({
            first: jest.fn(async () => {
              const all = Array.from(mockTransactions.values());
              for (const tx of all) {
                if (filterFn(tx)) return tx;
              }
              return null;
            }),
            toArray: jest.fn(async () => {
              const res: any[] = [];
              const all = Array.from(mockTransactions.values());
              for (const tx of all) {
                if (filterFn(tx)) res.push(tx);
              }
              return res;
            }),
          })),
        })),
      })),
    },
    categories: {
      where: jest.fn(() => ({
        equals: jest.fn(() => ({
          sortBy: jest.fn(async () => [
            { id: 1, name: "Food", type: "expense" },
            { id: 2, name: "Travel", type: "expense" },
            { id: 9, name: "Salary", type: "income" },
            { id: 10, name: "Other", type: "both" },
          ]),
        })),
      })),
    },
  },
}));

// Mock transaction store
const mockAddTx = jest.fn(async () => {});
const mockUpdateTx = jest.fn(async () => {});
const mockDeleteTx = jest.fn(async () => {});
const mockLoadCumulativeBalance = jest.fn(async () => {});

jest.mock("@/lib/store/transactionStore", () => ({
  useTransactionStore: {
    getState: () => ({
      addTransaction: mockAddTx,
      updateTransaction: mockUpdateTx,
      deleteTransaction: mockDeleteTx,
      loadCumulativeBalance: mockLoadCumulativeBalance,
    }),
  },
}));

// Mock category store
jest.mock("@/lib/store/categoryStore", () => ({
  useCategoryStore: {
    getState: () => ({
      loadCategories: jest.fn(async () => [
        { id: 1, name: "Food", type: "expense" },
        { id: 2, name: "Travel", type: "expense" },
        { id: 9, name: "Salary", type: "income" },
        { id: 10, name: "Other", type: "both" },
      ]),
    }),
  },
}));

describe("Splitter to CapFlow Transaction Synchronization", () => {
  const sampleSession: SplitSession = {
    sessionId: "SESSION-123",
    userId: "user-1",
    name: "Goa Vacation",
    template: "group",
    currency: "INR",
    status: "active",
    startDate: "2026-10-18",
    endDate: "2026-10-22",
    createdAt: "2026-10-18T00:00:00.000Z",
    updatedAt: "2026-10-18T00:00:00.000Z",
    members: [
      { id: "mem_1", name: "Alice", handle: "@alice", userId: "user-1", color: "#6366F1", isDependent: false },
      { id: "mem_2", name: "Bob", handle: "@bob", userId: "user-2", color: "#10B981", isDependent: false },
      { id: "mem_3", name: "Charlie", handle: "@charlie", color: "#F59E0B", isDependent: false },
    ],
    expenses: [],
    settlements: [],
    auditLogs: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactions.clear();
    nextTxId = 1;
  });

  test("syncExpenseToCapFlowTransactions records expense when current user is in paidBy", async () => {
    const expense: SplitExpenseItem = {
      id: "exp_1",
      sessionId: "SESSION-123",
      title: "Seafood Dinner",
      amount: 1500,
      currency: "INR",
      category: "Food",
      date: "2026-10-18T19:00:00.000Z",
      createdBy: { memberId: "mem_1", name: "Alice" },
      paidBy: [
        { memberId: "mem_1", amount: 1500 }, // Alice paid full amount
      ],
      splitMode: "equal",
      splits: [
        { memberId: "mem_1", amount: 500 },
        { memberId: "mem_2", amount: 500 },
        { memberId: "mem_3", amount: 500 },
      ],
      createdAt: "2026-10-18T19:00:00.000Z",
      updatedAt: "2026-10-18T19:00:00.000Z",
    };

    const res = await syncExpenseToCapFlowTransactions({
      session: sampleSession,
      expense,
      userId: "user-1",
    });

    expect(res).not.toBeNull();
    expect(res?.synced).toBe(true);
    expect(res?.amount).toBe(1500);
    expect(res?.type).toBe("expense");

    expect(mockAddTx).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "expense",
        amount: 1500,
        currency: "INR",
        categoryId: 1, // Food
        title: "Seafood Dinner",
      }),
      "user-1"
    );
    expect(mockLoadCumulativeBalance).toHaveBeenCalledWith("user-1");
  });

  test("syncExpenseToCapFlowTransactions ignores expense if user paid 0", async () => {
    const expense: SplitExpenseItem = {
      id: "exp_2",
      sessionId: "SESSION-123",
      title: "Scuba Diving",
      amount: 3000,
      currency: "INR",
      category: "Travel",
      date: "2026-10-19T10:00:00.000Z",
      createdBy: { memberId: "mem_2", name: "Bob" },
      paidBy: [
        { memberId: "mem_2", amount: 3000 }, // Bob paid, Alice paid 0
      ],
      splitMode: "equal",
      splits: [
        { memberId: "mem_1", amount: 1000 },
        { memberId: "mem_2", amount: 1000 },
        { memberId: "mem_3", amount: 1000 },
      ],
      createdAt: "2026-10-19T10:00:00.000Z",
      updatedAt: "2026-10-19T10:00:00.000Z",
    };

    const res = await syncExpenseToCapFlowTransactions({
      session: sampleSession,
      expense,
      userId: "user-1",
    });

    expect(res).toBeNull();
    expect(mockAddTx).not.toHaveBeenCalled();
  });

  test("syncSettlementToCapFlowTransactions records INCOME when someone pays the user", async () => {
    // Bob pays Alice (user-1) 500
    const settlement = {
      id: "stl_1",
      fromMemberId: "mem_2", // Bob
      toMemberId: "mem_1",   // Alice (user-1)
      amount: 500,
      notes: "Settling dinner share via UPI",
      date: "2026-10-20T12:00:00.000Z",
    };

    const res = await syncSettlementToCapFlowTransactions({
      session: sampleSession,
      settlement,
      userId: "user-1",
    });

    expect(res).not.toBeNull();
    expect(res?.synced).toBe(true);
    expect(res?.type).toBe("income");
    expect(res?.amount).toBe(500);
    expect(res?.counterpartyName).toBe("Bob");

    expect(mockAddTx).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "income",
        amount: 500,
        currency: "INR",
        title: "Settlement from Bob",
        paymentMethod: "bank_transfer",
      }),
      "user-1"
    );
    expect(mockLoadCumulativeBalance).toHaveBeenCalledWith("user-1");
  });

  test("syncSettlementToCapFlowTransactions records EXPENSE when the user pays someone", async () => {
    // Alice (user-1) pays Charlie 300
    const settlement = {
      id: "stl_2",
      fromMemberId: "mem_1", // Alice (user-1)
      toMemberId: "mem_3",   // Charlie
      amount: 300,
      notes: "Cab fare repayment",
      date: "2026-10-20T14:00:00.000Z",
    };

    const res = await syncSettlementToCapFlowTransactions({
      session: sampleSession,
      settlement,
      userId: "user-1",
    });

    expect(res).not.toBeNull();
    expect(res?.synced).toBe(true);
    expect(res?.type).toBe("expense");
    expect(res?.amount).toBe(300);
    expect(res?.counterpartyName).toBe("Charlie");

    expect(mockAddTx).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "expense",
        amount: 300,
        currency: "INR",
        title: "Settlement to Charlie",
      }),
      "user-1"
    );
    expect(mockLoadCumulativeBalance).toHaveBeenCalledWith("user-1");
  });

  test("syncSettlementToCapFlowTransactions does nothing if settlement does not involve user", async () => {
    // Bob pays Charlie (neither is user-1)
    const settlement = {
      id: "stl_3",
      fromMemberId: "mem_2",
      toMemberId: "mem_3",
      amount: 750,
    };

    const res = await syncSettlementToCapFlowTransactions({
      session: sampleSession,
      settlement,
      userId: "user-1",
    });

    expect(res).toBeNull();
    expect(mockAddTx).not.toHaveBeenCalled();
  });
});
