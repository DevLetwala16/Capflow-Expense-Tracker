import { create } from 'zustand';
import { db } from '@/lib/db';
import {
  SplitSession,
  SplitExpenseItem,
  SplitSettlement,
  SplitMember,
  SplitAuditLog,
} from '@/types/splitter';
import { generateSessionId, roundTo2Decimals, formatSplitCurrency } from '@/lib/splitter/debtEngine';
import { useAuthStore } from '@/lib/store/authStore';
import {
  syncExpenseToCapFlowTransactions,
  syncSettlementToCapFlowTransactions,
  removeSyncedExpenseTransaction,
} from '@/lib/splitter/splitterTransactionSync';

interface LiveToast {
  id: string;
  message: string;
  timestamp: number;
}

interface SplitterState {
  sessions: SplitSession[];
  activeSession: SplitSession | null;
  loading: boolean;
  syncing: boolean;
  isOffline: boolean;
  liveToasts: LiveToast[];

  // Actions
  loadSessions: (userId: string) => Promise<void>;
  loadSessionById: (sessionId: string) => Promise<SplitSession | null>;
  createSession: (
    data: {
      name: string;
      description?: string;
      template: 'solo' | 'family' | 'group';
      startDate: string;
      endDate: string;
      currency: string;
      budgetCap?: number;
      members?: SplitMember[];
    },
    userId: string,
    creatorName: string
  ) => Promise<SplitSession>;
  updateSession: (
    sessionId: string,
    updates: Partial<SplitSession>,
    updaterName?: string
  ) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;

  addOrUpdateExpense: (
    sessionId: string,
    expenseData: Partial<SplitExpenseItem>
  ) => Promise<SplitExpenseItem>;
  deleteExpense: (sessionId: string, expenseId: string) => Promise<void>;

  recordSettlement: (
    sessionId: string,
    settlementData: {
      fromMemberId: string;
      toMemberId: string;
      amount: number;
      date?: string;
      notes?: string;
      recordedBy?: { memberId: string; name: string };
    }
  ) => Promise<SplitSettlement>;

  joinSession: (
    sessionId: string,
    member: Partial<SplitMember>
  ) => Promise<SplitSession>;

  startRealtimeSync: (sessionId: string) => void;
  stopRealtimeSync: () => void;
  syncOfflineQueue: () => Promise<void>;
  dismissToast: (id: string) => void;
}

let syncInterval: NodeJS.Timeout | null = null;
let lastKnownAuditLogId: string | null = null;

