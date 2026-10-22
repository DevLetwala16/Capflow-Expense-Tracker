import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import { sendMonthlyStatementNotification } from "@/lib/email/mailer";

export const dynamic = "force-dynamic";

// ─── GET /api/cron/monthly-statement ─────────────────────────────────────────
// Callable by Vercel Cron (00:10 UTC on the 1st of each month) or manual GET.
//
// CRITICAL consent rules (locked in spec):
//   • Only runs when FEATURE_MONTHLY_STATEMENT=true (feature flag)
//   • Only emails users where preferences.emailNotifications.monthlyStatement === true
//   • Email contains NO financial data — only a privacy-safe nudge to open the app
export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleMonthlyStatement(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleMonthlyStatement(req);
}

async function handleMonthlyStatement(req: NextRequest): Promise<NextResponse> {
  // ── 1. Check feature flag ─────────────────────────────────────────────────
  if (process.env.FEATURE_MONTHLY_STATEMENT !== "true") {
    return NextResponse.json({ skipped: "feature_flag_disabled" }, { status: 200 });
  }

  // ── 2. Verify Authorization (Bearer token, query secret, or authenticated cookie) ──
  const authHeader = req.headers.get("authorization");
  const urlSecret = req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  const token = req.cookies.get("capflow_token")?.value;

  const isCronAuthorized =
    Boolean(cronSecret) &&
    (authHeader === `Bearer ${cronSecret}` || urlSecret === cronSecret);

  let sessionEmail: string | null = null;
  if (!isCronAuthorized && token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { email: string };
      sessionEmail = decoded.email?.toLowerCase();
    } catch {}
  }

  if (!isCronAuthorized && !sessionEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 3. Connect to MongoDB & fetch eligible users ───────────────────────
    await connectMongoDB();

    const userFilter: Record<string, any> = {
      "preferences.emailNotifications.monthlyStatement": true,
    };
    if (sessionEmail) {
      userFilter.email = sessionEmail;
    }

    const users = await User.find(userFilter).lean();

    // Build the month label for the current (just-ended) month
    const now = new Date();
    // The cron fires on the 1st, so "last month" is what the statement covers.
    // Use current month name — the statement is for the month just completed.
    const statementMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthLabel = statementMonth.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    }); // e.g. "September 2026"

    let sent = 0;

    // ── 4. Send privacy-safe nudge email to each eligible user ─────────────
    for (const user of users) {
      try {
        await sendMonthlyStatementNotification(user.email, user.name, monthLabel);
        sent++;
        console.info(
          `[cron/monthly-statement] Notification sent to ${user.email}`,
        );
      } catch (emailErr: unknown) {
        const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
        console.error(
          `[cron/monthly-statement] Failed to send to ${user.email}: ${msg}`,
        );
      }
    }

    return NextResponse.json({ sent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/monthly-statement] Fatal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
