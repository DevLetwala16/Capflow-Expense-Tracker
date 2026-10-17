import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb/connection';
import SplitSessionModel from '@/lib/mongodb/splitSessionModel';
import { roundTo2Decimals, formatSplitCurrency } from '@/lib/splitter/debtEngine';
import { SplitSettlement, SplitAuditLog } from '@/types/splitter';

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

    const { fromMemberId, toMemberId, amount, notes, recordedBy } = body;

    if (!fromMemberId || !toMemberId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'fromMemberId, toMemberId, and a positive amount are required' },
        { status: 400 }
      );
    }

    if (fromMemberId === toMemberId) {
      return NextResponse.json(
        { error: 'Cannot record settlement between the same member' },
        { status: 400 }
      );
    }

    const fromMember = session.members.find((m) => m.id === fromMemberId);
    const toMember = session.members.find((m) => m.id === toMemberId);

    if (!fromMember || !toMember) {
      return NextResponse.json(
        { error: 'Both from and to members must belong to this session' },
        { status: 400 }
      );
    }

    const parsedAmount = roundTo2Decimals(Number(amount));
    const now = new Date().toISOString();
    const settlementId = `stl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newSettlement: SplitSettlement = {
      id: settlementId,
      sessionId: session.sessionId,
      fromMemberId,
      toMemberId,
      amount: parsedAmount,
      date: body.date || now,
      notes,
      recordedBy: recordedBy || {
        memberId: fromMemberId,
        name: fromMember.name,
      },
      createdAt: now,
    };

    session.settlements.unshift(newSettlement);

    // Audit log
    const auditLog: SplitAuditLog = {
      id: `log_${Date.now()}_stl`,
      sessionId: session.sessionId,
      timestamp: now,
      memberId: newSettlement.recordedBy.memberId,
      memberName: newSettlement.recordedBy.name,
      action: `Settlement: ${fromMember.name} paid ${toMember.name} ${formatSplitCurrency(
        parsedAmount,
        session.currency
      )}`,
      details: notes,
    };
    session.auditLogs.unshift(auditLog);

    await session.save();

    return NextResponse.json({
      success: true,
      settlement: newSettlement,
      session,
      auditLog,
    });
  } catch (error: any) {
    console.error('Error logging split settlement:', error);
    return NextResponse.json(
      { error: 'Failed to record settlement', details: error.message },
      { status: 500 }
    );
  }
}
