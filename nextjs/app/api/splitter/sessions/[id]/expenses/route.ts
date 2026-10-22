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
      $or: [{ sessionId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
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
        newExpense.createdAt = session.expenses[existingIdx].createdAt;
        session.expenses[existingIdx] = newExpense;
      } else {
        session.expenses.unshift(newExpense);
      }
    } else {
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

    await session.save();

    // Notify group members in the background (even if app is closed!)
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

      if (recipientEmails.length > 0 || recipientUserIds.length > 0) {
        sendWebPushToUsers({
          emails: recipientEmails,
          userIds: recipientUserIds,
          payload: {
            title: `💸 New Split: ${session.name}`,
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
