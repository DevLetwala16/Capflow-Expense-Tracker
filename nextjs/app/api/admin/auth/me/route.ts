import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth/adminAuth";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ authenticated: false, error: "Not authenticated as admin" }, { status: 401 });
  }

  try {
    await connectMongoDB();
    const user = await User.findOne({ email: admin.email });

    return NextResponse.json({
      authenticated: true,
      admin: {
        email: admin.email,
        role: admin.role,
        name: user?.name || "CapFlow Master Admin",
        userId: user?._id?.toString() || admin.userId,
      },
    });
  } catch {
    return NextResponse.json({
      authenticated: true,
      admin: {
        email: admin.email,
        role: admin.role,
        name: "CapFlow Master Admin",
        userId: admin.userId,
      },
    });
  }
}
