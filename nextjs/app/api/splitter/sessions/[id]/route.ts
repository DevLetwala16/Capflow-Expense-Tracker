import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb/connection';
import SplitSessionModel from '@/lib/mongodb/splitSessionModel';
import { SplitAuditLog } from '@/types/splitter';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectMongoDB();
    const id = params.id;

    // Can search by sessionId (e.g. CAP-SPLIT-9821-X) or Mongo _id
    const session = await SplitSessionModel.findOne({
      $or: [
        { sessionId: id },
        { sessionId: decodeURIComponent(id) },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    }).lean();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve session', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Check what was updated and append audit log if necessary
    const now = new Date().toISOString();
    const updaterName = body.updaterName || 'Member';

    if (body.name !== undefined) session.name = body.name;
    if (body.description !== undefined) session.description = body.description;
    if (body.template !== undefined) session.template = body.template;
    if (body.currency !== undefined) session.currency = body.currency;
    if (body.budgetCap !== undefined) session.budgetCap = body.budgetCap;
    if (body.startDate !== undefined) session.startDate = body.startDate;
    if (body.endDate !== undefined) session.endDate = body.endDate;
    if (body.status !== undefined && body.status !== session.status) {
      session.status = body.status;
      session.auditLogs.unshift({
        id: `log_${Date.now()}_status`,
        sessionId: session.sessionId,
        timestamp: now,
        memberName: updaterName,
        action: `Marked session as ${body.status.toUpperCase()}`,
      } as SplitAuditLog);
    }
    if (body.members !== undefined) {
      session.members = body.members;
    }

    await session.save();

    return NextResponse.json({ session });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update session', details: error.message },
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

    await SplitSessionModel.deleteOne({
      $or: [
        { sessionId: id },
        { sessionId: decodeURIComponent(id) },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete session', details: error.message },
      { status: 500 }
    );
  }
}
