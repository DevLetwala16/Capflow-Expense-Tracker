import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import EmiReminder from "@/lib/mongodb/emiReminderModel";
import { sendEMIReminder } from "@/lib/email/mailer";

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

function buildDueDateString(dueDay: number, refDate: Date = new Date()): string {
  const currentDay = refDate.getDate();
  const year = refDate.getFullYear();
  const month = refDate.getMonth();

  const targetDate =
    currentDay <= dueDay
      ? new Date(year, month, dueDay)
      : new Date(year, month + 1, dueDay);

  return targetDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── POST /api/notifications/check-emi-due ──────────────────────────────────
// Automatically checks for due EMIs and sends email alerts
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

    const today = new Date();
    const todayDate = today.getDate();
    const sentList: Array<{ name: string; amount: number; dueDate: string }> = [];

    // Source of EMIs: either passed in body or loaded from MongoDB EmiReminder
    let emisToCheck: Array<{
      name: string;
      monthlyCost: number;
      dueDay: number;
      reminderLeadDays?: number;
    }> = [];

    if (Array.isArray(body.emis) && body.emis.length > 0) {
      emisToCheck = body.emis;
    } else {
      const serverEmis = await EmiReminder.find({ userId: user._id.toString() }).lean();
      emisToCheck = serverEmis.map((e) => ({
        name: e.name,
        monthlyCost: e.monthlyCost,
        dueDay: e.dueDay,
        reminderLeadDays: e.reminderLeadDays,
      }));
    }

    for (const emi of emisToCheck) {
      const leadDays = emi.reminderLeadDays ?? 3;
      const targetDay = emi.dueDay - leadDays;

      const isDueDay = todayDate === emi.dueDay;
      const isLeadDay = todayDate === targetDay;

      // Also trigger if forced via test flag
      if (!isDueDay && !isLeadDay && !body.forceSend) {
        continue;
      }

      const dueDateStr = buildDueDateString(emi.dueDay, today);

      try {
        await sendEMIReminder(
          user.email,
          user.name || "CapFlow User",
          emi.name,
          emi.monthlyCost,
          dueDateStr
        );

        sentList.push({
          name: emi.name,
          amount: emi.monthlyCost,
          dueDate: dueDateStr,
        });
      } catch (sendErr: any) {
        console.error(`[check-emi-due] Failed to send EMI reminder for "${emi.name}":`, sendErr);
      }
    }

    return NextResponse.json({
      success: true,
      processed: emisToCheck.length,
      sentCount: sentList.length,
      sentReminders: sentList,
    });
  } catch (error: any) {
    console.error("[api/notifications/check-emi-due]", error);
    return NextResponse.json({ error: error?.message || "Failed checking EMI dues" }, { status: 500 });
  }
}
