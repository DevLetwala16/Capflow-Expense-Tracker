import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import { sendEMIReminder, sendMonthlySummaryEmail } from "@/lib/email/mailer";

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

// ─── POST /api/notifications/test-email ──────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = getAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const targetEmail = (auth?.email || body.email)?.toLowerCase();

    if (!targetEmail) {
      return NextResponse.json({ error: "Missing recipient email" }, { status: 400 });
    }

    await connectMongoDB();
    const user = await User.findOne({ email: targetEmail });
    const recipientName = user?.name || body.name || "CapFlow User";

    const type = body.type || "emi"; // 'emi' | 'summary'

    if (type === "summary") {
      const monthLabel = new Date().toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
      const sampleEmis = [
        { name: "Home Loan EMI", monthlyCost: 28500, dueDay: 5 },
        { name: "Car Loan EMI", monthlyCost: 14200, dueDay: 15 },
      ];
      await sendMonthlySummaryEmail(targetEmail, recipientName, monthLabel, sampleEmis);
      return NextResponse.json({
        success: true,
        message: `Monthly EMI summary test email sent successfully to ${targetEmail}!`,
      });
    }

    // Default: test EMI reminder
    const dueDateStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    await sendEMIReminder(
      targetEmail,
      recipientName,
      body.emiName || "Sample Test EMI",
      body.amount || 12500,
      dueDateStr
    );

    return NextResponse.json({
      success: true,
      message: `Test EMI reminder email sent successfully to ${targetEmail}!`,
    });
  } catch (error: any) {
    console.error("[api/notifications/test-email]", error);
    return NextResponse.json({ error: error?.message || "Failed to send test email" }, { status: 500 });
  }
}
