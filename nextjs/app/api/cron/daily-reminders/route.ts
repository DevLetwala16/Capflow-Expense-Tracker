import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb/connection";
import { sendWebPushToUsers } from "@/lib/notifications/webPushServer";

export const dynamic = "force-dynamic";

const DAILY_PROMPTS = [
  {
    title: "🔥 CapFlow: Keep Your Streak Alive!",
    body: "Did you log today's expenses? Tap to track your spending in 5 seconds before your day ends!",
  },
  {
    title: "🍽️ Had Lunch or Dinner Today?",
    body: "Don't forget to track your food and shopping bills to keep your budget on target!",
  },
  {
    title: "⚡ 5-Second Money Check-in",
    body: "A minute a day keeps debt away. Record today's transactions in CapFlow now!",
  },
  {
    title: "🎯 Protect Your Monthly Savings",
    body: "Stay in full control of your cashflow. Log any cash or UPI payments made today!",
  },
];

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleDailyReminder(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleDailyReminder(req);
}

async function handleDailyReminder(req: NextRequest): Promise<NextResponse> {
  try {
    await connectMongoDB();

    const now = new Date();
    const prompt = DAILY_PROMPTS[now.getDate() % DAILY_PROMPTS.length];

    // Broadcast push notification to all subscribed users in background
    const result = await sendWebPushToUsers({
      broadcast: true,
      payload: {
        title: prompt.title,
        body: prompt.body,
        tag: `daily-streak-${now.toISOString().slice(0, 10)}`,
        data: { url: "/transactions" },
      },
    });

    return NextResponse.json({
      success: true,
      prompt: prompt.title,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    console.error("[cron/daily-reminders] Error dispatching daily reminder push:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
