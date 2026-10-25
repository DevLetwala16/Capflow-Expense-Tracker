import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb/connection';
import SplitSessionModel from '@/lib/mongodb/splitSessionModel';
import { roundTo2Decimals, formatSplitCurrency } from '@/lib/splitter/debtEngine';
import { SplitSettlement, SplitAuditLog } from '@/types/splitter';
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
      expenseId: body.expenseId,
      recordedBy: recordedBy || {
        memberId: fromMemberId,
        name: fromMember.name,
      },
      createdAt: now,
    };

    session.settlements.unshift(newSettlement);

    // If specific expenseId provided, update that split to settled
    if (body.expenseId) {
      const exp = session.expenses.find((e: any) => e.id === body.expenseId);
      if (exp) {
        const split = exp.splits.find((s: any) => s.memberId === fromMemberId);
        if (split) {
          split.settled = true;
          split.settledAt = now;
          split.settlementId = settlementId;
        }
      }
    } else {
      // General settlement between fromMemberId and toMemberId:
      // mark pending matching splits as settled up to settled amount
      let remainingToSettle = parsedAmount;
      for (const exp of session.expenses) {
        if (remainingToSettle <= 0) break;
        const toPaid = exp.paidBy?.some((p: any) => p.memberId === toMemberId);
        if (toPaid) {
          const split = exp.splits?.find((s: any) => s.memberId === fromMemberId && !s.settled);
          if (split && split.amount <= remainingToSettle + 0.01) {
            split.settled = true;
            split.settledAt = now;
            split.settlementId = settlementId;
            remainingToSettle -= split.amount;
          }
        }
      }
    }

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

    session.markModified('settlements');
    session.markModified('expenses');
    session.markModified('auditLogs');
    await session.save();

    // Notify settlement participants in background
    try {
      const recipientEmails = [toMember.email, fromMember.email].filter(Boolean) as string[];
      const recipientUserIds = [toMember.userId, fromMember.userId].filter(Boolean) as string[];
      if (recipientEmails.length > 0 || recipientUserIds.length > 0) {
        sendWebPushToUsers({
          emails: recipientEmails,
          userIds: recipientUserIds,
          payload: {
            title: `🤝 Settlement: ${session.name}`,
            body: `${fromMember.name} paid ${toMember.name} ${formatSplitCurrency(parsedAmount, session.currency)}. Balances updated!`,
            tag: `split-stl-${newSettlement.id}`,
            data: { url: `/budgets/splitter/${session.sessionId}` },
          },
        }).catch((err) => console.warn("[WebPush] Async settlement push error:", err));
      }
    } catch (pushErr) {
      console.warn("[WebPush] Error preparing settlement notification:", pushErr);
    }

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectMongoDB();
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const settlementId = body.settlementId || url.searchParams.get('settlementId');
    const expenseId = body.expenseId || url.searchParams.get('expenseId');
    const memberId = body.memberId || url.searchParams.get('memberId');
    const deleteAll = body.deleteAll === true || url.searchParams.get('deleteAll') === 'true' || settlementId === 'all';

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

    if (deleteAll) {
      // Delete all settlements and reset all splits
      session.settlements = [];
      session.expenses.forEach((exp: any) => {
        exp.splits?.forEach((s: any) => {
          s.settled = false;
          s.settledAt = undefined;
          s.settlementId = undefined;
        });
      });

      const auditLog: SplitAuditLog = {
        id: `log_${Date.now()}_del_all_stl`,
        sessionId: session.sessionId,
        timestamp: new Date().toISOString(),
        memberId: body.deletedBy?.memberId || 'system',
        memberName: body.deletedBy?.name || 'Member',
        action: 'Deleted all settlement history records',
      };
      session.auditLogs.unshift(auditLog);
      session.markModified('auditLogs');
    } else {
      // 1. Remove settlement if settlementId given or matching expenseId
      if (settlementId) {
        session.settlements = session.settlements.filter((s: any) => s.id !== settlementId);
      } else if (expenseId) {
        session.settlements = session.settlements.filter((s: any) => s.expenseId !== expenseId);
      }

      // 2. Unsettle expense split if expenseId given
      if (expenseId) {
        const exp = session.expenses.find((e: any) => e.id === expenseId);
        if (exp) {
          if (memberId) {
            const split = exp.splits.find((s: any) => s.memberId === memberId);
            if (split) {
              split.settled = false;
              split.settledAt = undefined;
              split.settlementId = undefined;
            }
          } else {
            exp.splits.forEach((s: any) => {
              s.settled = false;
              s.settledAt = undefined;
              s.settlementId = undefined;
            });
          }
        }
      }
    }

    session.markModified('settlements');
    session.markModified('expenses');
    await session.save();

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error('Error removing settlement:', error);
    return NextResponse.json(
      { error: 'Failed to remove settlement', details: error.message },
      { status: 500 }
    );
  }
}
