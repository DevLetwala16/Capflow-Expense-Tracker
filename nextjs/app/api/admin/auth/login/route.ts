import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import {
  ADMIN_EMAIL,
  ADMIN_MASTER_OTP,
  ADMIN_COOKIE_NAME,
  checkAdminRateLimit,
  recordFailedAdminAttempt,
  resetAdminRateLimit,
  logAdminAction,
} from "@/lib/auth/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // Rate Limiting Check
    const rateCheck = checkAdminRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed admin login attempts. Account temporarily locked. Try again in ${rateCheck.retryAfterSeconds} seconds.`,
          retryAfter: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Admin email and Master OTP are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOtp = otp.toString().trim();

    // Verify Admin Credentials
    if (normalizedEmail !== ADMIN_EMAIL || normalizedOtp !== ADMIN_MASTER_OTP) {
      const failStatus = recordFailedAdminAttempt(ip);
      const remainingMsg = failStatus.locked
        ? `Account locked for 15 minutes.`
        : `${failStatus.remainingAttempts} attempt(s) remaining before temporary lockout.`;

      return NextResponse.json(
        { error: `Invalid admin credentials or Master OTP. ${remainingMsg}` },
        { status: 401 }
      );
    }

    // Successful Admin Login
    resetAdminRateLimit(ip);
    await connectMongoDB();

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = await User.create({
        email: normalizedEmail,
        name: "CapFlow Master Admin",
        role: "admin",
        preferences: {
          emailNotifications: {
            emiReminders: false,
            monthlyStatement: false,
            emiEmailSync: false,
          },
        },
      });
    } else if (user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    // Clear any OTP fields
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Issue JWT containing { role: 'admin', email: 'capflow@softcapphyjas.com' }
    const secret = process.env.JWT_SECRET || "capflow-fallback-admin-secret-2026";
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: "admin",
      },
      secret,
      { expiresIn: (process.env.JWT_EXPIRY || "90d") as `${number}d` }
    );

    // Audit Log
    await logAdminAction({
      action: "ADMIN_LOGIN",
      adminEmail: normalizedEmail,
      targetType: "Auth",
      targetId: user._id.toString(),
      details: {
        method: "Master OTP Bypass (100283)",
        userAgent: req.headers.get("user-agent") || "",
      },
      req,
    });

    const response = NextResponse.json({
      success: true,
      role: "admin",
      redirectUrl: "/admin/dashboard",
      admin: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: "admin",
      },
    });

    // Secure HTTP-Only Cookie
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 90 * 24 * 60 * 60,
      path: "/",
    });

    response.cookies.set("capflow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 90 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during admin authentication" },
      { status: 500 }
    );
  }
}
