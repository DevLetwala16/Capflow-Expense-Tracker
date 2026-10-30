import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() || "";

    await connectMongoDB();

    const filter: any = {};
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("name email phone avatar")
      .limit(25)
      .lean();

    return NextResponse.json({
      success: true,
      recipients: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        avatar: u.avatar || null,
      })),
    });
  } catch (error: any) {
    console.error("Recipient lookup error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to lookup recipients" },
      { status: 500 }
    );
  }
}
