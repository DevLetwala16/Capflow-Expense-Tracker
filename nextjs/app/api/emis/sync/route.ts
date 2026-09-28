import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import EmiReminder from "@/lib/mongodb/emiReminderModel";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SyncRequestBody {
  emiId: number;
  name: string;
  monthlyCost: number;
  dueDay: number;
  reminderLeadDays: number;
  action: "upsert" | "delete";
}

interface JWTPayload {
  userId: string;
  email?: string;
  [key: string]: unknown;
}

// ─── JWT helper ───────────────────────────────────────────────────────────────
function extractUserId(req: NextRequest): string | null {
  const cookieToken =
    req.cookies.get("capflow_token")?.value || req.cookies.get("token")?.value;
  if (!cookieToken) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(cookieToken, secret) as JWTPayload;
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

// ─── POST /api/emis/sync ──────────────────────────────────────────────────────
// Called by the client when the user enables/disables emailSyncEnabled on an EMI.
// Stores only the scheduling metadata needed for cron-driven reminder emails.
// NO transaction data is stored.
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Authenticate via JWT cookie ────────────────────────────────────────
  const userId = extractUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse and validate request body ───────────────────────────────────
  let body: SyncRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { emiId, name, monthlyCost, dueDay, reminderLeadDays, action } = body;

  if (typeof emiId !== "number") {
    return NextResponse.json({ error: "emiId must be a number" }, { status: 400 });
  }
  if (!["upsert", "delete"].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'upsert' or 'delete'" },
      { status: 400 },
    );
  }
  if (action === "upsert") {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (typeof monthlyCost !== "number" || monthlyCost < 0) {
      return NextResponse.json({ error: "monthlyCost must be a non-negative number" }, { status: 400 });
    }
    if (typeof dueDay !== "number" || dueDay < 1 || dueDay > 31) {
      return NextResponse.json({ error: "dueDay must be between 1 and 31" }, { status: 400 });
    }
  }

  // ── 3. Connect to MongoDB ─────────────────────────────────────────────────
  await connectMongoDB();

  // ── 4. Upsert or delete the EMI reminder record ───────────────────────────
  if (action === "delete") {
    await EmiReminder.deleteOne({ userId, clientEmiId: emiId });
    return NextResponse.json({ ok: true });
  }

  // action === "upsert"
  await EmiReminder.findOneAndUpdate(
    { userId, clientEmiId: emiId },
    {
      $set: {
        userId,
        clientEmiId: emiId,
        name: name.trim(),
        monthlyCost,
        dueDay,
        reminderLeadDays: typeof reminderLeadDays === "number" ? reminderLeadDays : 3,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  return NextResponse.json({ ok: true });
}
