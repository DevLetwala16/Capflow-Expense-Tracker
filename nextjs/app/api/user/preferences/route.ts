import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";

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

// ─── GET /api/user/preferences ───────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = getAuthUser(req);
    const searchEmail = req.nextUrl.searchParams.get("email")?.toLowerCase();

    const email = auth?.email || searchEmail;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized or missing email" }, { status: 401 });
    }

    await connectMongoDB();
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences: user.preferences?.emailNotifications || {
        emiReminders: false,
        monthlyStatement: false,
        emiEmailSync: false,
      },
    });
  } catch (error: any) {
    console.error("[api/user/preferences GET]", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch preferences" }, { status: 500 });
  }
}

// ─── PUT /api/user/preferences ───────────────────────────────────────────────
export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = getAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const targetEmail = (auth?.email || body.email)?.toLowerCase();

    if (!targetEmail) {
      return NextResponse.json({ error: "Unauthorized or missing email" }, { status: 401 });
    }

    await connectMongoDB();

    const updates: Record<string, boolean> = {};
    if (typeof body.emiReminders === "boolean") {
      updates["preferences.emailNotifications.emiReminders"] = body.emiReminders;
    }
    if (typeof body.monthlyStatement === "boolean") {
      updates["preferences.emailNotifications.monthlyStatement"] = body.monthlyStatement;
    }
    if (typeof body.emiEmailSync === "boolean") {
      updates["preferences.emailNotifications.emiEmailSync"] = body.emiEmailSync;
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: targetEmail },
      { $set: updates },
      { new: true, upsert: false }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences: updatedUser.preferences?.emailNotifications,
    });
  } catch (error: any) {
    console.error("[api/user/preferences PUT]", error);
    return NextResponse.json({ error: error?.message || "Failed to update preferences" }, { status: 500 });
  }
}
