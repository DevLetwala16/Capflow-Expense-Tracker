import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectMongoDB } from '@/lib/mongodb/connection';
import SplitSessionModel from '@/lib/mongodb/splitSessionModel';
import User from '@/lib/mongodb/userModel';
import { generateSessionId } from '@/lib/splitter/debtEngine';
import { SplitMember, SplitAuditLog } from '@/types/splitter';
import { sendWebPushToUsers } from '@/lib/notifications/webPushServer';

export const dynamic = 'force-dynamic';

function getUserIdFromRequest(req: NextRequest): { userId: string; name: string } | null {
  try {
    const token = req.cookies.get('capflow_token')?.value;
    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
        userId: string;
        name?: string;
        email?: string;
      };
      return { userId: decoded.userId, name: decoded.name || 'User' };
    }
  } catch {
    // ignore
  }

  // Fallback to headers for offline/custom clients
  const headerUserId = req.headers.get('x-user-id');
  const headerUserName = req.headers.get('x-user-name');
  if (headerUserId) {
    return { userId: headerUserId, name: headerUserName || 'User' };
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    await connectMongoDB();
    const auth = getUserIdFromRequest(req);
    const url = new URL(req.url);
    const queryUserId = url.searchParams.get('userId') || auth?.userId;

    if (!queryUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Find sessions created by user OR where user is a member
    const sessions = await SplitSessionModel.find({
      $or: [
        { userId: queryUserId },
        { 'members.userId': queryUserId },
      ],
    }).sort({ updatedAt: -1 }).lean();

    // Enrich members with latest paymentQrCode and upiId from Users
    const allUserIds = new Set<string>();
    const allEmails = new Set<string>();
    for (const s of sessions) {
      for (const m of (s.members || [])) {
        if (m.userId && m.userId.match(/^[0-9a-fA-F]{24}$/)) allUserIds.add(m.userId);
        if (m.email) allEmails.add(m.email.toLowerCase());
      }
    }

    if (allUserIds.size > 0 || allEmails.size > 0) {
      const users = await User.find({
        $or: [
          ...(allUserIds.size > 0 ? [{ _id: { $in: Array.from(allUserIds) } }] : []),
          ...(allEmails.size > 0 ? [{ email: { $in: Array.from(allEmails) } }] : []),
        ],
      }).select('_id email paymentQrCode upiId').lean();

      const userMap = new Map<string, any>();
      for (const u of users) {
        userMap.set(u._id.toString(), u);
        if (u.email) userMap.set(u.email.toLowerCase(), u);
      }

      for (const s of sessions) {
        if (s.members) {
          s.members = s.members.map((m: any) => {
            const matchedUser = (m.userId && userMap.get(m.userId)) || (m.email && userMap.get(m.email?.toLowerCase()));
            if (matchedUser) {
              return {
                ...m,
                paymentQrCode: matchedUser.paymentQrCode || m.paymentQrCode || '',
                upiId: matchedUser.upiId || m.upiId || '',
              };
            }
            return m;
          });
        }
      }
    }

    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error('Error fetching splitter sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch splitter sessions', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongoDB();
    const auth = getUserIdFromRequest(req);
    const body = await req.json();

    const userId = body.userId || auth?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const {
      name,
      description,
      template = 'group',
      startDate,
      endDate,
      currency = 'INR',
      budgetCap,
      members = [],
    } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // Generate collision-free session ID
    let sessionId = generateSessionId();
    let exists = await SplitSessionModel.findOne({ sessionId });
    while (exists) {
      sessionId = generateSessionId();
      exists = await SplitSessionModel.findOne({ sessionId });
    }

    const now = new Date().toISOString();
    const creatorName = body.creatorName || auth?.name || 'Creator';

    // Ensure creator is in the member list if not already present
    const sanitizedMembers: SplitMember[] = [...members];
    const hasCreator = sanitizedMembers.some((m) => m.userId === userId || m.id === 'creator');
    if (!hasCreator && sanitizedMembers.length === 0) {
      sanitizedMembers.push({
        id: 'member_creator',
        name: creatorName,
        handle: `@${creatorName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'admin'}`,
        color: '#6366F1',
        isDependent: false,
        userId,
      });
    }

    const initialAuditLog: SplitAuditLog = {
      id: `log_${Date.now()}_init`,
      sessionId,
      timestamp: now,
      memberName: creatorName,
      action: `Created new session "${name}" (${template.toUpperCase()} template)`,
    };

    const newSession = await SplitSessionModel.create({
      sessionId,
      userId,
      name,
      description,
      template,
      startDate,
      endDate,
      currency,
      budgetCap: budgetCap ? Number(budgetCap) : undefined,
      status: 'active',
      members: sanitizedMembers,
      expenses: [],
      settlements: [],
      auditLogs: [initialAuditLog],
    });

    // Notify connected members of the newly created split session in the background
    try {
      const otherMembers = sanitizedMembers.filter(
        (m) => m.userId !== userId && (m.email || m.userId)
      );
      const recipientEmails = otherMembers
        .map((m) => m.email)
        .filter(Boolean) as string[];
      const recipientUserIds = otherMembers
        .map((m) => m.userId)
        .filter(Boolean) as string[];

      if (recipientEmails.length > 0 || recipientUserIds.length > 0) {
        sendWebPushToUsers({
          emails: recipientEmails,
          userIds: recipientUserIds,
          payload: {
            title: `👥 Added to Split Group: ${name}`,
            body: `${creatorName} created "${name}" (ID: ${sessionId}). Tap to view expenses and track balances!`,
            tag: `split-created-${sessionId}`,
            data: { url: `/budgets/splitter/${sessionId}` },
          },
        }).catch((err) => console.warn('[WebPush] Session creation push error:', err));
      }
    } catch (pushErr) {
      console.warn('[WebPush] Error preparing session creation notification:', pushErr);
    }

    return NextResponse.json({ session: newSession }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating split session:', error);
    return NextResponse.json(
      { error: 'Failed to create session', details: error.message },
      { status: 500 }
    );
  }
}
