import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import { sendEMIReminder } from "@/lib/email/mailer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SendReminderBody {
  emiName: string;
  monthlyCost: number;
  dueDay: number; // 1–31
  fallbackEmail?: string;
  fallbackName?: string;
}

// ─── Ordinal helper ───────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Build a human-readable due date string ───────────────────────────────────

function buildDueDateString(dueDay: number): string {
  const now = new Date();
  const month = now.toLocaleString("default", { month: "long" });
  const year = now.getFullYear();
  return `${ordinal(dueDay)} ${month} ${year}`;
}

// ─── POST /api/emis/send-reminder ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── 1. Authenticate via JWT cookie with fallback ─────────────────────────
    const token = req.cookies.get("capflow_token")?.value;
    let recipientEmail = "";
    let recipientName = "there";

    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
          userId: string;
          email: string;
        };
        await connectMongoDB();
        const user = await User.findById(payload.userId).lean();
        if (user) {
          recipientEmail = (user as any).email;
          recipientName = (user as any).name ?? "there";
        }
      } catch {
        // Token invalid, will check fallback
      }
    }

    // ── 2. Parse + validate request body ────────────────────────────────────
    let body: SendReminderBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { emiName, monthlyCost, dueDay } = body;

    if (!emiName || typeof emiName !== "string" || emiName.trim().length === 0) {
      return NextResponse.json({ error: "emiName is required" }, { status: 400 });
    }
    if (typeof monthlyCost !== "number" || monthlyCost <= 0) {
      return NextResponse.json(
        { error: "monthlyCost must be a positive number" },
        { status: 400 }
      );
    }
    if (typeof dueDay !== "number" || dueDay < 1 || dueDay > 31) {
      return NextResponse.json(
        { error: "dueDay must be between 1 and 31" },
        { status: 400 }
      );
    }

    // ── 3. Resolve recipient with fallback ──────────────────────────────────
    if (!recipientEmail && body.fallbackEmail) {
      recipientEmail = body.fallbackEmail;
      recipientName = body.fallbackName ?? "there";
    }

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in or provide email." },
        { status: 401 }
      );
    }

    // ── 4. Send the reminder email immediately ───────────────────────────────
    const dueDateStr = buildDueDateString(dueDay);

    await sendEMIReminder(
      recipientEmail,
      recipientName,
      emiName.trim(),
      monthlyCost,
      dueDateStr
    );

    return NextResponse.json({
      ok: true,
      message: `Reminder sent to ${recipientEmail}`,
      emi: emiName.trim(),
      dueDate: dueDateStr,
    });
  } catch (err: any) {
    console.error("[EMI send-reminder] Error:", err?.message ?? err);
    return NextResponse.json(
      { error: "Failed to send reminder email. Check SMTP config." },
      { status: 500 }
    );
  }
}
