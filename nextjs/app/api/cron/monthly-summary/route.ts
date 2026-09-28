import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import EmiReminder from "@/lib/mongodb/emiReminderModel";
import { sendMonthlySummaryEmail } from "@/lib/email/mailer";

// ─── GET /api/cron/monthly-summary ───────────────────────────────────────────
// Callable by Vercel Cron (00:05 UTC on the 1st of each month) or manual GET.
// Sends each eligible user a summary of all their EMIs for the current month.
export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── 1. Verify CRON_SECRET ─────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 2. Connect to MongoDB ───────────────────────────────────────────────
    await connectMongoDB();

    // The cron fires on the 1st — build a label for the current month
    const now = new Date();
    const monthLabel = now.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    }); // e.g. "October 2026"

    // Fetch users who have opted into EMI reminders and have emiEmailSync on
    const users = await User.find({
      "preferences.emailNotifications.emiReminders": true,
      "preferences.emailNotifications.emiEmailSync": true,
    }).lean();

    let sent = 0;

    // ── 3 & 4. Build per-user EMI list and send summary email ───────────────
    for (const user of users) {
      const emis = await EmiReminder.find({
        userId: String(user._id),
      })
        .sort({ dueDay: 1 })
        .lean();

      if (emis.length === 0) continue;

      // Shape data for the email template
      const emiList = emis.map((e) => ({
        name: e.name,
        monthlyCost: e.monthlyCost,
        dueDay: e.dueDay,
      }));

      try {
        await sendMonthlySummaryEmail(user.email, user.name, monthLabel, emiList);
        sent++;
        console.info(
          `[cron/monthly-summary] Summary sent to ${user.email} (${emis.length} EMIs)`,
        );
      } catch (emailErr: unknown) {
        const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
        console.error(
          `[cron/monthly-summary] Failed to send to ${user.email}: ${msg}`,
        );
      }
    }

    return NextResponse.json({ sent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/monthly-summary] Fatal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
