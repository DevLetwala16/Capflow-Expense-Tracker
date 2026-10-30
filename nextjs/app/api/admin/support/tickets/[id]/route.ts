import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/auth/adminAuth";
import { connectMongoDB } from "@/lib/mongodb/connection";
import SupportTicket from "@/lib/mongodb/supportTicketModel";
import User from "@/lib/mongodb/userModel";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAdmin(req);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  try {
    const { id } = params;
    await connectMongoDB();

    const ticket = await SupportTicket.findById(id).lean();
    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    // Lookup user details
    const user = await User.findOne({ email: ticket.userEmail.toLowerCase() })
      .select("name email phone avatar createdAt")
      .lean();

    return NextResponse.json({
      success: true,
      ticket: {
        ...ticket,
        id: ticket._id.toString(),
        userPhone: ticket.userPhone || user?.phone || "",
        userRegisteredAt: user?.createdAt || null,
        userAvatar: user?.avatar || null,
      },
    });
  } catch (error: any) {
    console.error("Single ticket fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAdmin(req);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  try {
    const { id } = params;
    const body = await req.json();
    const { status, priority } = body;

    await connectMongoDB();

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const oldStatus = ticket.status;
    const updates: any = {};

    if (status && ["open", "in_progress", "resolved"].includes(status)) {
      updates.status = status;
      if (status === "resolved") {
        updates.resolvedAt = new Date();
      } else {
        updates.resolvedAt = null;
      }
    }

    if (priority && ["low", "medium", "high", "urgent"].includes(priority)) {
      updates.priority = priority;
    }

    const updated = await SupportTicket.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: 'after' }
    );

    // Audit log
    await logAdminAction({
      action: "TICKET_STATUS_UPDATED",
      adminEmail: auth.admin.email,
      targetType: "Ticket",
      targetId: ticket.ticketId,
      details: {
        ticketId: ticket.ticketId,
        previousStatus: oldStatus,
        newStatus: status || oldStatus,
        priority: priority || ticket.priority,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      ticket: updated,
    });
  } catch (error: any) {
    console.error("Ticket update error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update ticket" },
      { status: 500 }
    );
  }
}
