import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb/connection';
import SplitSessionModel from '@/lib/mongodb/splitSessionModel';
import {
  roundTo2Decimals,
  calculateEqualSplits,
  formatSplitCurrency,
  toCents,
} from '@/lib/splitter/debtEngine';
import { SplitExpenseItem, SplitAuditLog } from '@/types/splitter';
import { sendWebPushToUsers } from '@/lib/notifications/webPushServer';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectMongoDB();
    const id = params.id;
    const body = await req.json();

    const session = await SplitSessionModel.findOne({
      $or: [
        { sessionId: id },
        { sessionId: decodeURIComponent(id) },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const {
      id: expenseId,
      title,
      amount,
      category,
      date,
      createdBy,
      paidBy = [],
      splitMode = 'equal',
      splits = [],
      considerFamilyMembers,
      memberWeights: customMemberWeights,
      receiptImage,
      notes,
    } = body;

    if (!title || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid title and positive amount are required' },
        { status: 400 }
      );
    }

    const parsedAmount = roundTo2Decimals(Number(amount));

    // Validate paidBy sum
    const totalPaidCents = paidBy.reduce((acc: number, p: any) => acc + toCents(p.amount), 0);
    if (totalPaidCents !== toCents(parsedAmount)) {
      return NextResponse.json(
        {
          error: `Paid amounts sum (${totalPaidCents / 100}) does not match expense total (${parsedAmount})`,
        },
        { status: 400 }
      );
    }

    // Process splits
    let finalSplits = splits;
    if (splitMode === 'equal') {
      const participantIds = splits.map((s: any) => s.memberId);
      const memberWeights: Record<string, number> = {};
      if (considerFamilyMembers !== false) {
        if (customMemberWeights && typeof customMemberWeights === 'object') {
          Object.assign(memberWeights, customMemberWeights);
        } else {
          session.members?.forEach((m: any) => {
            if (m.familyCount && m.familyCount > 1) {
              memberWeights[m.id] = m.familyCount;
            }
          });
        }
      }
      finalSplits = calculateEqualSplits(parsedAmount, participantIds, memberWeights);
    } else {
      // Validate exact split sum
      const splitSumCents = splits.reduce((acc: number, s: any) => acc + toCents(s.amount), 0);
      if (splitSumCents !== toCents(parsedAmount)) {
        return NextResponse.json(
          {
            error: `Split shares sum (${splitSumCents / 100}) does not match expense total (${parsedAmount})`,
          },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const isEdit = !!expenseId;
    const resolvedExpenseId = expenseId || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newExpense: SplitExpenseItem = {
      id: resolvedExpenseId,
      sessionId: session.sessionId,
      title: title.trim(),
      amount: parsedAmount,
      currency: session.currency || 'INR',
      category: category || 'Other',
      date: date || now,
      createdBy: createdBy || {
        memberId: paidBy[0]?.memberId || 'member_unknown',
        name: 'Member',
      },
      paidBy: paidBy.map((p: any) => ({
        memberId: p.memberId,
        amount: roundTo2Decimals(p.amount),
      })),
      splitMode,
      splits: finalSplits.map((s: any) => ({
        memberId: s.memberId,
        amount: roundTo2Decimals(s.amount),
        settled: !!s.settled,
        settledAt: s.settledAt,
        settlementId: s.settlementId,
      })),
      considerFamilyMembers: considerFamilyMembers !== undefined ? considerFamilyMembers : true,
      memberWeights: customMemberWeights,
      receiptImage,
      notes,
      createdAt: now,
      updatedAt: now,
    };

    if (isEdit) {
      const existingIdx = session.expenses.findIndex((e) => e.id === resolvedExpenseId);
      if (existingIdx >= 0) {
        const oldExpense = session.expenses[existingIdx];
        // Bug 5 Fix: Preserve settled status where amount unchanged; reset where amount changed.
        // An edited split amount invalidates any prior settlement for that split.
        newExpense.splits = newExpense.splits.map((split) => {
          const oldSplit = oldExpense.splits.find((s: any) => s.memberId === split.memberId);
          if (!oldSplit) return split; // new participant — no prior settlement to worry about
          if (Math.abs(oldSplit.amount - split.amount) > 0.009) {
            // Amount changed → old settlement is no longer valid for this split
            return { memberId: split.memberId, amount: split.amount, settled: false, settledAt: undefined, settlementId: undefined };
          }
          // Amount unchanged → carry forward existing settled state exactly
          return { ...split, settled: oldSplit.settled ?? split.settled, settledAt: oldSplit.settledAt, settlementId: oldSplit.settlementId };
        });
        newExpense.createdAt = oldExpense.createdAt;
        session.expenses[existingIdx] = newExpense;
      } else {
        session.expenses.unshift(newExpense);
      }
    } else {
      // Bug 1 Fix: Idempotency guard — if the same expense ID already exists (offline retry),
      // return it as-is instead of inserting a duplicate that would double all balances.
      const alreadyExists = session.expenses.some((e: any) => e.id === resolvedExpenseId);
      if (alreadyExists) {
        return NextResponse.json({
          success: true,
          expense: session.expenses.find((e: any) => e.id === resolvedExpenseId),
          session,
          auditLog: null,
        });
      }
      session.expenses.unshift(newExpense);
    }

    // Append to immutable audit trail
    const auditAction = isEdit
      ? `Updated expense "${title}" for ${formatSplitCurrency(parsedAmount, session.currency)}`
      : `Added "${title}" for ${formatSplitCurrency(parsedAmount, session.currency)}`;

    const auditLog: SplitAuditLog = {
      id: `log_${Date.now()}_exp`,
      sessionId: session.sessionId,
      timestamp: now,
      memberId: newExpense.createdBy.memberId,
      memberName: newExpense.createdBy.name,
      action: auditAction,
    };
    session.auditLogs.unshift(auditLog);

    session.markModified('expenses');
    session.markModified('auditLogs');
    await session.save();

    // Notify all connected group members in the background (even if app is closed!)
    try {
      const otherMembers = (session.members || []).filter(
        (m: any) => m.id !== newExpense.createdBy.memberId
      );
      const recipientEmails = otherMembers
        .map((m: any) => m.email)
        .filter(Boolean) as string[];
      const recipientUserIds = otherMembers
        .map((m: any) => m.userId)
        .filter(Boolean) as string[];

      // Ensure session creator also receives alert if someone else logged the expense
      if (
        session.userId &&
        session.userId !== newExpense.createdBy.memberId &&
        !recipientUserIds.includes(session.userId)
      ) {
        recipientUserIds.push(session.userId);
      }

      if (recipientEmails.length > 0 || recipientUserIds.length > 0) {
        sendWebPushToUsers({
          emails: recipientEmails,
          userIds: recipientUserIds,
          payload: {
            title: `💸 Itemized Expense: ${session.name}`,
            body: `${newExpense.createdBy.name} added "${newExpense.title}" for ${session.currency} ${newExpense.amount}. Tap to view breakdown!`,
            tag: `split-exp-${newExpense.id}`,
            data: { url: `/budgets/splitter/${session.sessionId}` },
          },
        }).catch((err) => console.warn("[WebPush] Async splitter push error:", err));
      }
    } catch (pushErr) {
      console.warn("[WebPush] Error preparing splitter notification:", pushErr);
    }

    return NextResponse.json({
      success: true,
      expense: newExpense,
      session,
      auditLog,
    });
  } catch (error: any) {
    console.error('Error logging split expense:', error);
    return NextResponse.json(
      { error: 'Failed to record expense', details: error.message },
      { status: 500 }
    );
  }
}
