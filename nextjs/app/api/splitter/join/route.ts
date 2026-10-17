import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb/connection';
import SplitSessionModel from '@/lib/mongodb/splitSessionModel';
import { SplitMember, SplitAuditLog } from '@/types/splitter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectMongoDB();
    const body = await req.json();
    const { sessionId, member } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const cleanSessionId = sessionId.trim().toUpperCase();
    const session = await SplitSessionModel.findOne({ sessionId: cleanSessionId });

    if (!session) {
      return NextResponse.json(
        { error: `Session "${cleanSessionId}" not found. Please verify the Session ID or QR code.` },
        { status: 404 }
      );
    }

    if (!member || !member.name) {
      // Just returning session info if verifying before joining
      return NextResponse.json({ session });
    }

    const now = new Date().toISOString();
    // Check if member already present
    const existingIdx = session.members.findIndex(
      (m) =>
        (member.userId && m.userId === member.userId) ||
        (member.handle && m.handle.toLowerCase() === member.handle.toLowerCase()) ||
        (m.id === member.id)
    );

    let joinedMember: SplitMember;

    if (existingIdx >= 0) {
      // Update existing member record
      joinedMember = {
        ...session.members[existingIdx],
        ...member,
      };
      session.members[existingIdx] = joinedMember;
    } else {
      // Add new member
      const memberColors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#0EA5E9', '#F97316'];
      const assignedColor =
        member.color || memberColors[session.members.length % memberColors.length];

      joinedMember = {
        id: member.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: member.name.trim(),
        phone: member.phone?.trim(),
        email: member.email?.trim(),
        handle:
          member.handle ||
          `@${member.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'member'}`,
        color: assignedColor,
        avatar: member.avatar,
        isDependent: !!member.isDependent,
        primaryPayerMemberId: member.primaryPayerMemberId,
        userId: member.userId,
      };

      session.members.push(joinedMember);

      // Audit log
      const auditLog: SplitAuditLog = {
        id: `log_${Date.now()}_join`,
        sessionId: session.sessionId,
        timestamp: now,
        memberId: joinedMember.id,
        memberName: joinedMember.name,
        action: `${joinedMember.name} (${joinedMember.handle}) joined the session via Session ID / QR Code`,
      };
      session.auditLogs.unshift(auditLog);
    }

    await session.save();

    return NextResponse.json({
      success: true,
      session,
      member: joinedMember,
    });
  } catch (error: any) {
    console.error('Error joining session:', error);
    return NextResponse.json(
      { error: 'Failed to join session', details: error.message },
      { status: 500 }
    );
  }
}
