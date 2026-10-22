import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import EmiReminder from "@/lib/mongodb/emiReminderModel";

export const dynamic = "force-dynamic";

interface JwtPayload {
  userId: string;
  email: string;
}

function getAuthUser(req: NextRequest): JwtPayload | null {
  const token = req.cookies.get("capflow_token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    return null;
  }
}

// ─── POST /api/emis/sync ─────────────────────────────────────────────────────
// Syncs client-side Dexie EMIs to MongoDB EmiReminder collection
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = getAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const targetEmail = (auth?.email || body.email)?.toLowerCase();

    if (!targetEmail) {
      return NextResponse.json({ error: "Unauthorized: Missing user email" }, { status: 401 });
    }

    await connectMongoDB();
    const user = await User.findOne({ email: targetEmail });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userIdStr = user._id.toString();
    const incomingEmis: Array<{
      id: number;
      name: string;
      monthlyCost: number;
      dueDay: number;
      reminderLeadDays?: number;
    }> = Array.isArray(body.emis) ? body.emis : [];

    // Wipe previous server records for this user to keep exact parity with Dexie
    await EmiReminder.deleteMany({ userId: userIdStr });

    // Insert active client EMIs
    if (incomingEmis.length > 0) {
      const docs = incomingEmis.map((e) => ({
        userId: userIdStr,
        clientEmiId: e.id,
        name: e.name,
        monthlyCost: Number(e.monthlyCost) || 0,
        dueDay: Math.max(1, Math.min(31, Number(e.dueDay) || 1)),
        reminderLeadDays: Number(e.reminderLeadDays) || 3,
        updatedAt: new Date(),
      }));

      await EmiReminder.insertMany(docs);
    }

    // Auto-enable EMI sync preferences in User document if not enabled
    if (body.enableSync !== false) {
      user.preferences.emailNotifications.emiEmailSync = true;
      user.preferences.emailNotifications.emiReminders = true;
      await user.save();
    }

    return NextResponse.json({
      success: true,
      syncedCount: incomingEmis.length,
      userId: userIdStr,
      preferences: user.preferences?.emailNotifications,
    });
  } catch (error: any) {
    console.error("[api/emis/sync POST]", error);
    return NextResponse.json({ error: error?.message || "Failed to sync EMIs" }, { status: 500 });
  }
}
