import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/auth/adminAuth";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import SplitSession from "@/lib/mongodb/splitSessionModel";
import EmiReminder from "@/lib/mongodb/emiReminderModel";
import Transfer from "@/lib/mongodb/transferModel";

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

    const user = await User.findById(id).select("-otpHash -otpExpiry").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const splitSessions = await SplitSession.find({
      $or: [
        { userId: id },
        { "members.userId": id },
        { "members.email": user.email },
      ],
    })
      .select("sessionId name currency status members expenses createdAt")
      .lean();

    const emiReminders = await EmiReminder.find({ userId: id }).lean();
    const transfers = await Transfer.find({ userId: id }).select("-encryptedPayload").lean();

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        id: user._id.toString(),
      },
      metadata: {
        splitSessionsCount: splitSessions.length,
        splitSessions: splitSessions.map((s) => ({
          sessionId: s.sessionId,
          name: s.name,
          status: s.status,
          currency: s.currency,
          memberCount: s.members?.length || 0,
          expenseCount: s.expenses?.length || 0,
        })),
        emiRemindersCount: emiReminders.length,
        transfersCount: transfers.length,
      },
    });
  } catch (error: any) {
    console.error("Admin user detail error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch user metadata" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Safety guard: prevent deleting master admin capflow@softcapphyjas.com
    if (user.email.toLowerCase() === "capflow@softcapphyjas.com") {
      return NextResponse.json(
        { error: "Cannot delete master administrator account." },
        { status: 403 }
      );
    }

    const deletedEmail = user.email;
    const deletedName = user.name;

    await User.findByIdAndDelete(id);

    // Audit Log deletion
    await logAdminAction({
      action: "USER_DELETED",
      adminEmail: auth.admin.email,
      targetType: "User",
      targetId: id,
      details: {
        deletedUserEmail: deletedEmail,
        deletedUserName: deletedName,
        timestamp: new Date().toISOString(),
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `User ${deletedEmail} (${deletedName}) was permanently deleted.`,
    });
  } catch (error: any) {
    console.error("Admin user delete error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
