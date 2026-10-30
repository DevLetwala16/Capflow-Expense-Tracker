import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, seedInitialAdminDataIfEmpty } from "@/lib/auth/adminAuth";
import { connectMongoDB } from "@/lib/mongodb/connection";
import SupportTicket from "@/lib/mongodb/supportTicketModel";
import User from "@/lib/mongodb/userModel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const category = searchParams.get("category") || "all";
    const priority = searchParams.get("priority") || "all";
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") || "10")));

    await connectMongoDB();
    await seedInitialAdminDataIfEmpty();

    const query: any = {};

    if (status !== "all") {
      query.status = status;
    }

    if (category !== "all") {
      query.category = category;
    }

    if (priority !== "all") {
      query.priority = priority;
    }

    if (search) {
      query.$or = [
        { ticketId: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
        { userPhone: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const total = await SupportTicket.countDocuments(query);
    const tickets = await SupportTicket.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Enrich with user phone number from User collection if missing
    const enrichedTickets = await Promise.all(
      tickets.map(async (t) => {
        let phone = t.userPhone;
        if (!phone && t.userEmail) {
          const user = await User.findOne({ email: t.userEmail.toLowerCase() }).select("phone").lean();
          phone = user?.phone || "";
        }
        return {
          id: t._id.toString(),
          ticketId: t.ticketId,
          userEmail: t.userEmail,
          userName: t.userName,
          userPhone: phone || "",
          subject: t.subject,
          category: t.category,
          priority: t.priority,
          status: t.status,
          messageCount: t.messages?.length || 0,
          latestMessage: t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1] : null,
          lastRepliedBy: t.lastRepliedBy || "user",
          resolvedAt: t.resolvedAt,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      tickets: enrichedTickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error("Support tickets fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userEmail, userName, userPhone, subject, category, priority, message } = await req.json();

    if (!userEmail || !subject || !message) {
      return NextResponse.json(
        { error: "User email, subject, and message are required" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Auto generate ticketId
    const count = await SupportTicket.countDocuments();
    const ticketId = `TCK-${1000 + count + 1}`;

    const newTicket = await SupportTicket.create({
      ticketId,
      userEmail: userEmail.trim().toLowerCase(),
      userName: userName?.trim() || userEmail.split("@")[0],
      userPhone: userPhone?.trim() || "",
      subject: subject.trim(),
      category: category || "General",
      priority: priority || "medium",
      status: "open",
      lastRepliedBy: "user",
      messages: [
        {
          sender: "user",
          senderEmail: userEmail.trim().toLowerCase(),
          senderName: userName?.trim() || userEmail.split("@")[0],
          message: message.trim(),
          createdAt: new Date(),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      ticket: newTicket,
    });
  } catch (error: any) {
    console.error("Support ticket creation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create support ticket" },
      { status: 500 }
    );
  }
}