export const useSplitterStore = create<SplitterState>((set, get) => ({
  sessions: [],
  activeSession: null,
  loading: false,
  syncing: false,
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  liveToasts: [],

  dismissToast: (id: string) => {
    set((state) => ({
      liveToasts: state.liveToasts.filter((t) => t.id !== id),
    }));
  },

  loadSessions: async (userId: string) => {
    set({ loading: true });
    try {
      // 1. Read from Dexie local database for instant UI
      const localSessions = await db.splitSessions.toArray();
      const userLocal = localSessions.filter(
        (s) => s.userId === userId || s.members?.some((m) => m.userId === userId)
      );
      if (userLocal.length > 0) {
        set({ sessions: userLocal });
      }

      // 2. Fetch from remote MongoDB API if online
      if (typeof navigator === 'undefined' || navigator.onLine) {
        try {
          const res = await fetch(`/api/splitter/sessions?userId=${encodeURIComponent(userId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.sessions && Array.isArray(data.sessions)) {
              // Cache to Dexie in an atomic transaction
              await db.transaction('rw', db.splitSessions, async () => {
                for (const s of data.sessions) {
                  const existing = await db.splitSessions
                    .where('sessionId')
                    .equals(s.sessionId)
                    .first();
                  if (existing?.id) {
                    await db.splitSessions.put({ ...s, id: existing.id });
                  } else {
                    await db.splitSessions.add(s);
                  }
                }
              });
              set({ sessions: data.sessions });
            }
          }
        } catch (e) {
          console.warn('[Splitter] Remote sync failed, using local offline data:', e);
        }
      }
    } finally {
      set({ loading: false });
    }
  },

  loadSessionById: async (sessionId: string) => {
    set({ loading: true });
    try {
      // 1. Check local Dexie first
      let session = await db.splitSessions.where('sessionId').equals(sessionId).first();
      if (session) {
        set({ activeSession: session });
        lastKnownAuditLogId = session.auditLogs?.[0]?.id || null;
      }

      // 2. Check remote API
      if (typeof navigator === 'undefined' || navigator.onLine) {
        try {
          const res = await fetch(`/api/splitter/sessions/${encodeURIComponent(sessionId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.session) {
              session = data.session;
              // Update local Dexie
              const localExisting = await db.splitSessions
                .where('sessionId')
                .equals(sessionId)
                .first();
              if (localExisting?.id) {
                await db.splitSessions.put({ ...session!, id: localExisting.id });
              } else {
                await db.splitSessions.add(session!);
              }
              set({ activeSession: session });
              lastKnownAuditLogId = session?.auditLogs?.[0]?.id || null;
            }
          }
        } catch (e) {
          console.warn('[Splitter] Remote fetch failed, using local copy:', e);
        }
      }

      return session || null;
    } finally {
      set({ loading: false });
    }
  },

  createSession: async (data, userId, creatorName) => {
    set({ syncing: true });
    const now = new Date().toISOString();
    const tempSessionId = generateSessionId();

    const members: SplitMember[] = data.members && data.members.length > 0
      ? data.members
      : [
          {
            id: 'mem_creator',
            name: creatorName,
            handle: `@${creatorName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'admin'}`,
            color: '#6366F1',
            isDependent: false,
            userId,
          },
        ];

    const initialAudit: SplitAuditLog = {
      id: `log_${Date.now()}_init`,
      sessionId: tempSessionId,
      timestamp: now,
      memberName: creatorName,
      action: `Created new session "${data.name}"`,
    };

    const newSession: SplitSession = {
      sessionId: tempSessionId,
      userId,
      name: data.name.trim(),
      description: data.description?.trim(),
      template: data.template,
      startDate: data.startDate,
      endDate: data.endDate,
      currency: data.currency || 'INR',
      budgetCap: data.budgetCap,
      status: 'active',
      members,
      expenses: [],
      settlements: [],
      auditLogs: [initialAudit],
      createdAt: now,
      updatedAt: now,
    };

    // ACID transaction save to Dexie
    await db.transaction('rw', db.splitSessions, async () => {
      const id = await db.splitSessions.add(newSession);
      newSession.id = id;
    });

    set((state) => ({
      sessions: [newSession, ...state.sessions],
      activeSession: newSession,
    }));

    // Sync with remote API
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const res = await fetch('/api/splitter/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            userId,
            creatorName,
          }),
        });
        if (res.ok) {
          const respData = await res.json();
          if (respData.session) {
            const remoteSession = respData.session;
            await db.splitSessions.where('sessionId').equals(tempSessionId).delete();
            const id = await db.splitSessions.add(remoteSession);
            remoteSession.id = id;

            set((state) => ({
              sessions: state.sessions.map((s) =>
                s.sessionId === tempSessionId ? remoteSession : s
              ),
              activeSession: remoteSession,
            }));
            return remoteSession;
          }
        }
      } catch (e) {
        console.warn('[Splitter] Remote creation failed; saved to local database:', e);
      }
    }

    set({ syncing: false });
    return newSession;
  },

  updateSession: async (sessionId, updates, updaterName = 'Member') => {
    const { activeSession, sessions } = get();
    const current = activeSession?.sessionId === sessionId
      ? activeSession
      : sessions.find((s) => s.sessionId === sessionId);

    if (!current) return;

    const rollbackState = { ...current };

    try {
      // Optimistic local ACID update
      await db.transaction('rw', db.splitSessions, async () => {
        const dbRec = await db.splitSessions.where('sessionId').equals(sessionId).first();
        if (dbRec?.id) {
          await db.splitSessions.update(dbRec.id, {
            ...updates,
            updatedAt: new Date().toISOString(),
          });
        }
      });

      const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
      set((state) => ({
        activeSession: state.activeSession?.sessionId === sessionId ? updated : state.activeSession,
        sessions: state.sessions.map((s) => (s.sessionId === sessionId ? updated : s)),
      }));

      // Remote sync
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await fetch(`/api/splitter/sessions/${encodeURIComponent(sessionId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...updates, updaterName }),
        });
      }
    } catch (err) {
      // Rollback on failure
      console.error('[Splitter] Transaction failed, rolling back:', err);
      set((state) => ({
        activeSession: state.activeSession?.sessionId === sessionId ? rollbackState : state.activeSession,
        sessions: state.sessions.map((s) => (s.sessionId === sessionId ? rollbackState : s)),
      }));
      throw err;
    }
  },

  deleteSession: async (sessionId: string) => {
    await db.transaction('rw', db.splitSessions, async () => {
      await db.splitSessions.where('sessionId').equals(sessionId).delete();
    });

    set((state) => ({
      sessions: state.sessions.filter((s) => s.sessionId !== sessionId),
      activeSession: state.activeSession?.sessionId === sessionId ? null : state.activeSession,
    }));

    if (typeof navigator === 'undefined' || navigator.onLine) {
      fetch(`/api/splitter/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
      }).catch(console.error);
    }
  },

  addOrUpdateExpense: async (sessionId, expenseData) => {
    const { activeSession } = get();
    if (!activeSession) throw new Error('No active session');

    // Create deep copy for rollback safety
    const rollbackSession: SplitSession = JSON.parse(JSON.stringify(activeSession));

    const now = new Date().toISOString();
    const isEdit = !!expenseData.id;
    const resolvedExpenseId =
      expenseData.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newExpense: SplitExpenseItem = {
      id: resolvedExpenseId,
      sessionId,
      title: expenseData.title || 'Untitled Expense',
      amount: roundTo2Decimals(Number(expenseData.amount || 0)),
      currency: expenseData.currency || activeSession.currency || 'INR',
      category: expenseData.category || 'Other',
      date: expenseData.date || now,
      createdBy: expenseData.createdBy || {
        memberId: activeSession.members[0]?.id || 'unknown',
        name: activeSession.members[0]?.name || 'Member',
      },
      paidBy: expenseData.paidBy || [],
      splitMode: expenseData.splitMode || 'equal',
      splits: expenseData.splits || [],
      considerFamilyMembers: expenseData.considerFamilyMembers !== undefined ? expenseData.considerFamilyMembers : true,
      memberWeights: expenseData.memberWeights,
      receiptImage: expenseData.receiptImage,
      notes: expenseData.notes,
      createdAt: expenseData.createdAt || now,
      updatedAt: now,
    };

    const auditAction = isEdit
      ? `Updated expense "${newExpense.title}" for ${formatSplitCurrency(
          newExpense.amount,
          newExpense.currency
        )}`
      : `Added "${newExpense.title}" for ${formatSplitCurrency(
          newExpense.amount,
          newExpense.currency
        )}`;

    const auditLog: SplitAuditLog = {
      id: `log_${Date.now()}_exp`,
      sessionId,
      timestamp: now,
      memberId: newExpense.createdBy.memberId,
      memberName: newExpense.createdBy.name,
      action: auditAction,
    };

    try {
      // 1. Optimistic ACID mutation in Dexie
      await db.transaction('rw', db.splitSessions, async () => {
        const local = await db.splitSessions.where('sessionId').equals(sessionId).first();
        if (local) {
          const updatedExpenses = [...local.expenses];
          if (isEdit) {
            const idx = updatedExpenses.findIndex((e) => e.id === resolvedExpenseId);
            if (idx >= 0) updatedExpenses[idx] = newExpense;
            else updatedExpenses.unshift(newExpense);
          } else {
            updatedExpenses.unshift(newExpense);
          }

          const updatedLogs = [auditLog, ...(local.auditLogs || [])];
          await db.splitSessions.update(local.id!, {
            expenses: updatedExpenses,
            auditLogs: updatedLogs,
            updatedAt: now,
          });
        }
      });

      // Update in-memory state
      const updatedExpenses = [...activeSession.expenses];
      if (isEdit) {
        const idx = updatedExpenses.findIndex((e) => e.id === resolvedExpenseId);
        if (idx >= 0) updatedExpenses[idx] = newExpense;
        else updatedExpenses.unshift(newExpense);
      } else {
        updatedExpenses.unshift(newExpense);
      }

      const updatedSession: SplitSession = {
        ...activeSession,
        expenses: updatedExpenses,
        auditLogs: [auditLog, ...activeSession.auditLogs],
        updatedAt: now,
      };

      set((state) => ({
        activeSession: updatedSession,
        sessions: state.sessions.map((s) => (s.sessionId === sessionId ? updatedSession : s)),
      }));

      // 2. Push to remote API if online, or queue if offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await db.splitOfflineQueue.add({
          sessionId,
          action: isEdit ? 'EDIT_EXPENSE' : 'ADD_EXPENSE',
          payload: newExpense,
          timestamp: now,
          status: 'pending',
          retryCount: 0,
        });
      } else {
        fetch(`/api/splitter/sessions/${encodeURIComponent(sessionId)}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newExpense),
        }).catch(async (err) => {
          console.warn('[Splitter] Network error pushing expense, queuing offline:', err);
          await db.splitOfflineQueue.add({
            sessionId,
            action: isEdit ? 'EDIT_EXPENSE' : 'ADD_EXPENSE',
            payload: newExpense,
            timestamp: now,
            status: 'pending',
            retryCount: 0,
          });
        });
      }

      // Sync to CapFlow Transactions and update cumulative balance
      const authUser = useAuthStore.getState().user;
      if (authUser?.id) {
        syncExpenseToCapFlowTransactions({
          session: updatedSession,
          expense: newExpense,
          userId: authUser.id,
        })
          .then((res) => {
            if (res?.synced) {
              set((state) => ({
                liveToasts: [
                  {
                    id: `toast_${Date.now()}`,
                    message: `Synced to Transactions: Spent ${formatSplitCurrency(
                      res.amount,
                      newExpense.currency
                    )} (Balance updated)`,
                    timestamp: Date.now(),
                  },
                  ...state.liveToasts,
                ],
              }));
            }
          })
          .catch((err) => console.warn('[Splitter] Transaction sync warning:', err));
      }

      return newExpense;
    } catch (error) {
      // Rollback to previous state on transaction error
      console.error('[Splitter] ACID transaction rollback on expense failure:', error);
      set({ activeSession: rollbackSession });
      throw error;
    }
  },

  deleteExpense: async (sessionId, expenseId) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const rollbackSession: SplitSession = JSON.parse(JSON.stringify(activeSession));
    const now = new Date().toISOString();
    const target = activeSession.expenses.find((e) => e.id === expenseId);
    if (!target) return;

    const auditLog: SplitAuditLog = {
      id: `log_${Date.now()}_del`,
      sessionId,
      timestamp: now,
      memberName: 'Member',
      action: `Deleted expense "${target.title}"`,
    };

    try {
      await db.transaction('rw', db.splitSessions, async () => {
        const local = await db.splitSessions.where('sessionId').equals(sessionId).first();
        if (local) {
          const filtered = local.expenses.filter((e) => e.id !== expenseId);
          await db.splitSessions.update(local.id!, {
            expenses: filtered,
            auditLogs: [auditLog, ...(local.auditLogs || [])],
            updatedAt: now,
          });
        }
      });

      const updatedSession: SplitSession = {
        ...activeSession,
        expenses: activeSession.expenses.filter((e) => e.id !== expenseId),
        auditLogs: [auditLog, ...activeSession.auditLogs],
        updatedAt: now,
      };

      set((state) => ({
        activeSession: updatedSession,
        sessions: state.sessions.map((s) => (s.sessionId === sessionId ? updatedSession : s)),
      }));

      if (typeof navigator === 'undefined' || navigator.onLine) {
        fetch(
          `/api/splitter/sessions/${encodeURIComponent(sessionId)}/expenses/${encodeURIComponent(
            expenseId
          )}`,
          { method: 'DELETE' }
        ).catch(console.error);
      }

      // Sync removal to CapFlow transactions & update cumulative balance
      const authUser = useAuthStore.getState().user;
      if (authUser?.id) {
        removeSyncedExpenseTransaction(sessionId, expenseId, authUser.id).catch((err) =>
          console.warn('[Splitter] Transaction delete sync warning:', err)
        );
      }
    } catch (err) {
      console.error('[Splitter] Rollback delete expense:', err);
      set({ activeSession: rollbackSession });
      throw err;
    }
  },

  recordSettlement: async (sessionId, data) => {
    const { activeSession } = get();
    if (!activeSession) throw new Error('No active session');

    const rollbackSession: SplitSession = JSON.parse(JSON.stringify(activeSession));
    const now = new Date().toISOString();
    const settlementId = `stl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const fromMember = activeSession.members.find((m) => m.id === data.fromMemberId);
    const toMember = activeSession.members.find((m) => m.id === data.toMemberId);

    const settlement: SplitSettlement = {
      id: settlementId,
      sessionId,
      fromMemberId: data.fromMemberId,
      toMemberId: data.toMemberId,
      amount: roundTo2Decimals(data.amount),
      date: data.date || now,
      notes: data.notes,
      recordedBy: data.recordedBy || {
        memberId: data.fromMemberId,
        name: fromMember?.name || 'Member',
      },
      createdAt: now,
    };

    const auditLog: SplitAuditLog = {
      id: `log_${Date.now()}_stl`,
      sessionId,
      timestamp: now,
      memberId: settlement.recordedBy.memberId,
      memberName: settlement.recordedBy.name,
      action: `Settlement: ${fromMember?.name || 'Member'} paid ${toMember?.name || 'Member'} ${formatSplitCurrency(
        settlement.amount,
        activeSession.currency
      )}`,
      details: data.notes,
    };

    try {
      await db.transaction('rw', db.splitSessions, async () => {
        const local = await db.splitSessions.where('sessionId').equals(sessionId).first();
        if (local) {
          const updatedSettlements = [settlement, ...(local.settlements || [])];
          await db.splitSessions.update(local.id!, {
            settlements: updatedSettlements,
            auditLogs: [auditLog, ...(local.auditLogs || [])],
            updatedAt: now,
          });
        }
      });

      const updatedSession: SplitSession = {
        ...activeSession,
        settlements: [settlement, ...activeSession.settlements],
        auditLogs: [auditLog, ...activeSession.auditLogs],
        updatedAt: now,
      };

      set((state) => ({
        activeSession: updatedSession,
        sessions: state.sessions.map((s) => (s.sessionId === sessionId ? updatedSession : s)),
      }));

      // Remote sync
      if (typeof navigator === 'undefined' || navigator.onLine) {
        fetch(`/api/splitter/sessions/${encodeURIComponent(sessionId)}/settlements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settlement),
        }).catch(async (err) => {
          console.warn('[Splitter] Network error recording settlement, queuing offline:', err);
          await db.splitOfflineQueue.add({
            sessionId,
            action: 'SETTLE',
            payload: settlement,
            timestamp: now,
            status: 'pending',
            retryCount: 0,
          });
        });
      }

      // Sync to CapFlow Transactions and update cumulative balance
      const authUser = useAuthStore.getState().user;
      if (authUser?.id) {
        syncSettlementToCapFlowTransactions({
          session: updatedSession,
          settlement,
          userId: authUser.id,
        })
          .then((res) => {
            if (res?.synced) {
              set((state) => ({
                liveToasts: [
                  {
                    id: `toast_${Date.now()}`,
                    message:
                      res.type === 'income'
                        ? `Synced to Transactions: Received ${formatSplitCurrency(
                            res.amount,
                            updatedSession.currency
                          )} from ${res.counterpartyName} (+Balance updated)`
                        : `Synced to Transactions: Paid ${formatSplitCurrency(
                            res.amount,
                            updatedSession.currency
                          )} to ${res.counterpartyName} (-Balance updated)`,
                    timestamp: Date.now(),
                  },
                  ...state.liveToasts,
                ],
              }));
            }
          })
          .catch((err) => console.warn('[Splitter] Settlement sync warning:', err));
      }

      return settlement;
    } catch (err) {
      console.error('[Splitter] Settlement rollback:', err);
      set({ activeSession: rollbackSession });
      throw err;
    }
  },

  joinSession: async (sessionId, member) => {
    const res = await fetch('/api/splitter/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, member }),
    });

    if (!res.ok) {
      const err = await res.json();
      const customErr: any = new Error(err.error || 'Failed to join session');
      customErr.status = res.status;
      customErr.alreadyJoined = err.alreadyJoined;
      customErr.sessionId = err.sessionId || sessionId;
      throw customErr;
    }

    const data = await res.json();
    const joinedSession: SplitSession = data.session;

    // Cache to Dexie
    await db.transaction('rw', db.splitSessions, async () => {
      const existing = await db.splitSessions.where('sessionId').equals(joinedSession.sessionId).first();
      if (existing?.id) {
        await db.splitSessions.put({ ...joinedSession, id: existing.id });
      } else {
        await db.splitSessions.add(joinedSession);
      }
    });

    set((state) => ({
      activeSession: joinedSession,
      sessions: [
        joinedSession,
        ...state.sessions.filter((s) => s.sessionId !== joinedSession.sessionId),
      ],
    }));

    return joinedSession;
  },

  startRealtimeSync: (sessionId: string) => {
    if (syncInterval) clearInterval(syncInterval);

    // Initial check
    lastKnownAuditLogId = get().activeSession?.auditLogs?.[0]?.id || null;

    syncInterval = setInterval(async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        set({ isOffline: true });
        return;
      }
      set({ isOffline: false });

      try {
        const res = await fetch(`/api/splitter/sessions/${encodeURIComponent(sessionId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const remoteSession: SplitSession = data.session;
        if (!remoteSession) return;

        const currentActive = get().activeSession;
        if (!currentActive || currentActive.sessionId !== sessionId) return;

        // Check if remote has newer audit logs (indicating mutation from another member)
        const remoteLatestLog = remoteSession.auditLogs?.[0];
        if (remoteLatestLog && remoteLatestLog.id !== lastKnownAuditLogId) {
          lastKnownAuditLogId = remoteLatestLog.id;

          // Push live toast
          const newToast: LiveToast = {
            id: `toast_${Date.now()}`,
            message: remoteLatestLog.action,
            timestamp: Date.now(),
          };

          // Update Dexie and state
          const local = await db.splitSessions.where('sessionId').equals(sessionId).first();
          if (local?.id) {
            await db.splitSessions.put({ ...remoteSession, id: local.id });
          }

          set((state) => ({
            activeSession: remoteSession,
            sessions: state.sessions.map((s) =>
              s.sessionId === sessionId ? remoteSession : s
            ),
            liveToasts: [newToast, ...state.liveToasts].slice(0, 4),
          }));
        }
      } catch {
        // quiet catch on sync errors
      }
    }, 4000);
  },

  stopRealtimeSync: () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  },

  syncOfflineQueue: async () => {
    const queue = await db.splitOfflineQueue.where('status').equals('pending').toArray();
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        if (item.action === 'ADD_EXPENSE' || item.action === 'EDIT_EXPENSE') {
          await fetch(`/api/splitter/sessions/${encodeURIComponent(item.sessionId)}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
        } else if (item.action === 'SETTLE') {
          await fetch(`/api/splitter/sessions/${encodeURIComponent(item.sessionId)}/settlements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
        }
        await db.splitOfflineQueue.delete(item.id!);
      } catch (e) {
        console.warn('[Splitter] Offline queue retry failed for item', item.id, e);
      }
    }
  },
}));
