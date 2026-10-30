import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import SplitSession from "@/lib/mongodb/splitSessionModel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const role = searchParams.get("role") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") || "10")));

    await connectMongoDB();

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (role !== "all") {
      query.role = role;
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-otpHash -otpExpiry")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Enrich users with split session counts
    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const splitCount = await SplitSession.countDocuments({
          $or: [
            { userId: u._id.toString() },
            { "members.userId": u._id.toString() },
            { "members.email": u.email },
          ],
        }).catch(() => 0);

        return {
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          phone: u.phone || "",
          role: u.role || "user",
          avatar: u.avatar || null,
          upiId: u.upiId || "",
          hasPaymentQr: Boolean(u.paymentQrCode),
          splitCount,
          preferences: u.preferences,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error("Admin users list error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch user directory" },
      { status: 500 }
    );
  }
}
