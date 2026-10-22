import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb/connection';
import SplitSessionModel from '@/lib/mongodb/splitSessionModel';
import { formatSplitCurrency } from '@/lib/splitter/debtEngine';
import { SplitAuditLog } from '@/types/splitter';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  try {
    await connectMongoDB();
    const { id, expenseId } = params;

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

    const expIndex = session.expenses.findIndex((e) => e.id === expenseId);
    if (expIndex === -1) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const removed = session.expenses[expIndex];
    session.expenses.splice(expIndex, 1);

    const now = new Date().toISOString();
    const auditLog: SplitAuditLog = {
      id: `log_${Date.now()}_del`,
      sessionId: session.sessionId,
      timestamp: now,
      memberName: 'Member',
      action: `Deleted expense "${removed.title}" (${formatSplitCurrency(removed.amount, session.currency)})`,
    };
    session.auditLogs.unshift(auditLog);

    session.markModified('expenses');
    session.markModified('auditLogs');
    await session.save();

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete expense', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; expenseId: string } }
) {
  try {
    await connectMongoDB();
    const { id, expenseId } = params;
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

    const expIndex = session.expenses.findIndex((e) => e.id === expenseId);
    if (expIndex === -1) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const currentExp = session.expenses[expIndex];
    if (body.splits) {
      currentExp.splits = body.splits.map((s: any) => ({
        memberId: s.memberId,
        amount: s.amount,
        settled: !!s.settled,
        settledAt: s.settledAt,
        settlementId: s.settlementId,
      }));
    }
    if (body.title) currentExp.title = body.title;
    if (body.amount !== undefined) currentExp.amount = body.amount;
    currentExp.updatedAt = new Date().toISOString();

    session.expenses[expIndex] = currentExp;
    session.markModified('expenses');
    await session.save();

    return NextResponse.json({ success: true, expense: currentExp, session });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update expense', details: error.message },
      { status: 500 }
    );
  }
}
