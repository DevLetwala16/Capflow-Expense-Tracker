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
      $or: [{ sessionId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
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

    await session.save();

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete expense', details: error.message },
      { status: 500 }
    );
  }
}
