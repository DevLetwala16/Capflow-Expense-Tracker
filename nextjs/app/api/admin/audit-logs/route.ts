import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, seedInitialAdminDataIfEmpty } from "@/lib/auth/adminAuth";
import { connectMongoDB } from "@/lib/mongodb/connection";
import AdminAuditLog from "@/lib/mongodb/adminAuditLogModel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "all";
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "15")));

    await connectMongoDB();
    await seedInitialAdminDataIfEmpty();

    const query: any = {};

    if (action !== "all") {
      query.action = action;
    }

    if (search) {
      query.$or = [
        { adminEmail: { $regex: search, $options: "i" } },
        { targetId: { $regex: search, $options: "i" } },
        { ipAddress: { $regex: search, $options: "i" } },
      ];
    }

    const total = await AdminAuditLog.countDocuments(query);
    const logs = await AdminAuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      logs: logs.map((l) => ({
        id: l._id.toString(),
        action: l.action,
        adminEmail: l.adminEmail,
        targetType: l.targetType,
        targetId: l.targetId || "",
        details: l.details || {},
        ipAddress: l.ipAddress || "127.0.0.1",
        userAgent: l.userAgent || "",
        createdAt: l.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error("Audit logs fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
