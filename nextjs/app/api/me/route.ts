import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";

export const dynamic = "force-dynamic";

interface DecodedToken {
  userId: string;
  email: string;
}

function getDecodedUser(req: NextRequest): DecodedToken | null {
  try {
    const token = req.cookies.get("capflow_token")?.value;
    if (token && process.env.JWT_SECRET) {
      return jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    }
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ") && process.env.JWT_SECRET) {
      return jwt.verify(authHeader.substring(7), process.env.JWT_SECRET) as DecodedToken;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const decoded = getDecodedUser(req);
    if (!decoded) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectMongoDB();
    const user = await User.findById(decoded.userId).select("-otpHash -otpExpiry");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        phone: user.phone || "",
        avatar: user.avatar,
        paymentQrCode: user.paymentQrCode || "",
        upiId: user.upiId || "",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const decoded = getDecodedUser(req);
    if (!decoded) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    await connectMongoDB();

    const updates: Record<string, any> = {};
    if (typeof body.name === "string") {
      updates.name = body.name.trim();
    }
    if (typeof body.phone === "string") {
      updates.phone = body.phone.trim();
    }
    if (typeof body.avatar === "string") {
      updates.avatar = body.avatar.trim();
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { $set: updates },
      { new: true }
    ).select("-otpHash -otpExpiry");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        phone: user.phone || "",
        avatar: user.avatar,
        paymentQrCode: user.paymentQrCode || "",
        upiId: user.upiId || "",
      },
    });
  } catch (error: any) {
    console.error("Error updating user profile in /api/me:", error);
    return NextResponse.json(
      { error: "Failed to update profile", details: error?.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return PATCH(req);
}
