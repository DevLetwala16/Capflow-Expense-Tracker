import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, seedInitialAdminDataIfEmpty } from "@/lib/auth/adminAuth";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import SplitSession from "@/lib/mongodb/splitSessionModel";
import SupportTicket from "@/lib/mongodb/supportTicketModel";
import AdminAuditLog from "@/lib/mongodb/adminAuditLogModel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  try {
    await connectMongoDB();
    await seedInitialAdminDataIfEmpty();

    // 1. User metrics
    const totalUsers = await User.countDocuments();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // 2. Financial Groups / Split sessions metrics
    const totalGroups = await SplitSession.countDocuments();
    const activeGroups = await SplitSession.countDocuments({ status: "active" });
    const settledGroups = await SplitSession.countDocuments({ status: "settled" });

    // 3. Transactions / Expenses aggregated across split sessions
    const splitStats = await SplitSession.aggregate([
      { $unwind: "$expenses" },
      {
        $group: {
          _id: null,
          totalExpenseCount: { $sum: 1 },
          totalExpenseVolume: { $sum: "$expenses.amount" },
        },
      },
    ]);

    const totalTransactions = splitStats[0]?.totalExpenseCount || 0;
    const totalTransactionVolume = splitStats[0]?.totalExpenseVolume || 0;

    // 4. Customer Support metrics
    const totalTickets = await SupportTicket.countDocuments();
    const openTickets = await SupportTicket.countDocuments({ status: "open" });
    const inProgressTickets = await SupportTicket.countDocuments({ status: "in_progress" });
    const resolvedTickets = await SupportTicket.countDocuments({ status: "resolved" });
    const urgentTickets = await SupportTicket.countDocuments({
      priority: "urgent",
      status: { $ne: "resolved" },
    });

    // 5. Recent Admin Audit Logs
    const recentAuditLogs = await AdminAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    // 6. System Health Checks
    const startTime = Date.now();
    let mongoLatency = 0;
    let mongoHealthy = true;
    try {
      const pingStart = Date.now();
      const mongoose = await connectMongoDB();
      if (mongoose.connection.db) {
        await mongoose.connection.db.command({ ping: 1 });
      }
      mongoLatency = Date.now() - pingStart;
    } catch {
      mongoHealthy = false;
    }

    // Render Analytics Microservice Check
    const renderUrl =
      process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_FASTAPI_URL ||
      "https://capflow-analytics.onrender.com";
    let renderHealthy = true;
    let renderLatency = 0;
    try {
      const rStart = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${renderUrl}/openapi.json`, {
        signal: controller.signal,
        cache: "no-store",
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.status < 500) {
        renderLatency = Date.now() - rStart;
      } else {
        renderHealthy = false;
      }
    } catch {
      renderHealthy = false;
    }

    // SMTP Mailer Check
    const smtpConfigured = Boolean(
      process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.SMTP_HOST
    );

    const memoryUsage = process.memoryUsage();

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          newLast30Days: newUsersLast30Days,
        },
        groups: {
          total: totalGroups,
          active: activeGroups,
          settled: settledGroups,
        },
        transactions: {
          count: totalTransactions,
          volume: totalTransactionVolume,
        },
        support: {
          total: totalTickets,
          open: openTickets,
          inProgress: inProgressTickets,
          resolved: resolvedTickets,
          urgent: urgentTickets,
        },
      },
      health: {
        overall: mongoHealthy ? (renderHealthy ? "operational" : "degraded") : "outage",
        mongo: {
          status: mongoHealthy ? "connected" : "disconnected",
          latencyMs: mongoLatency,
          database: process.env.MONGODB_DB_NAME || "Capflow",
        },
        renderApi: {
          url: renderUrl,
          status: renderHealthy ? "healthy" : "standby_or_unreachable",
          latencyMs: renderLatency,
        },
        smtp: {
          status: smtpConfigured ? "configured" : "incomplete",
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          user: process.env.SMTP_USER || "Not configured",
        },
        system: {
          nodeVersion: process.version,
          uptimeSeconds: Math.floor(process.uptime()),
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          environment: process.env.NODE_ENV || "development",
        },
      },
      recentLogs: recentAuditLogs,
    });
  } catch (error: any) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
