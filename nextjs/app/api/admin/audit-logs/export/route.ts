import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { connectMongoDB } from "@/lib/mongodb/connection";
import AdminAuditLog from "@/lib/mongodb/adminAuditLogModel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  try {
    await connectMongoDB();

    const logs = await AdminAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    // Generate CSV format
    const headers = ["Timestamp", "Admin Email", "Action", "Target Type", "Target ID", "IP Address", "Details"];
    const rows = logs.map((l) => [
      new Date(l.createdAt).toISOString(),
      `"${l.adminEmail}"`,
      `"${l.action}"`,
      `"${l.targetType}"`,
      `"${l.targetId || ""}"`,
      `"${l.ipAddress || ""}"`,
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="capflow-admin-audit-logs-${Date.now()}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Audit export error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to export audit logs" },
      { status: 500 }
    );
  }
}
