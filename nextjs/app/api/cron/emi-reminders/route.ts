import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import EmiReminder from "@/lib/mongodb/emiReminderModel";
import { sendEMIReminder } from "@/lib/email/mailer";

// ─── GET /api/cron/emi-reminders ──────────────────────────────────────────────
// Callable by Vercel Cron (daily at 08:00 UTC) or a manual HTTP GET.
// Sends EMI due-date reminder emails to users who have opted in.
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

    // Fetch all users who have opted into EMI reminder emails
    const users = await User.find({
      "preferences.emailNotifications.emiReminders": true,
    }).lean();

    const today = new Date();
    let processedUsers = 0;
    let remindersSent = 0;

    // ── 3 & 4. For each eligible user, check EMIs and send reminders ────────
    for (const user of users) {
      // Skip if emiEmailSync is disabled — Mode A only
      if (!user.preferences?.emailNotifications?.emiEmailSync) {
        continue;
      }

      processedUsers++;

      // Fetch server-mirrored EMIs for this user
      const emis = await EmiReminder.find({
        userId: String(user._id),
      }).lean();

      for (const emi of emis) {
        const reminderLeadDays = emi.reminderLeadDays ?? 3;
        // Calculate the target day: the day on which we want to remind
        const targetDay = emi.dueDay - reminderLeadDays;

        // Build the expected trigger date (handles month-boundary wrapping simply)
        // We fire when today's date (in the month) equals dueDay - reminderLeadDays
        const todayDate = today.getDate();

        // Also fire on the actual due day itself as a final reminder
        const isDueDay = todayDate === emi.dueDay;
        const isLeadDay = todayDate === targetDay;

        if (!isDueDay && !isLeadDay) continue;

        // Build a human-readable due date string, e.g. "15 Oct 2026"
        const dueDate = buildDueDateString(emi.dueDay, today);

        try {
          await sendEMIReminder(
            user.email,
            user.name,
            emi.name,
            emi.monthlyCost,
            dueDate,
          );
          remindersSent++;
          console.info(
            `[cron/emi-reminders] Sent reminder for "${emi.name}" → ${user.email}`,
          );
        } catch (emailErr: unknown) {
          const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
          console.error(
            `[cron/emi-reminders] Failed to send to ${user.email}: ${msg}`,
          );
        }
      }
    }

    return NextResponse.json({ processed: processedUsers, reminders: remindersSent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/emi-reminders] Fatal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Given a due day-of-month and a reference Date, produce a string like
 * "15 Oct 2026". If the due day has already passed this month, it refers
 * to next month's due date.
 */
function buildDueDateString(dueDay: number, ref: Date): string {
  const year = ref.getFullYear();
  const month = ref.getMonth(); // 0-indexed

  // If we're past the due day in the current month, show next month's date
  const targetMonth = ref.getDate() <= dueDay ? month : month + 1;
  const targetDate = new Date(year, targetMonth, dueDay);

  return targetDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
